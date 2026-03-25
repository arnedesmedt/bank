<?php

declare(strict_types=1);

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use App\State\LabelDeleteProcessor;
use App\State\LabelItemProvider;
use App\State\LabelStateProcessor;
use App\State\LabelStateProvider;
use App\State\TransfersByLabelProvider;

/**
 * API resource for labels.
 *
 * Labels categorise transfers and support a parent-child hierarchy.
 * When a label is linked to a bank account or a regex pattern, it is
 * automatically applied to matching transfers during CSV import.
 *
 * T024 [US2]: Added GET /api/labels/{id}/transfers endpoint.
 */
#[ApiResource(
    shortName: 'Label',
    operations: [
        new GetCollection(
            uriTemplate: '/labels',
            provider: LabelStateProvider::class,
        ),
        new Get(
            uriTemplate: '/labels/{id}',
            provider: LabelItemProvider::class,
        ),
        new Post(
            uriTemplate: '/labels',
            read: false,
            processor: LabelStateProcessor::class,
        ),
        new Put(
            uriTemplate: '/labels/{id}',
            provider: LabelItemProvider::class,
            processor: LabelStateProcessor::class,
        ),
        new Delete(
            uriTemplate: '/labels/{id}',
            provider: LabelItemProvider::class,
            processor: LabelDeleteProcessor::class,
        ),
        new GetCollection(
            uriTemplate: '/labels/{id}/transfers',
            provider: TransfersByLabelProvider::class,
        ),
    ],
)]
class LabelApiResource
{
    #[ApiProperty(identifier: true)]
    public string|null $id = null;

    public string $name;

    public string|null $parentLabelId = null;

    public string|null $parentLabelName = null;

    /** @var array<string> */
    public array $linkedBankAccountIds = [];

    /** @var array<string> */
    public array $linkedRegexes = [];

    /** @var array<string> */
    public array $childLabelIds = [];

    public string|null $maxValue = null;

    public string|null $maxPercentage = null;
}
