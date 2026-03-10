<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\BankAccount;
use App\Entity\Transfer;
use App\Entity\User;
use App\Repository\BankAccountRepository;
use DateTimeImmutable;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

use function array_map;
use function count;
use function fclose;
use function feof;
use function fgetcsv;
use function fopen;
use function hash;
use function in_array;
use function is_numeric;
use function mb_convert_encoding;
use function sprintf;
use function str_contains;
use function str_replace;
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
    public function importCsv(string $filePath, string $bankType, User $user, string $csvSource): array
    {
        if (! in_array($bankType, self::SUPPORTED_BANKS, true)) {
            throw new InvalidArgumentException(sprintf('Unsupported bank type: %s', $bankType));
        }

        return $this->importBelfiusCsv($filePath, $user, $csvSource);
    }

    /**
     * @return array{
     *     imported: int,
     *     skipped: int,
     *     errors: array<string>
     * }
     */
    private function importBelfiusCsv(string $filePath, User $user, string $csvSource): array
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
                    $result = $this->processBelfiusRow($row, $user, $csvSource);
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
    private function processBelfiusRow(array $row, User $user, string $csvSource): bool
    {
        $ownAccountNo  = $this->normalizeAccountNumber(trim($row[self::COL_OWN_ACCOUNT]));
        $dateStr       = trim($row[self::COL_DATE]);
        $transactionId = trim($row[self::COL_TRANSACTION]);
        $counterNo     = $this->normalizeAccountNumber(trim($row[self::COL_COUNTERPARTY]));
        $counterName   = trim($row[self::COL_COUNTER_NAME]);
        $amountRaw     = trim($row[self::COL_AMOUNT]);
        $reference     = trim($row[self::COL_REFERENCE]);

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

        // Positive amount  → money comes IN  → counterparty is the sender (from), own is receiver (to)
        // Negative amount  → money goes OUT  → own is sender (from), counterparty is receiver (to)
        $amountFloat = (float) $amount;
        if ($amountFloat >= 0) {
            $fromAccountNo   = $counterNo !== '' ? $counterNo : $counterName;
            $fromAccountName = $counterName;
            $toAccountNo     = $ownAccountNo;
            $toAccountName   = $ownAccountNo;
        } else {
            $fromAccountNo   = $ownAccountNo;
            $fromAccountName = $ownAccountNo;
            $toAccountNo     = $counterNo !== '' ? $counterNo : $counterName;
            $toAccountName   = $counterName;
        }

        $bankAccount = $this->getOrCreateBankAccount($fromAccountNo, $fromAccountName, $user);
        $toAccount   = $this->getOrCreateBankAccount($toAccountNo, $toAccountName, $user);

        $transfer = new Transfer();
        $transfer->setAmount($amount);
        $transfer->setDate($date);
        $transfer->setFromAccount($bankAccount);
        $transfer->setToAccount($toAccount);
        $transfer->setReference($reference);
        $transfer->setCsvSource($csvSource);
        $transfer->setOwner($user);

        if ($transactionId !== '') {
            $transfer->setTransactionId($transactionId);
        }

        $fingerprint = $this->generateFingerprint($date, $amount, $fromAccountNo, $toAccountNo, $reference);
        $transfer->setFingerprint($fingerprint);

        $isInternal = $this->isInternalTransfer($fromAccountNo, $toAccountNo, $ownAccountNo, $reference);
        $transfer->setIsInternal($isInternal);

        $saved = $this->transferService->saveTransfer($transfer);

        if ($saved && ! $isInternal) {
            $this->labelingService->autoLabel($transfer);
        }

        return $saved;
    }

    /**
     * Strip spaces from IBAN-style account numbers (e.g. "BE57 0636 7584 7535" → "BE57063675847535").
     */
    private function normalizeAccountNumber(string $accountNumber): string
    {
        return str_replace(' ', '', $accountNumber);
    }

    private function getOrCreateBankAccount(string $accountNumber, string $accountName, User $user): BankAccount
    {
        if ($accountNumber === '') {
            $accountNumber = $accountName !== '' ? $accountName : 'UNKNOWN';
        }

        $account = $this->bankAccountRepository->findByAccountNumber($accountNumber);

        if ($account instanceof BankAccount) {
            // Update name if we now have a better one
            $hasGenericName = $account->getAccountName() === $account->getAccountNumber();
            $hasRealName    = $accountName !== '' && $accountName !== $accountNumber;
            if ($hasGenericName && $hasRealName) {
                $account->setAccountName($accountName);
                $this->bankAccountRepository->save($account, true);
            }

            return $account;
        }

        $account = new BankAccount();
        $account->setAccountNumber($accountNumber);
        $account->setAccountName($accountName !== '' ? $accountName : $accountNumber);
        $account->setOwner($user);

        $this->bankAccountRepository->save($account, true);

        return $account;
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

    private function isInternalTransfer(
        string $fromAccountNo,
        string $toAccountNo,
        string $ownAccountNo,
        string $reference,
    ): bool {
        // A transfer is internal if both sides are the user's own account
        // (identified by appearing in the CSV's own-account column on different rows,
        // but here we only have one ownAccountNo per row — the simplest check is:
        // both from and to are the same account, or reference says INTERNAL TRANSFER)
        if ($fromAccountNo === $ownAccountNo && $toAccountNo === $ownAccountNo) {
            return true;
        }

        return str_contains($reference, 'INTERNAL TRANSFER');
    }
}
