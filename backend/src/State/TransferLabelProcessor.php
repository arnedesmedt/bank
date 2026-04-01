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
use InvalidArgumentException;
use Psr\Log\LoggerInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Uid\Uuid;
use Throwable;

use function gettype;
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
    ): TransferApiResource {
        $transferId = $uriVariables['id'] ?? null;
        $labelId    = $uriVariables['labelId'] ?? null;

        if (! is_string($transferId) || ! is_string($labelId)) {
            $this->logger->error('Invalid transfer or label ID format', [
                'transferId' => $transferId,
                'labelId' => $labelId,
                'transferIdType' => gettype($transferId),
                'labelIdType' => gettype($labelId),
            ]);

            throw new NotFoundHttpException('Transfer or Label not found');
        }

        $this->logger->info('Processing label operation', [
            'transferId' => $transferId,
            'labelId' => $labelId,
            'operation' => $operation instanceof Delete ? 'DELETE' : 'POST',
        ]);

        $transfer = $this->transferRepository->find(Uuid::fromRfc4122($transferId));
        if (! $transfer instanceof Transfer) {
            $this->logger->error('Transfer not found', ['transferId' => $transferId]);

            throw new NotFoundHttpException('Transfer not found');
        }

        try {
            $labelUuid = Uuid::fromRfc4122($labelId);
            $this->logger->debug('Parsed label UUID', ['labelId' => $labelId, 'uuid' => $labelUuid->toRfc4122()]);
            $label = $this->labelRepository->find($labelUuid);
        } catch (InvalidArgumentException $e) {
            $this->logger->error('Invalid UUID format for label', [
                'labelId' => $labelId,
                'error' => $e->getMessage(),
            ]);

            throw new NotFoundHttpException('Label not found', $e);
        } catch (Throwable $e) {
            $this->logger->error('Error processing label UUID', [
                'labelId' => $labelId,
                'error' => $e->getMessage(),
            ]);

            throw new NotFoundHttpException('Label not found', $e);
        }

        if (! $label instanceof Label) {
            $this->logger->warning('Label not found in database - possibly already deleted', ['labelId' => $labelId]);

            // Return a 404 with a more specific message for stale frontend state
            throw new NotFoundHttpException(
                'Label not found or has been deleted. Please refresh the page and try again.',
            );
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
