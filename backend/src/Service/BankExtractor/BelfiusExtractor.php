<?php

declare(strict_types=1);

namespace App\Service\BankExtractor;

use DateTimeImmutable;
use InvalidArgumentException;
use Psr\Log\LoggerInterface;
use RuntimeException;

use function array_map;
use function count;
use function feof;
use function fgetcsv;
use function is_numeric;
use function mb_convert_encoding;
use function preg_replace;
use function sprintf;
use function str_replace;
use function strtoupper;
use function trim;

/**
 * Extracts transfer data from a Belfius bank CSV export.
 *
 * Expected file format:
 *   - Delimiter:     semicolon (;)
 *   - Encoding:      UTF-8 or Windows-1252 (auto-detected)
 *   - Date format:   d/m/Y
 *   - Amount format: Belgian decimal notation ("1 950,00" / "-22,50")
 *
 * The file starts with several metadata rows before the actual column header row
 * whose first cell is "Rekening".
 */
final readonly class BelfiusExtractor implements BankExtractorInterface
{
    private const string DELIMITER = ';';

    private const string DATE_FORMAT = 'd/m/Y';

    /**
     * First cell value of the column header row that separates metadata from data.
     */
    private const string HEADER_MARKER = 'Rekening';

    // Column indices in every data row (0-based, after the header row)
    private const int COL_OWN_ACCOUNT = 0;  // Rekening

    private const int COL_DATE = 1;          // Boekingsdatum

    private const int COL_TRANSACTION = 3;   // Transactienummer

    private const int COL_COUNTERPARTY = 4;  // Rekening tegenpartij

    private const int COL_COUNTER_NAME = 5;  // Naam tegenpartij

    private const int COL_AMOUNT = 10;       // Bedrag

    private const int COL_REFERENCE = 14;    // Mededelingen

    public function __construct(private LoggerInterface $logger)
    {
    }

    public function supports(string $bankType): bool
    {
        return $bankType === 'belfius';
    }

    /**
     * @param resource $handle
     *
     * @return iterable<BankTransferData>
     */
    public function extract($handle): iterable
    {
        $headerFound = false;
        $lineNum     = 0;

        while (! feof($handle)) {
            $row = fgetcsv($handle, 0, self::DELIMITER, '"', '');
            $lineNum++;

            if ($row === false) {
                continue;
            }

            // Convert encoding: Belfius may export Windows-1252
            $row = array_map(
                static function (mixed $v): string {
                    $str = (string) $v;

                    return mb_convert_encoding($str, 'UTF-8', 'UTF-8,Windows-1252') ?: $str;
                },
                $row,
            );

            // Skip every metadata row until the column header row is found
            if (! $headerFound) {
                if (trim($row[0]) === self::HEADER_MARKER) {
                    $headerFound = true;
                }

                continue;
            }

            // Silently skip rows that do not have enough columns
            if (count($row) < self::COL_REFERENCE + 1) {
                $this->logger->warning('Skipped invalid Belfius row: too few columns', [
                    'line'     => $lineNum,
                    'columns'  => count($row),
                    'required' => self::COL_REFERENCE + 1,
                ]);
                continue;
            }

            // Silently skip rows without an own account number
            $ownAccount = trim($row[self::COL_OWN_ACCOUNT]);
            if ($ownAccount === '') {
                $this->logger->warning('Skipped invalid Belfius row: missing own account number', ['line' => $lineNum]);
                continue;
            }

            yield $this->parseRow($row);
        }

        if (! $headerFound) {
            $this->logger->error('Belfius CSV extraction failed: header row not found', [
                'expectedMarker' => self::HEADER_MARKER,
            ]);

            throw new RuntimeException(
                'Could not find the Belfius CSV header row. '
                . 'Please export the file from Belfius and upload it without modifications.',
            );
        }
    }

    /**
     * Parse a single validated data row into a {@see BankTransferData} instance.
     *
     * @param array<int, string> $row
     *
     * @throws InvalidArgumentException When the row contains unparseable date or amount values.
     */
    private function parseRow(array $row): BankTransferData
    {
        $ownAccountRaw = trim($row[self::COL_OWN_ACCOUNT]);
        $dateStr       = trim($row[self::COL_DATE]);
        $transactionId = trim($row[self::COL_TRANSACTION]) ?: null;
        $counterNoRaw  = trim($row[self::COL_COUNTERPARTY]);
        $counterName   = trim($row[self::COL_COUNTER_NAME]) ?: null;
        $amountRaw     = trim($row[self::COL_AMOUNT]);
        $reference     = trim($row[self::COL_REFERENCE]);

        $date = DateTimeImmutable::createFromFormat(self::DATE_FORMAT, $dateStr);
        if ($date === false) {
            throw new InvalidArgumentException(sprintf('Invalid date format: "%s"', $dateStr));
        }

        // Strip the wall-clock time that PHP injects when only a date is parsed,
        // so every transfer is stored at 00:00:00 and date-only comparisons are exact.
        $date = $date->setTime(0, 0, 0);

        // Belfius uses comma as decimal separator and may include space thousands-separators
        $amount = str_replace([' ', ','], ['', '.'], $amountRaw);
        if (! is_numeric($amount)) {
            throw new InvalidArgumentException(sprintf('Invalid amount: "%s"', $amountRaw));
        }

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
