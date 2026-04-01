<?php

declare(strict_types=1);

namespace App\Service\BankExtractor;

use DateTimeImmutable;
use InvalidArgumentException;
use Psr\Log\LoggerInterface;
use RuntimeException;

use function assert;
use function count;
use function explode;
use function is_numeric;
use function ltrim;
use function mb_convert_encoding;
use function preg_replace;
use function sprintf;
use function str_getcsv;
use function str_replace;
use function stream_get_contents;
use function strtoupper;
use function trim;

/**
 * Extracts transfer data from a KBC bank CSV export.
 *
 * Expected file format:
 *   - Delimiter:     semicolon (;)
 *   - Encoding:      UTF-8 or Windows-1252 (auto-detected)
 *   - Date format:   d/m/Y
 *   - Amount format: Belgian decimal notation ("1.950,00" / "-22,50")
 *
 * The file may have header and data on the same line (KBC format) or on separate lines.
 * Header contains Dutch column names.
 */
final readonly class KbcExtractor implements BankExtractorInterface
{
    private const string DELIMITER = ';';

    private const string DATE_FORMAT = 'd/m/Y';

    // Column indices in every data row (0-based)
    private const int COL_OWN_ACCOUNT = 0;

              // Munt
    private const int COL_TRANSACTION = 4;

           // Afschriftnummer
    private const int COL_DATE = 5;

           // Valuta
    private const int COL_AMOUNT = 8;

              // Saldo
    private const int COL_CREDIT = 10;

               // credit
    private const int COL_DEBIT = 11;

               // debet
    private const int COL_COUNTER_ACCOUNT = 12;

          // BIC tegenpartij
    private const int COL_COUNTER_NAME = 14;

      // Adres tegenpartij
    private const int COL_STRUCTURED_COMM = 16;

       // gestructureerde mededeling
    private const int COL_FREE_COMM = 17;        // Vrije mededeling

    // Expected header marker
    private const string HEADER_MARKER = 'Rekeningnummer';

    public function __construct(private LoggerInterface $logger)
    {
    }

    public function supports(string $bankType): bool
    {
        return $bankType === 'kbc';
    }

    /**
     * @param resource $handle
     *
     * @return iterable<BankTransferData>
     */
    public function extract($handle): iterable
    {
        $headerProcessed = false;
        $lineNum         = 0;

        // Read the entire file content to handle KBC format properly
        $content = stream_get_contents($handle);
        if ($content === false) {
            throw new RuntimeException('Could not read CSV file content');
        }

        // Convert encoding first
        $content = mb_convert_encoding($content, 'UTF-8', 'UTF-8,Windows-1252') ?: $content;

        // Split by carriage return (KBC uses \r to separate records)
        $lines = explode("\r", $content);

        foreach ($lines as $line) {
            $lineNum++;
            $line = trim($line);

            if ($line === '') {
                continue; // Skip empty lines
            }

            // Parse the line as CSV
            $row = str_getcsv($line, self::DELIMITER, '"', '');

            // Check if this is the header line
            if (! $headerProcessed) {
                if (trim((string) $row[0]) === self::HEADER_MARKER) {
                    $headerProcessed = true;
                    continue; // Skip header row
                }

                $this->logger->warning(
                    'Expected KBC header not found',
                    ['line' => $lineNum, 'firstColumn' => trim((string) $row[0])],
                );
                continue;
            }

            // Silently skip rows that do not have enough columns
            if (count($row) < self::COL_FREE_COMM + 1) {
                $this->logger->warning('Skipped invalid KBC row: too few columns', [
                    'line'     => $lineNum,
                    'columns'  => count($row),
                    'required' => self::COL_FREE_COMM + 1,
                ]);
                continue;
            }

            $ownAccount = trim((string) $row[self::COL_OWN_ACCOUNT]);
            if ($ownAccount === '') {
                $this->logger->warning('Skipped invalid KBC row: missing own account number', ['line' => $lineNum]);
                continue;
            }

            $amountRaw = trim((string) $row[self::COL_AMOUNT]);
            if ($amountRaw === '') {
                $this->logger->warning('Skipped invalid KBC row: missing amount', ['line' => $lineNum]);
                continue;
            }

            try {
                yield $this->parseRow($row);
            } catch (InvalidArgumentException $e) {
                $this->logger->warning('Skipped invalid KBC row: parsing error', [
                    'line' => $lineNum,
                    'error' => $e->getMessage(),
                ]);
                continue;
            }
        }

        if (! $headerProcessed) {
            $this->logger->error('KBC CSV extraction failed: header row not found', [
                'expectedMarker' => self::HEADER_MARKER,
                'totalLines' => count($lines),
            ]);

            throw new RuntimeException(
                'Could not find the KBC CSV header row. '
                . 'Please export the file from KBC and upload it without modifications.',
            );
        }
    }

    /**
     * Parse a single validated data row into a {@see BankTransferData} instance.
     *
     * @param list<string|null> $row
     *
     * @throws InvalidArgumentException When the row contains unparseable date or amount values.
     */
    private function parseRow(array $row): BankTransferData
    {
        $ownAccountRaw = trim((string) $row[self::COL_OWN_ACCOUNT]);
        $dateStr       = trim((string) $row[self::COL_DATE]);
        $transactionId = trim((string) $row[self::COL_TRANSACTION]) ?: null;
        $counterNoRaw  = trim((string) $row[self::COL_COUNTER_ACCOUNT]);
        $counterName   = trim((string) $row[self::COL_COUNTER_NAME]) ?: null;
        $amountRaw     = trim((string) $row[self::COL_AMOUNT]);

        // Combine structured and free communication for reference
        $structuredComm = trim((string) $row[self::COL_STRUCTURED_COMM]);
        $freeComm       = trim((string) $row[self::COL_FREE_COMM]);
        $reference      = $structuredComm && $freeComm
            ? $structuredComm . ' ' . $freeComm
            : ($structuredComm ?: $freeComm);

        $date = DateTimeImmutable::createFromFormat(self::DATE_FORMAT, $dateStr);
        if ($date === false) {
            throw new InvalidArgumentException(sprintf('Invalid date format: "%s"', $dateStr));
        }

        // Strip the wall-clock time that PHP injects when only a date is parsed,
        // so every transfer is stored at 00:00:00 and date-only comparisons are exact.
        $date = $date->setTime(0, 0, 0);

        // KBC uses comma as decimal separator and may include period thousands-separators
        $amount = str_replace(['.', ','], ['', '.'], $amountRaw);
        if (! is_numeric($amount)) {
            throw new InvalidArgumentException(sprintf('Invalid amount: "%s"', $amountRaw));
        }

        // Determine if amount is credit or debit based on credit/debit columns
        $credit = trim((string) $row[self::COL_CREDIT]);
        $debit  = trim((string) $row[self::COL_DEBIT]);

        // If credit column has value, amount is positive (incoming)
        // If debit column has value, amount is negative (outgoing)
        if ($credit !== '' && $debit === '') {
            // Credit - ensure positive amount
            $amount = ltrim($amount, '-');
        } elseif ($debit !== '' && $credit === '') {
            // Debit - ensure negative amount
            $amount = ltrim($amount, '-');
            $amount = '-' . $amount;
        }

        // If both are empty or both have values, use the sign from the amount field

        assert(is_numeric($amount));

        return new BankTransferData(
            date: $date,
            ownAccountNumber: $this->normalizeAccountNumber($ownAccountRaw),
            counterAccountNumber: $counterNoRaw !== '' ? $this->normalizeAccountNumber($counterNoRaw) : null,
            counterAccountName: $counterName,
            amount: $amount,
            reference: $reference,
            transactionId: $transactionId,
        );
    }

    /**
     * Normalize an IBAN-style account number to the format: BEXX XXXX XXXX XXXX.
     * Strips all whitespace, uppercases, then re-inserts a space every four characters.
     */
    private function normalizeAccountNumber(string $accountNumber): string
    {
        $stripped = strtoupper((string) preg_replace('/\s+/', '', $accountNumber));

        if ($stripped === '') {
            return '';
        }

        return (string) preg_replace('/(.{4})(?=.)/', '$1 ', $stripped);
    }
}
