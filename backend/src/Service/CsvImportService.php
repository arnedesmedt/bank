<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\BankAccount;
use App\Entity\Transfer;
use App\Repository\BankAccountRepository;
use App\Service\BankExtractor\BankExtractorInterface;
use App\Service\BankExtractor\BankTransferData;
use DateTimeImmutable;
use InvalidArgumentException;
use Psr\Log\LoggerInterface;
use RuntimeException;
use Symfony\Component\DependencyInjection\Attribute\AutowireIterator;
use Throwable;

use function array_map;
use function array_values;
use function assert;
use function bcadd;
use function bcsub;
use function count;
use function fclose;
use function file_exists;
use function fopen;
use function hash;
use function implode;
use function is_numeric;
use function ltrim;
use function preg_replace;
use function sprintf;
use function trim;

class CsvImportService
{
    /** @var list<BankExtractorInterface> */
    private readonly array $extractors;

    /**
     * In-memory bank-account cache for the duration of a single import.
     * Keyed by BankAccount hash so we avoid a DB round-trip for every row.
     *
     * @var array<string, BankAccount>
     */
    private array $accountCache = [];

    /** @param iterable<BankExtractorInterface> $extractors All registered bank extractors */
    public function __construct(
        private readonly LoggerInterface $logger,
        private readonly BankAccountRepository $bankAccountRepository,
        private readonly TransferService $transferService,
        private readonly LabelingService $labelingService,
        #[AutowireIterator('bank.extractor')]
        iterable $extractors,
    ) {
        $this->extractors = array_values([...$extractors]);
    }

    /**
     * @return array{
     *     imported: int,
     *     skippedDuplicates: int,
     *     skippedReversedInternal: int,
     *     skippedInvalidData: int,
     *     errors: array<string>
     * }
     */
    public function importCsv(string $filePath, string $bankType, string $csvSource): array
    {
        $bankExtractor = $this->findExtractor($bankType);

        if (! file_exists($filePath)) {
            throw new RuntimeException(
                sprintf(
                    'Import file not found: "%s". '
                    . 'The file may have been cleaned up after a previous failed attempt – please re-upload it.',
                    $filePath,
                ),
            );
        }

        $handle = fopen($filePath, 'r');
        if ($handle === false) {
            throw new RuntimeException(sprintf('Could not open import file: "%s"', $filePath));
        }

        // Reset per-import in-memory caches
        $this->accountCache = [];

        $imported                = 0;
        $skippedDuplicates       = 0;
        $skippedReversedInternal = 0;
        $skippedInvalidData      = 0;
        $errors                  = [];

        $this->logger->info('Starting CSV import', ['source' => $csvSource, 'bankType' => $bankType]);

        $lineNum = 0;

        try {
            foreach ($bankExtractor->extract($handle) as $transferData) {
                $lineNum++;

                try {
                    $result = $this->processTransferData($transferData, $csvSource);

                    switch ($result) {
                        case 'imported':
                            $imported++;
                            break;
                        case 'duplicate':
                            $skippedDuplicates++;
                            $this->logger->warning('Skipped duplicate transfer', [
                                'source'        => $csvSource,
                                'line'          => $lineNum,
                                'transactionId' => $transferData->transactionId,
                                'date'          => $transferData->date->format('Y-m-d'),
                                'amount'        => $transferData->amount,
                                'fromAccount'   => $transferData->counterAccountNumber,
                                'reference'     => $transferData->reference,
                                'reason'        => 'duplicate_transfer',
                            ]);
                            break;
                        case 'reversed_internal':
                            $skippedReversedInternal++;
                            $this->logger->info('Cancelled reversed internal transfer pair', [
                                'source' => $csvSource,
                                'line'   => $lineNum,
                                'date'   => $transferData->date->format('Y-m-d'),
                                'amount' => $transferData->amount,
                                'reason' => 'reversed_internal_transfer',
                            ]);
                            break;
                    }
                } catch (Throwable $e) {
                    $skippedInvalidData++;
                    $message  = sprintf('Line %d: %s', $lineNum, $e->getMessage());
                    $errors[] = $message;
                    $this->logger->error('Failed to import CSV row', [
                        'source'        => $csvSource,
                        'line'          => $lineNum,
                        'error'         => $e->getMessage(),
                        'exception'     => $e,
                        'reason'        => 'processing_error',
                        'transactionId' => $transferData->transactionId,
                        'date'          => $transferData->date->format('Y-m-d'),
                        'amount'        => $transferData->amount,
                        'counterparty'  => $transferData->counterAccountNumber,
                        'reference'     => $transferData->reference,
                    ]);
                }
            }
        } finally {
            fclose($handle);
        }

        $this->logger->info('CSV import finished', [
            'source'                  => $csvSource,
            'imported'                => $imported,
            'skippedDuplicates'       => $skippedDuplicates,
            'skippedReversedInternal' => $skippedReversedInternal,
            'skippedInvalidData'      => $skippedInvalidData,
            'errors'                  => count($errors),
        ]);

        return [
            'imported'                => $imported,
            'skippedDuplicates'       => $skippedDuplicates,
            'skippedReversedInternal' => $skippedReversedInternal,
            'skippedInvalidData'      => $skippedInvalidData,
            'errors'                  => $errors,
        ];
    }

    /**
     * Find the extractor that supports the given bank type.
     *
     * @throws InvalidArgumentException When no extractor is registered for the bank type.
     */
    private function findExtractor(string $bankType): BankExtractorInterface
    {
        foreach ($this->extractors as $extractor) {
            if ($extractor->supports($bankType)) {
                return $extractor;
            }
        }

        throw new InvalidArgumentException(sprintf(
            'Unsupported bank type: "%s". Registered extractors support: %s.',
            $bankType,
            implode(', ', array_map(
                static fn (BankExtractorInterface $bankExtractor): string => $bankExtractor::class,
                $this->extractors,
            )),
        ));
    }

    /**
     * Apply business logic to a single extracted transfer row.
     *
     * Returns one of:
     *   'imported'          – the transfer was persisted
     *   'duplicate'         – a transfer with the same fingerprint already exists
     *   'reversed_internal' – both accounts are internal and the reversed transfer was cancelled out
     *
     * @return 'imported'|'duplicate'|'reversed_internal'
     */
    private function processTransferData(BankTransferData $bankTransferData, string $csvSource): string
    {
        // Positive amount → money IN → counterparty is sender (from), own account is receiver (to)
        // Negative amount → money OUT → own account is sender (from), counterparty is receiver (to)
        $amountFloat = (float) $bankTransferData->amount;
        if ($amountFloat >= 0) {
            $fromAccountNo   = $bankTransferData->counterAccountNumber;
            $fromAccountName = $bankTransferData->counterAccountName;
            $toAccountNo     = $bankTransferData->ownAccountNumber;
            $toAccountName   = null;
            $fromIsInternal  = false;
            $toIsInternal    = true;
        } else {
            $fromAccountNo   = $bankTransferData->ownAccountNumber;
            $fromAccountName = null;
            $toAccountNo     = $bankTransferData->counterAccountNumber;
            $toAccountName   = $bankTransferData->counterAccountName;
            $fromIsInternal  = true;
            $toIsInternal    = false;
        }

        $bankAccount = $this->getOrCreateBankAccount($fromAccountNo, $fromAccountName, $fromIsInternal);
        $toAccount   = $this->getOrCreateBankAccount($toAccountNo, $toAccountName, $toIsInternal);

        $transfer = new Transfer();
        $transfer->setAmount($bankTransferData->amount);
        $transfer->setDate($bankTransferData->date);
        $transfer->setFromAccount($bankAccount);
        $transfer->setToAccount($toAccount);
        $transfer->setReference($bankTransferData->reference);
        $transfer->setCsvSource($csvSource);

        if ($bankTransferData->transactionId !== null) {
            $transfer->setTransactionId($bankTransferData->transactionId);
        }

        $fingerprint = $this->generateFingerprint(
            $bankTransferData->date,
            $bankTransferData->amount,
            (string) $fromAccountNo,
            (string) $toAccountNo,
            $bankTransferData->reference,
        );
        $transfer->setFingerprint($fingerprint);

        $isInternal = $bankAccount->isInternal() && $toAccount->isInternal();
        $transfer->setIsInternal($isInternal);

        // If both accounts are internal and a mirror transfer already exists, mark both as reversed.
        if (
            $isInternal && $this->transferService->markReversedInternalTransfer(
                $bankAccount,
                $toAccount,
                $bankTransferData->amount,
                $bankTransferData->date,
            )
        ) {
            // Persist B as reversed so re-importing the same CSV is idempotent.
            $transfer->setIsReversed(true);
            $this->transferService->saveTransfer($transfer);

            return 'reversed_internal';
        }

        $saved = $this->transferService->saveTransfer($transfer);

        if ($saved) {
            // from account always loses |amount|, to account always gains |amount|
            $absAmount = ltrim($bankTransferData->amount, '-');
            assert(is_numeric($absAmount));
            $this->updateAccountBalance($bankAccount, bcsub('0', $absAmount, 2));
            $this->updateAccountBalance($toAccount, $absAmount);

            if (! $isInternal) {
                $this->labelingService->autoLabel($transfer);
            }
        }

        return $saved ? 'imported' : 'duplicate';
    }

    private function getOrCreateBankAccount(
        string|null $accountNumber,
        string|null $accountName,
        bool $isInternal,
    ): BankAccount {
        $normalizedNumber = $accountNumber !== null && $accountNumber !== '' ? $accountNumber : null;
        $normalizedName   = $accountName !== null && $accountName !== '' ? $accountName : null;

        $hash = BankAccount::calculateHash($normalizedName, $normalizedNumber);

        // Check in-memory cache first to avoid a DB round-trip per row
        if (isset($this->accountCache[$hash])) {
            $account = $this->accountCache[$hash];

            $this->upgradeAccount($account, $normalizedName, $isInternal);

            return $account;
        }

        $account = $this->bankAccountRepository->findByHash($hash);

        if ($account instanceof BankAccount) {
            $this->upgradeAccount($account, $normalizedName, $isInternal);

            $this->accountCache[$hash] = $account;

            return $account;
        }

        $account = new BankAccount();
        $account->setAccountNumber($normalizedNumber);
        $account->setAccountName($normalizedName);
        $account->setHash($hash);
        $account->setIsInternal($isInternal);

        $this->bankAccountRepository->save($account, true);

        $this->accountCache[$hash] = $account;

        return $account;
    }

    /**
     * Enrich an existing account in-place when we learn new information about it:
     *   - Backfill the name when it was previously unknown.
     *   - Promote to internal when the own-account CSV is processed.
     */
    private function upgradeAccount(BankAccount $bankAccount, string|null $normalizedName, bool $isInternal): void
    {
        $dirty = false;

        if ($normalizedName !== null && $bankAccount->getAccountName() === null) {
            $bankAccount->setAccountName($normalizedName);
            $dirty = true;
        }

        if ($isInternal && ! $bankAccount->isInternal()) {
            $bankAccount->setIsInternal(true);
            $dirty = true;
        }

        if (! $dirty) {
            return;
        }

        $this->bankAccountRepository->save($bankAccount, true);
    }

    /** @param numeric-string $amount */
    private function updateAccountBalance(BankAccount $bankAccount, string $amount): void
    {
        $newBalance = bcadd($bankAccount->getTotalBalance(), $amount, 2);
        $bankAccount->setTotalBalance($newBalance);
        // No explicit flush here: the entity is already managed by Doctrine, so the
        // balance change will be committed together with the transfer in saveTransfer().
        $this->bankAccountRepository->save($bankAccount);
    }

    private function generateFingerprint(
        DateTimeImmutable $date,
        string $amount,
        string $fromAccount,
        string $toAccount,
        string $reference,
    ): string {
        // For transfers with a known counter IBAN the account number alone makes
        // the record unique together with date + amount; omitting the reference
        // makes the fingerprint identical regardless of whether the data came from
        // a Belfius CSV or a Belfius PDF (where the reference text differs).
        //
        // For card payments there is no counter IBAN, so we include a *normalised*
        // version of the reference to distinguish e.g. two coffee purchases of the
        // same price at the same merchant on the same day.  Normalisation:
        //   1. Strip the Belfius-CSV-specific "REF. : … VAL. … BE… " trailer.
        //   2. Collapse runs of whitespace (pdftotext layout artefacts) to one space.
        //   3. Trim.
        $normalizedReference = '';
        if ($toAccount === '') {
            $normalized          = preg_replace('/\s*REF\.\s*:.*$/i', '', $reference) ?? '';
            $normalized          = preg_replace('/\s+/', ' ', $normalized) ?? '';
            $normalizedReference = trim($normalized);
        }

        $data = sprintf(
            '%s|%s|%s|%s|%s',
            $date->format('Y-m-d'),
            $amount,
            $fromAccount,
            $toAccount,
            $normalizedReference,
        );

        return hash('sha256', $data);
    }
}
