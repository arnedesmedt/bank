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
     * Find the mirror of an internal transfer, mark it as reversed, and undo its balance impact.
     *
     * Both legs of a reversed internal pair are kept in the database so that
     * re-importing the same CSV files is fully idempotent (fingerprint uniqueness
     * prevents re-insertion).  Neither leg appears in normal queries because
     * all collection methods filter on isReversed = false.
     *
     * Returns true if a (non-yet-reversed) mirror was found and marked, false otherwise.
     *
     * @param numeric-string $amount
     */
    public function markReversedInternalTransfer(
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

        // Undo balance updates that were applied when the first leg was saved.
        $bankAccount = $reversed->getFromAccount();
        $reversedTo  = $reversed->getToAccount();
        $absAmount   = ltrim($reversed->getAmount(), '-');
        // Give back what the from-account lost.
        $bankAccount->adjustBalance($absAmount);
        $this->bankAccountRepository->save($bankAccount, true);
        // Take back what the to-account gained.
        $reversedTo->adjustBalance(bcsub('0', $absAmount, 2));
        $this->bankAccountRepository->save($reversedTo, true);

        // Mark the first leg as reversed and persist it (no delete).
        $reversed->setIsReversed(true);
        $this->transferRepository->save($reversed, true);

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
