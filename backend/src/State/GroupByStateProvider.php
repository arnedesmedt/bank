<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\GroupByResult;
use App\Repository\TransferRepository;
use DateTimeImmutable;

use function array_filter;
use function array_map;
use function array_values;
use function in_array;
use function is_array;
use function is_string;

/** @implements ProviderInterface<GroupByResult> */
class GroupByStateProvider implements ProviderInterface
{
    public function __construct(
        private readonly TransferRepository $transferRepository,
    ) {
    }

    /**
     * @param array<string, mixed> $uriVariables
     * @param array<string, mixed> $context
     *
     * @return array<GroupByResult>
     */
    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        $filters = is_array($context['filters'] ?? null) ? $context['filters'] : [];

        $groupBy  = 'period';
        $period   = 'month';
        $dateFrom = null;
        $dateTo   = null;
        $labelIds = [];

        if (isset($filters['groupBy']) && is_string($filters['groupBy'])) {
            $groupBy = match ($filters['groupBy']) {
                'label'            => 'label',
                'label_and_period' => 'label_and_period',
                default            => 'period',
            };
        }

        if (isset($filters['period']) && is_string($filters['period'])) {
            $period = match ($filters['period']) {
                'quarter', 'year' => $filters['period'],
                default           => 'month',
            };
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
            $labelIds = array_values(array_filter(
                $filters['labelIds'],
                static fn ($id): bool => is_string($id) && $id !== '',
            ));
        } elseif (isset($filters['labelIds']) && is_string($filters['labelIds']) && $filters['labelIds'] !== '') {
            $labelIds = [$filters['labelIds']];
        }

        // Handle "no-labels" special filter — same pattern as TransferStateProvider
        $noLabelsOnly = false;
        if (in_array('no-labels', $labelIds, true)) {
            $noLabelsOnly = true;
            $labelIds     = array_values(array_filter($labelIds, static fn (string $id): bool => $id !== 'no-labels'));
            // "No labels" grouped by label/label_and_period is meaningless; fall back to period grouping
            if ($groupBy === 'label' || $groupBy === 'label_and_period') {
                $groupBy = 'period';
            }
        }

        $rows = $this->transferRepository->groupBy($groupBy, $period, $dateFrom, $dateTo, $labelIds, $noLabelsOnly);

        return array_map(static function (array $row) use ($groupBy): GroupByResult {
            $groupByResult                = new GroupByResult();
            $groupByResult->id            = $groupBy === 'label_and_period'
                ? ($row['label_id'] ?? '') . '_' . $row['period']
                : ($row['label_id'] ?? $row['period']);
            $groupByResult->period        = $row['period'];
            $groupByResult->labelId       = $row['label_id'] ?? null;
            $groupByResult->labelName     = $row['label_name'] ?? null;
            $groupByResult->totalAmount   = $row['total_amount'];
            $groupByResult->transferCount = $row['transfer_count'];

            return $groupByResult;
        }, $rows);
    }
}
