<?php

declare(strict_types=1);

namespace App\EventListener;

use App\Entity\Label;
use App\Service\LabelTransferSyncService;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsDoctrineListener;
use Doctrine\ORM\Event\OnFlushEventArgs;
use Doctrine\ORM\Events;
use Psr\Log\LoggerInterface;
use Symfony\Component\Uid\Uuid;
use Throwable;

use function in_array;

/**
 * T036 [Phase 7]: Event-driven trigger for label-transfer sync on bank account unlink.
 *
 * Listens for Doctrine onFlush events and detects when a bank account is removed
 * from a label's linkedBankAccounts collection.
 * On detection, enqueues a sync for the affected label using LabelTransferSyncService.
 */
#[AsDoctrineListener(event: Events::onFlush)]
class LabelUnlinkListener
{
    /** @var array<string> UUIDs of labels that need sync after flush */
    private array $labelsToSync = [];

    public function __construct(
        private readonly LabelTransferSyncService $labelTransferSyncService,
        private readonly LoggerInterface $logger,
    ) {
    }

    public function onFlush(OnFlushEventArgs $onFlushEventArgs): void
    {
        $entityManager = $onFlushEventArgs->getObjectManager();
        $unitOfWork    = $entityManager->getUnitOfWork();

        // Detect bank account unlinking from labels via collection deletions
        foreach ($unitOfWork->getScheduledCollectionDeletions() as $scheduledCollectionUpdate) {
            $owner = $scheduledCollectionUpdate->getOwner();
            if (! $owner instanceof Label) {
                continue;
            }

            $labelId = $owner->getId();
            if (! $labelId instanceof Uuid) {
                continue;
            }

            $labelIdStr = $labelId->toRfc4122();

            // Only schedule if not already queued
            if (in_array($labelIdStr, $this->labelsToSync, true)) {
                continue;
            }

            $this->labelsToSync[] = $labelIdStr;

            $this->logger->info('LabelUnlinkListener: Detected bank account unlink from label, scheduling sync', [
                'labelId' => $labelIdStr,
                'labelName' => $owner->getName(),
            ]);
        }

        // Also detect updates to existing collections (bank accounts added/removed)
        foreach ($unitOfWork->getScheduledCollectionUpdates() as $scheduledCollectionUpdate) {
            $owner = $scheduledCollectionUpdate->getOwner();
            if (! $owner instanceof Label) {
                continue;
            }

            $labelId = $owner->getId();
            if (! $labelId instanceof Uuid) {
                continue;
            }

            $labelIdStr = $labelId->toRfc4122();
            if (in_array($labelIdStr, $this->labelsToSync, true)) {
                continue;
            }

            $this->labelsToSync[] = $labelIdStr;

            $this->logger->info(
                'LabelUnlinkListener: Detected bank account collection change for label, scheduling sync',
                [
                    'labelId'   => $labelIdStr,
                    'labelName' => $owner->getName(),
                ],
            );
        }
    }

    /**
     * Execute pending syncs after the flush has completed.
     * Called by LabelStateProcessor after saving to avoid nested transaction issues.
     *
     * @param array<Label> $labels
     */
    public function executePendingSyncs(array $labels): void
    {
        if ($this->labelsToSync === []) {
            return;
        }

        $toSync             = $this->labelsToSync;
        $this->labelsToSync = [];

        $labelsMap = [];
        foreach ($labels as $label) {
            $id = $label->getId();
            if ($id === null) {
                continue;
            }

            $labelsMap[$id->toRfc4122()] = $label;
        }

        $labelsToProcess = [];
        foreach ($toSync as $labelId) {
            if (! isset($labelsMap[$labelId])) {
                continue;
            }

            $labelsToProcess[] = $labelsMap[$labelId];
        }

        if ($labelsToProcess === []) {
            return;
        }

        try {
            $this->labelTransferSyncService->syncTransferLinksForLabels($labelsToProcess);
        } catch (Throwable $throwable) {
            $this->logger->error('LabelUnlinkListener: Failed to sync transfer links', [
                'error' => $throwable->getMessage(),
                'labelIds' => $toSync,
            ]);
        }
    }
}
