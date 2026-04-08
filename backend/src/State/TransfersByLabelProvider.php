<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\TransferApiResource;
use App\Entity\Label;
use App\Repository\LabelRepository;
use App\Repository\TransferRepository;
use App\Service\EntityMapper;
use DateTimeImmutable;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Uid\Uuid;

use function array_map;
use function is_array;
use function is_string;

/**
 * T024 [US2]: Provides the list of transfers linked to a specific label.
 *
 * Route: GET /api/labels/{id}/transfers
 * Supports optional filter query params: search, dateFrom, dateTo.
 *
 * @implements ProviderInterface<TransferApiResource>
 */
class TransfersByLabelProvider implements ProviderInterface
{
    public function __construct(
        private readonly LabelRepository $labelRepository,
        private readonly TransferRepository $transferRepository,
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

        $filters  = is_array($context['filters'] ?? null) ? $context['filters'] : [];
        $search   = null;
        $dateFrom = null;
        $dateTo   = null;

        if (isset($filters['search']) && is_string($filters['search']) && $filters['search'] !== '') {
            $search = $filters['search'];
        }

        if (isset($filters['dateFrom']) && is_string($filters['dateFrom']) && $filters['dateFrom'] !== '') {
            $parsed = DateTimeImmutable::createFromFormat('Y-m-d', $filters['dateFrom']);
            if ($parsed !== false) {
                $dateFrom = $parsed->setTime(0, 0, 0);
            }
        }

        if (isset($filters['dateTo']) && is_string($filters['dateTo']) && $filters['dateTo'] !== '') {
            $parsed = DateTimeImmutable::createFromFormat('Y-m-d', $filters['dateTo']);
            if ($parsed !== false) {
                $dateTo = $parsed->setTime(23, 59, 59);
            }
        }

        $excludeInternal = false;
        if (isset($filters['excludeInternal']) && $filters['excludeInternal'] === 'true') {
            $excludeInternal = true;
        }

        $transfers = $this->transferRepository->findWithFilters(
            $search,
            $dateFrom,
            $dateTo,
            [$id],
            [],
            null,
            null,
            null,
            'eq',  // amountOperator
            false, // noLabelsOnly is always false for label-specific transfers
            $excludeInternal,
            10000,
            0,
        );

        return array_map(
            $this->entityMapper->mapTransferToDto(...),
            $transfers,
        );
    }
}
