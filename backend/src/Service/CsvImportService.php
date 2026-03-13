<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\BankAccount;
use App\Entity\Transfer;
use App\Repository\BankAccountRepository;
use DateTimeImmutable;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

use function array_map;
use function bcadd;
use function bcsub;
use function count;
use function fclose;
use function feof;
use function fgetcsv;
use function fopen;
use function hash;
use function in_array;
use function is_numeric;
use function mb_convert_encoding;
use function preg_replace;
use function sprintf;
use function str_replace;
use function strtoupper;
use function trim;

class CsvImportService
{
    private const array SUPPORTED_BANKS = ['belfius'];

    private const string BELFIUS_DELIMITER = ';';

    private const string BELFIUS_DATE_FORMAT = 'd/m/Y';

    /**
     * The first column of the Belfius data header row.
     * Used to detect where the actual data starts (after metadata rows).
     */
    private const string BELFIUS_HEADER_MARKER = 'Rekening';

    // Column indices in the Belfius data rows (after the header row)
    private const int COL_OWN_ACCOUNT = 0;

      // Rekening
    private const int COL_DATE = 1;

      // Boekingsdatum
    private const int COL_TRANSACTION = 3;

      // Transactienummer
    private const int COL_COUNTERPARTY = 4;

      // Rekening tegenpartij
    private const int COL_COUNTER_NAME = 5;

      // Naam tegenpartij bevat
    private const int COL_AMOUNT = 10;

     // Bedrag  (e.g. "1950,00" or "-22,50")
    private const int COL_REFERENCE = 14; // Mededelingen

    public function __construct(
        private readonly BankAccountRepository $bankAccountRepository,
        private readonly TransferService $transferService,
        private readonly LabelingService $labelingService,
    ) {
    }

    /**
     * @return array{
     *     imported: int,
     *     skipped: int,
     *     errors: array<string>
     * }
     */
    public function importCsv(string $filePath, string $bankType, string $csvSource): array
    {
        if (! in_array($bankType, self::SUPPORTED_BANKS, true)) {
            throw new InvalidArgumentException(sprintf('Unsupported bank type: %s', $bankType));
        }

        return $this->importBelfiusCsv($filePath, $csvSource);
    }

    /**
     * @return array{
     *     imported: int,
     *     skipped: int,
     *     errors: array<string>
     * }
     */
    private function importBelfiusCsv(string $filePath, string $csvSource): array
    {
        $handle = fopen($filePath, 'r');
        if ($handle === false) {
            throw new RuntimeException('Could not open CSV file');
        }

        $imported    = 0;
        $skipped     = 0;
        $errors      = [];
        $lineNum     = 0;
        $headerFound = false;

        try {
            while (! feof($handle)) {
                $row = fgetcsv($handle, 0, self::BELFIUS_DELIMITER, '"', '');
                $lineNum++;

                if ($row === false) {
                    continue;
                }

                // Convert encoding if needed (Belfius exports may use Windows-1252)
                $row = array_map(
                    static function (mixed $v): string {
                        $str = (string) $v;

                        return mb_convert_encoding($str, 'UTF-8', 'UTF-8,Windows-1252') ?: $str;
                    },
                    $row,
                );

                // Skip metadata rows until we find the column header row
                if (! $headerFound) {
                    if (trim($row[0]) === self::BELFIUS_HEADER_MARKER) {
                        $headerFound = true;
                    }

                    continue;
                }

                // Skip empty or too-short rows
                if (count($row) < self::COL_REFERENCE + 1) {
                    continue;
                }

                $ownAccount = trim($row[self::COL_OWN_ACCOUNT]);
                if ($ownAccount === '') {
                    continue;
                }

                try {
                    $result = $this->processBelfiusRow($row, $csvSource);
                    if ($result) {
                        $imported++;
                    } else {
                        $skipped++;
                    }
                } catch (Throwable $e) {
                    $errors[] = sprintf('Line %d: %s', $lineNum, $e->getMessage());
                }
            }
        } finally {
            fclose($handle);
        }

        if (! $headerFound) {
            throw new RuntimeException(
                'Could not find the Belfius CSV header row. '
                . 'Please export the file from Belfius and upload it without modifications.',
            );
        }

        return [
            'imported' => $imported,
            'skipped'  => $skipped,
            'errors'   => $errors,
        ];
    }

    /** @param array<int, string> $row */
    private function processBelfiusRow(array $row, string $csvSource): bool
    {
        $ownAccountRaw = trim($row[self::COL_OWN_ACCOUNT]);
        $dateStr       = trim($row[self::COL_DATE]);
        $transactionId = trim($row[self::COL_TRANSACTION]);
        $counterNoRaw  = trim($row[self::COL_COUNTERPARTY]);
        $counterName   = trim($row[self::COL_COUNTER_NAME]) ?: null;
        $amountRaw     = trim($row[self::COL_AMOUNT]);
        $reference     = trim($row[self::COL_REFERENCE]);

        // Normalize own account number
        $ownAccountNo = $this->normalizeAccountNumber($ownAccountRaw);

        // Parse date
        $date = DateTimeImmutable::createFromFormat(self::BELFIUS_DATE_FORMAT, $dateStr);
        if ($date === false) {
            throw new InvalidArgumentException(sprintf('Invalid date format: "%s"', $dateStr));
        }

        // Normalise amount: Belfius uses comma as decimal separator ("1950,00" / "-22,50")
        $amount = str_replace(',', '.', $amountRaw);
        if (! is_numeric($amount)) {
            throw new InvalidArgumentException(sprintf('Invalid amount: "%s"', $amountRaw));
        }

        // Normalize counter account number (may be empty)
        $counterNo = $counterNoRaw !== '' ? $this->normalizeAccountNumber($counterNoRaw) : null;

        // Determine from/to accounts
        // Positive amount → money comes IN → counterparty is sender (from), own is receiver (to)
        // Negative amount → money goes OUT → own is sender (from), counterparty is receiver (to)
        $amountFloat = (float) $amount;
        if ($amountFloat >= 0) {
            $fromAccountNo   = $counterNo;
            $fromAccountName = $counterName;
            $toAccountNo     = $ownAccountNo;
            $toAccountName   = null; // own account name derived from number
            $fromIsInternal  = false;
            $toIsInternal    = true; // own account is always internal
        } else {
            $fromAccountNo   = $ownAccountNo;
            $fromAccountName = null;
            $toAccountNo     = $counterNo;
            $toAccountName   = $counterName;
            $fromIsInternal  = true; // own account is always internal
            $toIsInternal    = false;
        }

        $bankAccount = $this->getOrCreateBankAccount($fromAccountNo, $fromAccountName, $fromIsInternal);
        $toAccount   = $this->getOrCreateBankAccount($toAccountNo, $toAccountName, $toIsInternal);

        $transfer = new Transfer();
        $transfer->setAmount($amount);
        $transfer->setDate($date);
        $transfer->setFromAccount($bankAccount);
        $transfer->setToAccount($toAccount);
        $transfer->setReference($reference);
        $transfer->setCsvSource($csvSource);

        if ($transactionId !== '') {
            $transfer->setTransactionId($transactionId);
        }

        $fingerprint = $this->generateFingerprint(
            $date,
            $amount,
            (string) $fromAccountNo,
            (string) $toAccountNo,
            $reference,
        );
        $transfer->setFingerprint($fingerprint);

        $isInternal = $bankAccount->isInternal() && $toAccount->isInternal();
        $transfer->setIsInternal($isInternal);

        // Filter: if both accounts are internal and a reversed transfer already exists, delete it and skip this one
        if (
            $isInternal && $this->transferService->deleteReversedInternalTransfer(
                $bankAccount,
                $toAccount,
                $amount,
                $date,
            )
        ) {
            return false;
        }

        $saved = $this->transferService->saveTransfer($transfer);

        if ($saved) {
            // Update balances: from account gets amount added (it sent the money), to account gets amount subtracted
            $this->updateAccountBalance($bankAccount, $amount);
            $this->updateAccountBalance($toAccount, bcsub('0', $amount, 2));

            if (! $isInternal) {
                $this->labelingService->autoLabel($transfer);
            }
        }

        return $saved;
    }

    /**
     * Normalize IBAN-style account number to format: BEXX XXXX XXXX XXXX
     * Strips all spaces, uppercases, then re-inserts spaces every 4 chars.
     */
    private function normalizeAccountNumber(string $accountNumber): string
    {
        // Strip all whitespace and uppercase
        $stripped = strtoupper((string) preg_replace('/\s+/', '', $accountNumber));

        if ($stripped === '') {
            return '';
        }

        // Insert a space every 4 characters
        return (string) preg_replace('/(.{4})(?=.)/', '$1 ', $stripped);
    }

    private function getOrCreateBankAccount(
        string|null $accountNumber,
        string|null $accountName,
        bool $isInternal,
    ): BankAccount {
        // Only store valid values; set null if not found
        $normalizedNumber = $accountNumber !== null && $accountNumber !== '' ? $accountNumber : null;
        $normalizedName   = $accountName !== null && $accountName !== '' ? $accountName : null;

        $hash    = BankAccount::calculateHash($normalizedName, $normalizedNumber);
        $account = $this->bankAccountRepository->findByHash($hash);

        if ($account instanceof BankAccount) {
            // If this account is now known to be internal (own account), upgrade it
            if ($isInternal && ! $account->isInternal()) {
                $account->setIsInternal(true);
                $this->bankAccountRepository->save($account, true);
            }

            return $account;
        }

        $account = new BankAccount();
        $account->setAccountNumber($normalizedNumber);
        $account->setAccountName($normalizedName);
        $account->setHash($hash);
        $account->setIsInternal($isInternal);

        $this->bankAccountRepository->save($account, true);

        return $account;
    }

    /** @param numeric-string $amount */
    private function updateAccountBalance(BankAccount $bankAccount, string $amount): void
    {
        $newBalance = bcadd($bankAccount->getTotalBalance(), $amount, 2);
        $bankAccount->setTotalBalance($newBalance);
        $this->bankAccountRepository->save($bankAccount, true);
    }

    private function generateFingerprint(
        DateTimeImmutable $date,
        string $amount,
        string $fromAccount,
        string $toAccount,
        string $reference,
    ): string {
        $data = sprintf(
            '%s|%s|%s|%s|%s',
            $date->format('Y-m-d'),
            $amount,
            $fromAccount,
            $toAccount,
            $reference,
        );

        return hash('sha256', $data);
    }
}
