<?php

declare(strict_types=1);

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use App\State\GroupByStateProvider;

/**
 * GroupByResult — virtual API resource for grouping transfers by period or label.
 *
 * Returns aggregated totals and counts, suitable for rendering bar/line graphs.
 */
#[ApiResource(
    shortName: 'GroupBy',
    operations: [
        new GetCollection(
            uriTemplate: '/group-by',
            provider: GroupByStateProvider::class,
        ),
    ],
)]
class GroupByResult
{
    #[ApiProperty(identifier: true)]
    public string $id;

    /** Period label: e.g. '2026-03', 'Q1-2026', '2026', or a label UUID */
    public string $period;

    public string|null $labelId = null;

    public string|null $labelName = null;

    public string $totalAmount = '0';

    public int $transferCount = 0;
}
