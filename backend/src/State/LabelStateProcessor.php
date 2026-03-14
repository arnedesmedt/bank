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
use App\Service\LabelTransferSyncService;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Uid\Uuid;

use function is_string;

/** @implements ProcessorInterface<LabelApiResource, LabelApiResource> */
class LabelStateProcessor implements ProcessorInterface
{
    public function __construct(
        private readonly LabelRepository $labelRepository,
        private readonly EntityMapper $entityMapper,
        private readonly LabelTransferSyncService $labelTransferSyncService,
        private readonly LabelUnlinkListener $labelUnlinkListener,
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

        $this->entityMapper->mapDtoToLabel($data, $label);
        $this->labelRepository->save($label, true);

        // T034/T035/T036: Atomically sync transfer-label links via LabelTransferSyncService.
        // The LabelUnlinkListener detected any bank account collection changes during flush;
        // we now trigger the transactional sync for the affected labels.
        $this->labelTransferSyncService->syncTransferLinksForLabel($label);

        // Notify listener to process any pending syncs (including those triggered by collection events)
        $this->labelUnlinkListener->executePendingSyncs([$label]);

        return $this->entityMapper->mapLabelToDto($label);
    }
}
