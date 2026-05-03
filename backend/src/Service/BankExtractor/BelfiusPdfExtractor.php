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
use function fclose;
use function implode;
use function is_numeric;
use function is_resource;
use function preg_match;
use function preg_match_all;
use function preg_quote;
use function preg_replace;
use function proc_close;
use function proc_open;
use function sprintf;
use function str_replace;
use function str_starts_with;
use function stream_get_contents;
use function stream_get_meta_data;
use function strlen;
use function strtoupper;
use function substr;
use function trim;

use const PREG_OFFSET_CAPTURE;

/**
 * Extracts transfer data from a Belfius bank PDF statement.
 *
 * Expected file format:
 *   - PDF statement exported from Belfius online banking
 *   - Each transaction line starts with a 4-digit number followed by a date
 *   - Sign (+/-) and amount are right-aligned on the same line as the transaction header
 *   - Description lines are indented with spaces
 *
 * Requires `pdftotext` (from poppler-utils) to be available on the system PATH.
 */
final readonly class BelfiusPdfExtractor implements BankExtractorInterface
{
    private const string DATE_FORMAT = 'd-m-Y';

    /**
     * Regex that matches a transaction header line produced by `pdftotext -layout`.
     *
     * Capturing groups:
     *   1 – 4-digit sequence number (e.g. "0211")
     *   2 – booking date in DD-MM-YYYY format
     *   3 – sign ("+" or "-")
     *   4 – amount string using "." thousands-sep and "," decimal-sep (e.g. "1.950,00")
     */
    private const string TRANSACTION_HEADER_PATTERN
        = '/^(\d{4})\s+(\d{2}-\d{2}-\d{4})\s+\(VAL\.\s+\d{2}-\d{2}-\d{4}\).*?([+-])\s*([\d.]+,\d{2})\s*$/';

    /**
     * Regex to locate the own-account IBAN that appears between dashes in the PDF header:
     *   --- BE57 0636 7584 7535   BIC: GKCCBEBB ---
     */
    private const string OWN_ACCOUNT_PATTERN = '/-{3,}\s+(BE\d{2}(?:\s?\d{4}){3})\s+BIC:/m';

    public function __construct(private LoggerInterface $logger)
    {
    }

    public function supports(string $bankType): bool
    {
        return $bankType === 'belfius_pdf';
    }

    /**
     * @param resource $handle
     *
     * @return iterable<BankTransferData>
     */
    public function extract($handle): iterable
    {
        // Resolve the actual file path so we can pass it to pdftotext.
        $meta     = stream_get_meta_data($handle);
        $filePath = $meta['uri'] ?? null;

        if ($filePath === null || $filePath === '') {
            throw new RuntimeException('Cannot determine file path from stream handle');
        }

        $text = $this->runPdfToText($filePath);

        $ownAccountNumber = $this->extractOwnAccountNumber($text);

        if ($ownAccountNumber === null) {
            throw new RuntimeException(
                'Could not find the own account number in the Belfius PDF. '
                . 'Please upload an unmodified Belfius statement PDF.',
            );
        }

        $this->logger->info('Belfius PDF extraction started', ['ownAccount' => $ownAccountNumber]);

        $count = 0;

        foreach ($this->parseTransactions($text, $ownAccountNumber) as $transfer) {
            $count++;

            yield $transfer;
        }

        $this->logger->info('Belfius PDF extraction completed', ['transfers' => $count]);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Invoke `pdftotext -layout` and return the resulting plain text.
     *
     * @throws RuntimeException When pdftotext is unavailable or exits with a non-zero code.
     */
    private function runPdfToText(string $filePath): string
    {
        $descriptors = [
            0 => ['pipe', 'r'],   // stdin
            1 => ['pipe', 'w'],   // stdout
            2 => ['pipe', 'w'],   // stderr
        ];

        $process = proc_open(
            ['pdftotext', '-layout', '-enc', 'UTF-8', $filePath, '-'],
            $descriptors,
            $pipes,
        );

        if (! is_resource($process)) {
            throw new RuntimeException(
                'Failed to start pdftotext. Make sure poppler-utils is installed.',
            );
        }

        fclose($pipes[0]);

        $text     = stream_get_contents($pipes[1]) ?: '';
        $errorOut = stream_get_contents($pipes[2]) ?: '';

        fclose($pipes[1]);
        fclose($pipes[2]);

        $exitCode = proc_close($process);

        if ($exitCode !== 0) {
            throw new RuntimeException(
                sprintf('pdftotext failed (exit %d): %s', $exitCode, $errorOut),
            );
        }

        return $text;
    }

    /**
     * Find the own account IBAN from the first page header of the PDF text.
     */
    private function extractOwnAccountNumber(string $text): string|null
    {
        if (preg_match(self::OWN_ACCOUNT_PATTERN, $text, $matches)) {
            return $this->normalizeAccountNumber($matches[1]);
        }

        return null;
    }

    /**
     * Walk through lines produced by pdftotext -layout and yield one BankTransferData
     * per valid transaction block.
     *
     * Each block looks like:
     *   NNNN DD-MM-YYYY (VAL. DD-MM-YYYY)         [+|-]  amount
     *     description line 1
     *     description line 2
     *     ...
     *
     * @return iterable<BankTransferData>
     */
    private function parseTransactions(string $text, string $ownAccountNumber): iterable
    {
        $lines     = explode("\n", $text);
        $lineCount = count($lines);

        /** @var array{number:string,date:string,sign:string,amount:string}|null $header */
        $header      = null;
        $description = [];

        for ($i = 0; $i < $lineCount; $i++) {
            $line = $lines[$i];

            if (preg_match(self::TRANSACTION_HEADER_PATTERN, $line, $m)) {
                // Flush previous transaction
                if ($header !== null) {
                    $transfer = $this->buildTransferData($header, $description, $ownAccountNumber);

                    yield $transfer;
                }

                $header      = [
                    'number' => $m[1],
                    'date'   => $m[2],
                    'sign'   => $m[3],
                    'amount' => $m[4],
                ];
                $description = [];

                continue;
            }

            if ($header === null) {
                continue; // Still in the document preamble
            }

            // Description lines are indented with at least two spaces, or empty.
            // A non-indented non-empty line that does NOT match a transaction header
            // signals a page header/footer – stop collecting description for this tx.
            $trimmed = trim($line);

            if ($trimmed === '') {
                continue; // blank spacer – skip
            }

            if (str_starts_with($line, '  ') || str_starts_with($line, "\t")) {
                $description[] = $trimmed;
            }

            // Otherwise it is a page header/footer line – ignore it, keep $header open
            // so the next real transaction header will flush it correctly.
        }

        // Flush the final transaction
        if ($header === null) {
            return;
        }

        $transfer = $this->buildTransferData($header, $description, $ownAccountNumber);

        yield $transfer;
    }

    /**
     * Convert a parsed transaction block into a {@see BankTransferData}.
     *
     * Returns null when the block cannot be parsed (the caller will skip it).
     *
     * @param array{number:string,date:string,sign:string,amount:string} $header
     * @param list<string>                                               $descriptionLines
     *
     * @throws InvalidArgumentException When the date or amount value is unparseable.
     */
    private function buildTransferData(
        array $header,
        array $descriptionLines,
        string $ownAccountNumber,
    ): BankTransferData {
        // ── Date ─────────────────────────────────────────────────────────────
        $date = DateTimeImmutable::createFromFormat(self::DATE_FORMAT, $header['date']);
        if ($date === false) {
            throw new InvalidArgumentException(sprintf('Invalid date: "%s"', $header['date']));
        }

        $date = $date->setTime(0, 0, 0);

        // ── Amount ────────────────────────────────────────────────────────────
        // Belgian notation: "1.950,00" → strip thousands separator, replace decimal comma
        $amountRaw = str_replace(['.', ','], ['', '.'], $header['amount']);

        if (! is_numeric($amountRaw)) {
            throw new InvalidArgumentException(sprintf('Invalid amount: "%s"', $header['amount']));
        }

        $amount = $header['sign'] === '-' ? '-' . $amountRaw : $amountRaw;
        assert(is_numeric($amount));

        // ── Description / reference ───────────────────────────────────────────
        // Join lines and repair word-break hyphens inserted by pdftotext at line ends.
        // e.g. "DEKETELAERE- POLLET" → "DEKETELAERE-POLLET"
        $fullDescription = implode(' ', $descriptionLines);
        $fullDescription = (string) preg_replace('/(\w)-\s+(\w)/u', '$1-$2', $fullDescription);

        // ── Counter account ───────────────────────────────────────────────────
        [$counterAccountNumber, $counterAccountName] = $this->extractCounterInfo(
            $fullDescription,
            $ownAccountNumber,
        );

        return new BankTransferData(
            date: $date,
            ownAccountNumber: $ownAccountNumber,
            counterAccountNumber: $counterAccountNumber,
            counterAccountName: $counterAccountName,
            amount: $amount,
            reference: $fullDescription,
            transactionId: null, // PDF statements do not carry formal transaction IDs
        );
    }

    /**
     * Extract the counter-party account number and name from the transaction description.
     *
     * Extraction strategy (tried in order):
     *   1. Belgian IBAN found in description → use IBAN + text that follows it as the name.
     *   2. BANCONTACT[-\s]AANKOOP → merchant name between the first and second " - " separator.
     *   3. BANCONTACT APP OF BELFIUS MOBILE APP → P2P recipient first name.
     *   4. DEBITMASTERCARD-BETALING → merchant name before country-code + amount + EUR.
     *   5. UW EUROPESE DOMICILIERING → creditor name between "VOOR" and "MEDEDELING:".
     *
     * Returns [normalizedIban|null, cleanedName|null].
     *
     * @return array{string|null, string|null}
     */
    private function extractCounterInfo(string $description, string $ownAccountNumber): array
    {
        // ── 1. IBAN-based extraction ──────────────────────────────────────────
        $ibanPattern = '/\bBE\d{2}(?:\s?\d{4}){3}\b/i';

        if (preg_match_all($ibanPattern, $description, $allMatches, PREG_OFFSET_CAPTURE)) {
            /** @var list<array{string, int<-1, max>}> $ibanOccurrences */
            $ibanOccurrences = $allMatches[0];

            foreach ($ibanOccurrences as [$rawIban, $offset]) {
                $normalized = $this->normalizeAccountNumber($rawIban);

                if ($normalized === $ownAccountNumber) {
                    continue; // Reference to own account – skip
                }

                // Take all text after this IBAN as the candidate name.
                $afterIban = trim(substr($description, $offset + strlen($rawIban)));

                // Truncate before "NAAR {OWN_IBAN}" when own account appears in tail.
                $ownAccountStripped = (string) preg_replace('/\s+/', '', $ownAccountNumber);
                $afterIbanStripped  = (string) preg_replace('/\s+/', '', $afterIban);
                if (preg_match('/\b' . preg_quote($ownAccountStripped, '/') . '\b/i', $afterIbanStripped)) {
                    $afterIban = (string) preg_replace('/\s+NAAR\s+BE\d{2}(?:\s?\d{4}){3}.*/i', '', $afterIban);
                    $afterIban = trim($afterIban);
                }

                // For Wero incoming transfers the text after the sender IBAN contains
                // "Wero {RECIPIENT_DESCRIPTION}" – strip that suffix so we keep only the sender name.
                $afterIban = (string) preg_replace('/\s+Wero\b.*/i', '', $afterIban);

                // Remove "REF. : <hex-hash>" patterns.
                $afterIban = (string) preg_replace('/\s+REF\.\s*:?\s*[a-f0-9]{16,}/i', '', $afterIban);

                // Remove standalone trailing hex hashes (e.g. Wero transaction IDs).
                $afterIban = (string) preg_replace('/\s+[a-f0-9]{32,}\s*$/i', '', $afterIban);

                // Remove structured communication references "+++NNN/NNN/NNN+++".
                $afterIban = (string) preg_replace('/\s*\+{3}[\d\/]+\+{3}.*/i', '', $afterIban);

                $counterName = trim($afterIban);

                return [
                    $normalized,
                    $counterName !== '' ? $counterName : null,
                ];
            }
        }

        // ── 2. BANCONTACT[-\s]AANKOOP ─────────────────────────────────────────
        // Format: BANCONTACT[-| ]AANKOOP - {MERCHANT} - {POSTALCODE} {CITY} {CC} - {DATE} ...
        // The merchant name sits between the first " - " separator and the next " - " that
        // precedes a 4-or-5-digit postal code.
        if (preg_match('/^BANCONTACT[\s-]+AANKOOP\s*-\s*(.+?)\s*-\s*\d{4,5}/i', $description, $m)) {
            return [null, trim($m[1])];
        }

        // ── 3. BANCONTACT APP OF BELFIUS MOBILE APP (P2P) ─────────────────────
        // Format: BANCONTACT APP OF BELFIUS MOBILE APP - {FIRSTNAME} P2P MOBILE - {DATE}
        if (preg_match('/^BANCONTACT\s+APP\s+OF\s+BELFIUS\s+MOBILE\s+APP\s*-\s*(\S+)/i', $description, $m)) {
            return [null, trim($m[1])];
        }

        // ── 4. DEBITMASTERCARD-BETALING ───────────────────────────────────────
        // Format: DEBITMASTERCARD-BETALING [VIA {METHOD}] {DD/MM} {MERCHANT} {CITY} {CC} {AMT} EUR
        // The optional "VIA {METHOD}" covers "VIA Google Pay", "VIA Apple Pay", etc.
        // Country code is exactly 2 letters right before the decimal amount and "EUR".
        if (
            preg_match(
                '/^DEBITMASTERCARD-BETALING\s+'
                . '(?:VIA\s+\S+(?:\s+\S+)?\s+)?\d{2}\/\d{2}\s+(.+?)'
                . '\s+[A-Z]{2}\s+[\d.,]+\s+EUR/i',
                $description,
                $m,
            )
        ) {
            return [null, trim($m[1])];
        }

        // ── 5. UW EUROPESE DOMICILIERING (SEPA direct debit) ─────────────────
        // Format: UW EUROPESE DOMICILIERING {REF} VOOR {CREDITOR_NAME} MEDEDELING: ...
        if (preg_match('/^UW EUROPESE DOMICILIERING\s+\S+\s+VOOR\s+(.+?)\s+MEDEDELING:/i', $description, $m)) {
            return [null, trim($m[1])];
        }

        // ── 6. BETALING VIA UW MOBILE BANKING APP (manual mobile payment) ────
        // Format: BETALING VIA UW MOBILE BANKING APP AAN {NAME} OP {DD/MM/YYYY} MET UW BETAALREKENING {OWN_IBAN}
        if (
            preg_match(
                '/^BETALING\s+VIA\s+UW\s+MOBILE\s+BANKING\s+APP\s+AAN\s+(.+?)\s+OP\s+\d{2}\/\d{2}\/\d{4}/i',
                $description,
                $m,
            )
        ) {
            return [null, trim($m[1])];
        }

        return [null, null];
    }

    /**
     * Normalise an IBAN to the canonical "BEXX XXXX XXXX XXXX" format.
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
