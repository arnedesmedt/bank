<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Label;
use Doctrine\ORM\EntityManagerInterface;

/**
 * T034/T035 [Phase 7]: Atomic, transactional sync of label-transfer links
 * when a bank account is unlinked from a label.
 *
 * Ensures that when a label loses a linked bank account, all affected transfers
 * have their automatic label associations updated within a single database transaction.
 * Manual label links are always preserved.
 */
class LabelTransferSyncService
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly LabelingService $labelingService,
    ) {
    }

    /**
     * Re-evaluate all transfer-label links for the given label atomically.
     *
     * Called after a label's bank account links are changed (add or remove).
     * Wraps all DB writes in a transaction so no partial updates can occur.
     */
    public function syncTransferLinksForLabel(Label $label): void
    {
        // If already inside a transaction, let the caller manage it
        $alreadyInTransaction = $this->entityManager->getConnection()->isTransactionActive();

        if ($alreadyInTransaction) {
            $this->doSync($label);

            return;
        }

        $this->entityManager->wrapInTransaction(function () use ($label): void {
            $this->doSync($label);
        });
    }

    /**
     * Re-evaluate all transfer-label links for multiple labels atomically.
     *
     * @param array<Label> $labels
     */
    public function syncTransferLinksForLabels(array $labels): void
    {
        if ($labels === []) {
            return;
        }

        $alreadyInTransaction = $this->entityManager->getConnection()->isTransactionActive();

        if ($alreadyInTransaction) {
            foreach ($labels as $label) {
                $this->doSync($label);
            }

            return;
        }

        $this->entityManager->wrapInTransaction(function () use ($labels): void {
            foreach ($labels as $label) {
                $this->doSync($label);
            }
        });
    }

    private function doSync(Label $label): void
    {
        $this->labelingService->autoAssignLabelToAllTransfers($label);
    }
}
