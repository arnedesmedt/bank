<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\ApiResource\TransferApiResource;
use App\Entity\Label;
use App\Entity\Transfer;
use App\Repository\LabelRepository;
use App\Repository\TransferRepository;
use App\Service\EntityMapper;
use App\Service\LabelingService;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Uid\Uuid;

use function is_string;

/**
 * Handles manual label assignment/removal for a transfer.
 * POST /api/transfers/{id}/labels/{labelId}  → assign label (manual)
 * DELETE /api/transfers/{id}/labels/{labelId} → remove label (explicit)
 *
 * @implements ProcessorInterface<null, TransferApiResource>
 */
class TransferLabelProcessor implements ProcessorInterface
{
    public function __construct(
        private readonly TransferRepository $transferRepository,
        private readonly LabelRepository $labelRepository,
        private readonly LabelingService $labelingService,
        private readonly EntityMapper $entityMapper,
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
    ): TransferApiResource {
        $transferId = $uriVariables['id'] ?? null;
        $labelId    = $uriVariables['labelId'] ?? null;

        if (! is_string($transferId) || ! is_string($labelId)) {
            throw new NotFoundHttpException('Transfer or Label not found');
        }

        $transfer = $this->transferRepository->find(Uuid::fromRfc4122($transferId));
        if (! $transfer instanceof Transfer) {
            throw new NotFoundHttpException('Transfer not found');
        }

        $label = $this->labelRepository->find(Uuid::fromRfc4122($labelId));
        if (! $label instanceof Label) {
            throw new NotFoundHttpException('Label not found');
        }

        if ($operation instanceof Delete) {
            $this->labelingService->removeLabelFromTransfer($transfer, $label);
        } else {
            // POST — manual assignment
            $this->labelingService->manuallyLabelTransfer($transfer, $label);
        }

        return $this->entityMapper->mapTransferToDto($transfer);
    }
}
