<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\ApiResource\BulkTransferAction;
use App\ApiResource\TransferApiResource;
use App\Entity\Transfer;
use App\Service\EntityMapper;
use App\Service\TransferService;
use InvalidArgumentException;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

use function array_map;

/**
 * Handles PATCH /api/transfers/bulk for bulk actions on transfers.
 *
 * Supported actions: apply_label, remove_label, mark_refund, remove_refund
 *
 * @implements ProcessorInterface<BulkTransferAction, array<TransferApiResource>>
 */
class TransferBulkActionProcessor implements ProcessorInterface
{
    public function __construct(
        private readonly TransferService $transferService,
        private readonly EntityMapper $entityMapper,
    ) {
    }

    /**
     * @param array<string, mixed> $uriVariables
     * @param array<string, mixed> $context
     *
     * @return array<TransferApiResource>
     */
    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if (! $data instanceof BulkTransferAction) {
            throw new BadRequestHttpException('Invalid request data');
        }

        if ($data->transferIds === []) {
            throw new BadRequestHttpException('At least one transferId is required');
        }

        try {
            $transfers = match ($data->action) {
                'apply_label'   => $this->applyLabel($data),
                'remove_label'  => $this->removeLabel($data),
                'mark_refund'   => $this->markRefund($data),
                'remove_refund' => $this->removeRefund($data),
                default => throw new BadRequestHttpException('Unknown action: ' . $data->action),
            };
        } catch (InvalidArgumentException $invalidArgumentException) {
            throw new NotFoundHttpException($invalidArgumentException->getMessage(), $invalidArgumentException);
        }

        return array_map($this->entityMapper->mapTransferToDto(...), $transfers);
    }

    /** @return array<Transfer> */
    private function applyLabel(BulkTransferAction $bulkTransferAction): array
    {
        if ($bulkTransferAction->labelId === null || $bulkTransferAction->labelId === '') {
            throw new BadRequestHttpException('labelId is required for apply_label action');
        }

        return $this->transferService->bulkApplyLabel($bulkTransferAction->transferIds, $bulkTransferAction->labelId);
    }

    /** @return array<Transfer> */
    private function removeLabel(BulkTransferAction $bulkTransferAction): array
    {
        if ($bulkTransferAction->labelId === null || $bulkTransferAction->labelId === '') {
            throw new BadRequestHttpException('labelId is required for remove_label action');
        }

        return $this->transferService->bulkRemoveLabel($bulkTransferAction->transferIds, $bulkTransferAction->labelId);
    }

    /** @return array<Transfer> */
    private function markRefund(BulkTransferAction $bulkTransferAction): array
    {
        if ($bulkTransferAction->parentTransferId === null || $bulkTransferAction->parentTransferId === '') {
            throw new BadRequestHttpException('parentTransferId is required for mark_refund action');
        }

        return $this->transferService->bulkMarkRefund(
            $bulkTransferAction->transferIds,
            $bulkTransferAction->parentTransferId,
        );
    }

    /** @return array<Transfer> */
    private function removeRefund(BulkTransferAction $bulkTransferAction): array
    {
        return $this->transferService->bulkRemoveRefund($bulkTransferAction->transferIds);
    }
}
