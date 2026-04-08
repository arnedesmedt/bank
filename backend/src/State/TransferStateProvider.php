<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\TransferApiResource;
use App\Repository\TransferRepository;
use App\Service\EntityMapper;
use DateTimeImmutable;

use function array_filter;
use function array_map;
use function array_values;
use function in_array;
use function is_array;
use function is_numeric;
use function is_string;

/** @implements ProviderInterface<TransferApiResource> */
class TransferStateProvider implements ProviderInterface
{
    public function __construct(
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
        $filters = is_array($context['filters'] ?? null) ? $context['filters'] : [];

        $page = 1;
        if (isset($filters['page']) && is_numeric($filters['page'])) {
            $page = (int) $filters['page'];
        }

        $itemsPerPage = 30;
        $offset       = ($page - 1) * $itemsPerPage;

        $search          = null;
        $dateFrom        = null;
        $dateTo          = null;
        $labelIds        = [];
        $accountIds      = [];
        $accountId       = null;
        $amountMin       = null;
        $amountMax       = null;
        $amountOperator  = 'eq';
        $excludeInternal = true;

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

        if (isset($filters['labelIds']) && is_array($filters['labelIds'])) {
            $labelIds = array_filter(
                $filters['labelIds'],
                static fn ($id): bool => is_string($id) && $id !== '',
            );
        } elseif (isset($filters['labelIds']) && is_string($filters['labelIds']) && $filters['labelIds'] !== '') {
            $labelIds = [$filters['labelIds']];
        }

        // Check for "no-labels" filter
        $noLabelsOnly = false;
        if (in_array('no-labels', $labelIds, true)) {
            $noLabelsOnly = true;
            // Remove 'no-labels' from the array so it doesn't get processed as a regular label ID
            $labelIds = array_filter($labelIds, static fn (string $id): bool => $id !== 'no-labels');
        }

        if (isset($filters['accountIds']) && is_array($filters['accountIds'])) {
            $accountIds = array_values(array_filter(
                $filters['accountIds'],
                static fn ($id): bool => is_string($id) && $id !== '',
            ));
        }

        if (isset($filters['accountId']) && is_string($filters['accountId']) && $filters['accountId'] !== '') {
            $accountId = $filters['accountId'];
        }

        if (isset($filters['amountMin']) && is_string($filters['amountMin']) && $filters['amountMin'] !== '') {
            $amountMin = (float) $filters['amountMin'];
        }

        if (isset($filters['amountMax']) && is_string($filters['amountMax']) && $filters['amountMax'] !== '') {
            $amountMax = (float) $filters['amountMax'];
        }

        if (
            isset($filters['amountOperator'])
            && is_string($filters['amountOperator'])
            && $filters['amountOperator'] !== ''
        ) {
            $amountOperator = $filters['amountOperator'];
        }

        if (isset($filters['excludeInternal']) && $filters['excludeInternal'] === 'true') {
            $excludeInternal = true;
        }

        $transfers = $this->transferRepository->findWithFilters(
            $search,
            $dateFrom,
            $dateTo,
            array_values($labelIds),
            $accountIds,
            $accountId,
            $amountMin,
            $amountMax,
            $amountOperator,
            $noLabelsOnly,
            $excludeInternal,
            $itemsPerPage,
            $offset,
        );

        return array_map(
            $this->entityMapper->mapTransferToDto(...),
            $transfers,
        );
    }
}
