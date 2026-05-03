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

use function array_merge;
use function assert;
use function bcadd;
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
     * Also applies all parent labels in the hierarchy.
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

        // Get all labels to apply (the label + all its parents)
        $labelsToApply = $this->getAllLabelsInHierarchy($label);

        $updated = [];
        foreach ($transferIds as $transferId) {
            $transfer = $this->transferRepository->find(Uuid::fromRfc4122($transferId));
            if (! $transfer instanceof Transfer) {
                continue;
            }

            // Apply all labels in the hierarchy
            foreach ($labelsToApply as $labelToApply) {
                // Only add if not already linked
                if ($transfer->hasLabel($labelToApply)) {
                    continue;
                }

                $link = new LabelTransferLink();
                $link->setLabel($labelToApply);
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
     * Get all labels in the hierarchy (the label + all its parents).
     *
     * @return array<Label>
     */
    private function getAllLabelsInHierarchy(Label $label): array
    {
        $labels = [$label];
        $parent = $label->getParentLabel();

        while ($parent instanceof Label) {
            $labels[] = $parent;
            $parent   = $parent->getParentLabel();
        }

        return $labels;
    }

    /**
     * Remove a label to multiple transfers.
     * Also removes all child labels in the hierarchy.
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

        // Get all labels to remove (the label + all its children)
        $labelsToRemove = $this->getAllLabelsInHierarchyWithChildren($label);

        $updated = [];
        foreach ($transferIds as $transferId) {
            $transfer = $this->transferRepository->find(Uuid::fromRfc4122($transferId));
            if (! $transfer instanceof Transfer) {
                continue;
            }

            // Remove all labels in the hierarchy
            foreach ($labelsToRemove as $labelToRemove) {
                $link = $transfer->getLinkForLabel($labelToRemove);
                if (! ($link instanceof LabelTransferLink)) {
                    continue;
                }

                $transfer->removeLabelLink($link);
                $this->entityManager->remove($link);
            }

            $updated[] = $transfer;
        }

        $this->entityManager->flush();

        return $updated;
    }

    /**
     * Get all labels in the hierarchy with children (the label + all its children recursively).
     *
     * @return array<Label>
     */
    private function getAllLabelsInHierarchyWithChildren(Label $label): array
    {
        $labels = [$label];

        // Add all children recursively
        foreach ($label->getChildLabels() as $childLabel) {
            $labels = array_merge($labels, $this->getAllLabelsInHierarchyWithChildren($childLabel));
        }

        return $labels;
    }

    /**
     * Mark multiple transfers as refunds of a parent transfer.
     * - Saves amountBeforeRefund on first link.
     * - Recalculates parent amount = amountBeforeRefund - sum(child amounts).
     * - Supports re-linking: if a child already has a different parent, it is
     *   detached from the old parent (old parent amount is restored) and linked here.
     * - Validates: no self-link, no duplicate link to the same parent.
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

        // Snapshot original amount before any refunds were ever applied
        if ($parentTransfer->getAmountBeforeRefund() === null) {
            $parentTransfer->setAmountBeforeRefund($parentTransfer->getAmount());
        }

        $originalAmount = $parentTransfer->getAmountBeforeRefund();
        assert($originalAmount !== null);

        $updated = [];
        foreach ($transferIds as $transferId) {
            if ($transferId === $parentTransferId) {
                $msg = 'Refund link skipped: transfer cannot be its own parent';
                $this->logger->warning($msg, ['transferId' => $transferId]);
                continue;
            }

            $transfer = $this->transferRepository->find(Uuid::fromRfc4122($transferId));
            if (! $transfer instanceof Transfer) {
                continue;
            }

            $existingParent = $transfer->getParentTransfer();

            // Already a child of THIS parent — no change needed
            if ($existingParent instanceof Transfer && (string) $existingParent->getId() === $parentTransferId) {
                $this->logger->info('Refund link skipped: already a child of this parent', [
                    'transferId'      => $transferId,
                    'parentTransferId' => $parentTransferId,
                ]);
                continue;
            }

            // Detach from old parent and restore its amount
            if ($existingParent instanceof Transfer) {
                $this->logger->info('Re-linking refund: detaching from old parent', [
                    'transferId'       => $transferId,
                    'oldParentId'      => $existingParent->getId()?->toRfc4122(),
                    'newParentId'      => $parentTransferId,
                ]);
                $existingParent->removeChildRefund($transfer);
                $this->restoreParentAmount($existingParent);
            }

            // Use addChildRefund so the in-memory childRefunds collection on the parent
            // is immediately updated — otherwise getChildRefunds() (called below to
            // recalculate the new amount) would miss the newly-added children.
            $parentTransfer->addChildRefund($transfer);
            $updated[] = $transfer;

            $this->logger->info('Refund linked to parent transfer', [
                'refundTransferId' => $transferId,
                'parentTransferId' => $parentTransferId,
                'refundAmount'     => $transfer->getAmount(),
            ]);
        }

        // Recalculate new parent amount: originalAmount + sum of all child amounts (children are negative)
        $newAmount = $originalAmount;
        foreach ($parentTransfer->getChildRefunds() as $childRefund) {
            $newAmount = bcadd($newAmount, $childRefund->getAmount(), 2);
        }

        $this->logger->info('Parent transfer amount recalculated after refund linking', [
            'parentTransferId'   => $parentTransferId,
            'originalAmount'     => $originalAmount,
            'recalculatedAmount' => $newAmount,
            'refundCount'        => $parentTransfer->getChildRefunds()->count(),
        ]);

        $parentTransfer->setAmount($newAmount);

        $this->entityManager->flush();

        return $updated;
    }

    /**
     * Mark or unmark multiple transfers as internal.
     *
     * @param array<string> $transferIds
     *
     * @return array<Transfer>
     */
    public function bulkMarkInternal(array $transferIds, bool $isInternal): array
    {
        $updated = [];
        foreach ($transferIds as $transferId) {
            $transfer = $this->transferRepository->find(Uuid::fromRfc4122($transferId));
            if (! $transfer instanceof Transfer) {
                continue;
            }

            $transfer->setIsInternal($isInternal);
            $updated[] = $transfer;

            $this->logger->info('Transfer internal flag updated', [
                'transferId' => $transferId,
                'isInternal' => $isInternal,
            ]);
        }

        $this->entityManager->flush();

        return $updated;
    }

    /**
     * Remove refund links from child transfers, restoring their parent's amount.
     * Transfers that are not a refund child are silently skipped.
     * If all children of a parent are removed, the parent amount is fully restored
     * and amountBeforeRefund is cleared.
     *
     * @param array<string> $transferIds
     *
     * @return array<Transfer>
     */
    public function bulkRemoveRefund(array $transferIds): array
    {
        /** @var array<string, Transfer> $parentsToRestore */
        $parentsToRestore = [];
        $updated          = [];

        foreach ($transferIds as $transferId) {
            $transfer = $this->transferRepository->find(Uuid::fromRfc4122($transferId));
            if (! $transfer instanceof Transfer) {
                continue;
            }

            $parent = $transfer->getParentTransfer();
            if (! $parent instanceof Transfer) {
                $this->logger->info('Remove refund skipped: transfer has no parent', ['transferId' => $transferId]);
                continue;
            }

            $parent->removeChildRefund($transfer);
            $parentsToRestore[(string) $parent->getId()] = $parent;
            $updated[]                                   = $transfer;

            $this->logger->info('Refund link removed from transfer', [
                'transferId' => $transferId,
                'parentId'   => (string) $parent->getId(),
            ]);
        }

        foreach ($parentsToRestore as $parentToRestore) {
            $this->restoreParentAmount($parentToRestore);
        }

        $this->entityManager->flush();

        return $updated;
    }

    /**
     * Restore a parent transfer's amount from its amountBeforeRefund snapshot,     *
     * then subtract all remaining children.
     * Called when a child is detached from this parent.
     */
    private function restoreParentAmount(Transfer $transfer): void
    {
        $original = $transfer->getAmountBeforeRefund();
        if ($original === null) {
            return; // Nothing to restore
        }

        $restored = $original;
        foreach ($transfer->getChildRefunds() as $childRefund) {
            $restored = bcadd($restored, $childRefund->getAmount(), 2);
        }

        // If no children remain, clear the snapshot so it can be re-set cleanly next time
        if (! $transfer->getChildRefunds()->isEmpty()) {
            $transfer->setAmount($restored);

            return;
        }

        $transfer->setAmount($original);
        $transfer->setAmountBeforeRefund(null);
    }
}
