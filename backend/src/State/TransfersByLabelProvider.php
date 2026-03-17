<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\TransferApiResource;
use App\Entity\Label;
use App\Repository\LabelRepository;
use App\Service\EntityMapper;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Uid\Uuid;

use function array_map;
use function is_string;

/**
 * T024 [US2]: Provides the list of transfers linked to a specific label.
 *
 * Route: GET /api/labels/{id}/transfers
 * Returns the transfers that have this label assigned (manual or automatic).
 *
 * @implements ProviderInterface<TransferApiResource>
 */
class TransfersByLabelProvider implements ProviderInterface
{
    public function __construct(
        private readonly LabelRepository $labelRepository,
        private readonly EntityMapper $entityMapper,
    ) {
    }

    /**
     * @param array<string, mixed> $uriVariables
     * @param array<string, mixed> $context
     *
     * @return array<TransferApiResource>
     */
    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        $id = $uriVariables['id'] ?? null;
        if (! is_string($id)) {
            throw new NotFoundHttpException('Label not found');
        }

        $label = $this->labelRepository->find(Uuid::fromRfc4122($id));
        if (! $label instanceof Label) {
            throw new NotFoundHttpException('Label not found');
        }

        // Get transfers from label transfer links
        $transfers = [];
        foreach ($label->getLabelTransferLinks() as $labelTransferLink) {
            $transfers[] = $labelTransferLink->getTransfer();
        }

        return array_map(
            $this->entityMapper->mapTransferToDto(...),
            $transfers,
        );
    }
}
