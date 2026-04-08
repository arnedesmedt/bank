<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\ApiResource\LabelApiResource;
use App\Entity\Label;
use App\EventListener\LabelUnlinkListener;
use App\Repository\LabelRepository;
use App\Service\EntityMapper;
use App\Service\LabelingService;
use App\Service\LabelTransferSyncService;
use Psr\Log\LoggerInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Uid\Uuid;

use function array_map;
use function is_string;

/** @implements ProcessorInterface<LabelApiResource, LabelApiResource> */
class LabelStateProcessor implements ProcessorInterface
{
    public function __construct(
        private readonly LabelRepository $labelRepository,
        private readonly EntityMapper $entityMapper,
        private readonly LabelTransferSyncService $labelTransferSyncService,
        private readonly LabelUnlinkListener $labelUnlinkListener,
        private readonly LabelingService $labelingService,
        private readonly LoggerInterface $logger,
    ) {
    }

    /**
     * @param array<string, mixed> $uriVariables
     * @param array<string, mixed> $context
     */
    public function process(
        mixed $data,
        Operation $operation,
        array $uriVariables = [],
        array $context = [],
    ): LabelApiResource {
        $id = $uriVariables['id'] ?? null;

        if ($id !== null && is_string($id)) {
            // Update existing
            $label = $this->labelRepository->find(Uuid::fromRfc4122($id));
            if (! $label instanceof Label) {
                throw new NotFoundHttpException('Label not found');
            }
        } else {
            // Create new
            $label = new Label();
        }

        $result        = $this->entityMapper->mapDtoToLabel($data, $label);
        $label         = $result['label'];
        $parentChanged = $result['parentChanged'];
        $newParent     = $result['newParent'];
        $childChanges  = $result['childChanges'];

        // Log the changes detected
        $this->logger->info('Label update detected', [
            'labelId' => $label->getId()?->toRfc4122(),
            'labelName' => $label->getName(),
            'parentChanged' => $parentChanged,
            'newParent' => $newParent?->getName(),
            'newParentId' => $newParent?->getId()?->toRfc4122(),
            'childChanges' => [
                'added' => array_map(static fn ($l): string => $l->getName(), $childChanges['added'] ?? []),
                'removed' => array_map(static fn ($l): string => $l->getName(), $childChanges['removed'] ?? []),
            ],
        ]);

        $this->labelRepository->save($label, true);

        // T034/T035/T036: Atomically sync transfer-label links via LabelTransferSyncService.
        // The LabelUnlinkListener detected any bank account collection changes during flush;
        // we now trigger the transactional sync for the affected labels.
        $this->labelTransferSyncService->syncTransferLinksForLabel($label);

        // If parent label was assigned, propagate it to existing transfers that have this label
        if ($parentChanged && $newParent instanceof Label) {
            $this->logger->info('Triggering parent propagation due to parent change', [
                'label' => $label->getName(),
                'newParent' => $newParent->getName(),
            ]);
            $this->labelingService->propagateParentLabelToExistingTransfers($label, $newParent);
        } elseif (! $parentChanged && $newParent instanceof Label) {
            // If parent label exists but no change was detected, check if propagation is needed
            $this->logger->info('Checking if parent propagation is needed for existing parent', [
                'label' => $label->getName(),
                'existingParent' => $newParent->getName(),
            ]);

            // Check if any transfers with this label are missing the parent label
            $this->labelingService->propagateParentLabelToExistingTransfers($label, $newParent);
        }

        // If child labels were added, propagate this parent label to existing transfers of those children
        foreach ($childChanges['added'] as $childLabel) {
            $this->logger->info('Triggering parent propagation due to child label addition', [
                'parentLabel' => $label->getName(),
                'childLabel' => $childLabel->getName(),
            ]);
            $this->labelingService->propagateParentLabelToExistingTransfers($childLabel, $label);
        }

        // Notify listener to process any pending syncs (including those triggered by collection events)
        $this->labelUnlinkListener->executePendingSyncs([$label]);

        return $this->entityMapper->mapLabelToDto($label);
    }
}
