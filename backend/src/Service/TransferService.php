<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\BankAccount;
use App\Entity\Label;
use App\Entity\LabelTransferLink;
use App\Entity\Transfer;
use App\Repository\BankAccountRepository;
use App\Repository\LabelRepository;
use App\Repository\TransferRepository;
use DateTimeImmutable;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use InvalidArgumentException;
use Psr\Log\LoggerInterface;
use Symfony\Component\Uid\Uuid;

use function bcsub;
use function ltrim;

class TransferService
{
    public function __construct(
        private readonly TransferRepository $transferRepository,
        private readonly BankAccountRepository $bankAccountRepository,
        private readonly LabelRepository $labelRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly LoggerInterface $logger,
    ) {
    }

    /**
     * Save transfer with idempotency check.
     * Returns true if transfer was saved, false if it was a duplicate.
     */
    public function saveTransfer(Transfer $transfer): bool
    {
        // Check for duplicate by fingerprint only (transaction ID uniqueness removed)
        $existing = $this->transferRepository->findByFingerprint($transfer->getFingerprint());
        if ($existing instanceof Transfer) {
            $this->logger->warning('Duplicate transfer detected by fingerprint', [
                'newTransferUuid' => $transfer->getId()?->toRfc4122(),
                'existingTransferUuid' => $existing->getId()?->toRfc4122(),
                'fingerprint' => $transfer->getFingerprint(),
                'amount' => $transfer->getAmount(),
                'date' => $transfer->getDate()->format('Y-m-d'),
                'fromAccount' => $transfer->getFromAccount()->getAccountNumber(),
                'toAccount' => $transfer->getToAccount()->getAccountNumber(),
                'csvSource' => $transfer->getCsvSource(),
                'duplicateType' => 'fingerprint',
            ]);

            return false; // Duplicate found
        }

        try {
            $this->transferRepository->save($transfer, true);

            $this->logger->debug('Transfer successfully saved', [
                'transferUuid' => $transfer->getId()?->toRfc4122(),
                'transactionId' => $transfer->getTransactionId(),
                'amount' => $transfer->getAmount(),
                'date' => $transfer->getDate()->format('Y-m-d'),
                'csvSource' => $transfer->getCsvSource(),
            ]);

            return true;
        } catch (UniqueConstraintViolationException $uniqueConstraintViolationException) {
            // Race condition: another process saved the same transfer
            $this->logger->warning('Duplicate transfer detected by database constraint (race condition)', [
                'transferUuid' => $transfer->getId()?->toRfc4122(),
                'transactionId' => $transfer->getTransactionId(),
                'fingerprint' => $transfer->getFingerprint(),
                'amount' => $transfer->getAmount(),
                'date' => $transfer->getDate()->format('Y-m-d'),
                'csvSource' => $transfer->getCsvSource(),
                'duplicateType' => 'database_constraint',
                'error' => $uniqueConstraintViolationException->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * T018: Find and delete the reversed internal transfer, reversing its balance impact.
     *
     * When a new internal transfer matches a previously saved reversed internal transfer
     * (same amount negated, same date, accounts switched), we must:
     * 1. Undo the balance updates that were applied when the reversed transfer was saved.
     * 2. Delete the reversed transfer from the database.
     *
     * This ensures "neither transfer is persisted" per the spec.
     * Returns true if a reversed transfer was found and deleted, false otherwise.
     */
    public function deleteReversedInternalTransfer(
        BankAccount $fromAccount,
        BankAccount $toAccount,
        string $amount,
        DateTimeImmutable $date,
    ): bool {
        $reversed = $this->transferRepository->findReversedInternalTransfer(
            $fromAccount,
            $toAccount,
            $amount,
            $date,
        );
        if (! $reversed instanceof Transfer) {
            return false;
        }

        // Undo balance updates for the reversed transfer.
        $bankAccount       = $reversed->getFromAccount();
        $reversedToAccount = $reversed->getToAccount();
        $reversedAmount    = $reversed->getAmount();
        $absReversedAmount = ltrim($reversedAmount, '-');
        // Restore from-account (give back what it lost)
        $bankAccount->adjustBalance($absReversedAmount);
        $this->bankAccountRepository->save($bankAccount, true);
        // Restore to-account (take back what it gained)
        $reversedToAccount->adjustBalance(bcsub('0', $absReversedAmount, 2));
        $this->bankAccountRepository->save($reversedToAccount, true);
        $this->transferRepository->remove($reversed, true);

        return true;
    }

    // ── Bulk Action Methods ────────────────────────────────────────────────────

    /**
     * Apply a label to multiple transfers (manual assignment).
     *
     * @param array<string> $transferIds
     *
     * @return array<Transfer>
     */
    public function bulkApplyLabel(array $transferIds, string $labelId): array
    {
        $label = $this->labelRepository->find(Uuid::fromRfc4122($labelId));
        if (! $label instanceof Label) {
            throw new InvalidArgumentException('Label not found: ' . $labelId);
        }

        $updated = [];
        foreach ($transferIds as $transferId) {
            $transfer = $this->transferRepository->find(Uuid::fromRfc4122($transferId));
            if (! $transfer instanceof Transfer) {
                continue;
            }

            // Only add if not already linked
            if (! $transfer->hasLabel($label)) {
                $link = new LabelTransferLink();
                $link->setLabel($label);
                $link->setTransfer($transfer);
                $link->setIsManual(true);
                $this->entityManager->persist($link);
                $transfer->addLabelLink($link);
            }

            $updated[] = $transfer;
        }

        $this->entityManager->flush();

        return $updated;
    }

    /**
     * Remove a label from multiple transfers.
     *
     * @param array<string> $transferIds
     *
     * @return array<Transfer>
     */
    public function bulkRemoveLabel(array $transferIds, string $labelId): array
    {
        $label = $this->labelRepository->find(Uuid::fromRfc4122($labelId));
        if (! $label instanceof Label) {
            throw new InvalidArgumentException('Label not found: ' . $labelId);
        }

        $updated = [];
        foreach ($transferIds as $transferId) {
            $transfer = $this->transferRepository->find(Uuid::fromRfc4122($transferId));
            if (! $transfer instanceof Transfer) {
                continue;
            }

            $link = $transfer->getLinkForLabel($label);
            if ($link instanceof LabelTransferLink) {
                $transfer->removeLabelLink($link);
                $this->entityManager->remove($link);
            }

            $updated[] = $transfer;
        }

        $this->entityManager->flush();

        return $updated;
    }

    /**
     * Mark multiple transfers as refunds of a parent transfer.
     *
     * @param array<string> $transferIds
     *
     * @return array<Transfer>
     */
    public function bulkMarkRefund(array $transferIds, string $parentTransferId): array
    {
        $parentTransfer = $this->transferRepository->find(Uuid::fromRfc4122($parentTransferId));
        if (! $parentTransfer instanceof Transfer) {
            throw new InvalidArgumentException('Parent transfer not found: ' . $parentTransferId);
        }

        $updated = [];
        foreach ($transferIds as $transferId) {
            if ($transferId === $parentTransferId) {
                continue; // Cannot be its own parent
            }

            $transfer = $this->transferRepository->find(Uuid::fromRfc4122($transferId));
            if (! $transfer instanceof Transfer) {
                continue;
            }

            $transfer->setParentTransfer($parentTransfer);
            $updated[] = $transfer;
        }

        $this->entityManager->flush();

        return $updated;
    }

    /**
     * Remove refund link from multiple transfers (orphan refunds gracefully).
     *
     * @param array<string> $transferIds
     *
     * @return array<Transfer>
     */
    public function bulkRemoveRefund(array $transferIds): array
    {
        $updated = [];
        foreach ($transferIds as $transferId) {
            $transfer = $this->transferRepository->find(Uuid::fromRfc4122($transferId));
            if (! $transfer instanceof Transfer) {
                continue;
            }

            $transfer->setParentTransfer(null);
            $updated[] = $transfer;
        }

        $this->entityManager->flush();

        return $updated;
    }
}
