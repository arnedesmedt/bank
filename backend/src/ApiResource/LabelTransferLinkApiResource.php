<?php

declare(strict_types=1);

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Post;
use App\State\LabelTransferLinkArchiveProcessor;
use App\State\LabelTransferLinkItemProvider;

/**
 * API resource for label transfer links.
 *
 * Represents the relationship between a label and a transfer.
 * Supports archiving automatic links to prevent re-assignment.
 */
#[ApiResource(
    shortName: 'LabelTransferLink',
    operations: [
        new Get(
            uriTemplate: '/label-transfer-links/{id}',
            provider: LabelTransferLinkItemProvider::class,
        ),
        new Post(
            uriTemplate: '/label-transfer-links/{id}/archive',
            read: false,
            deserialize: false,
            processor: LabelTransferLinkArchiveProcessor::class,
        ),
        new Post(
            uriTemplate: '/label-transfer-links/{id}/unarchive',
            read: false,
            deserialize: false,
            processor: LabelTransferLinkArchiveProcessor::class,
        ),
    ],
)]
class LabelTransferLinkApiResource
{
    #[ApiProperty(identifier: true)]
    public string|null $id = null;

    public string $labelId;

    public string $transferId;

    public string $labelName;

    public bool $isManual;

    public bool $isArchived;
}
