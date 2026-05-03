<?php

declare(strict_types=1);

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Patch;
use App\State\TransferBulkActionProcessor;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * BulkTransferAction — API resource for performing bulk actions on multiple transfers.
 *
 * Actions: apply_label, remove_label, mark_refund
 */
#[ApiResource(
    shortName: 'TransferBulkAction',
    operations: [
        new Patch(
            uriTemplate: '/transfers/bulk',
            status: 200,
            output: TransferApiResource::class,
            read: false,
            deserialize: true,
            processor: TransferBulkActionProcessor::class,
        ),
    ],
)]
class BulkTransferAction
{
    #[Assert\NotBlank]
    #[Assert\Choice(choices: [
        'apply_label',
        'remove_label',
        'mark_refund',
        'remove_refund',
        'mark_internal',
        'unmark_internal',
    ])]
    #[ApiProperty(description: 'The bulk action to perform.')]
    public string $action = '';

    /** @var array<string> */
    #[Assert\NotBlank]
    #[Assert\Count(min: 1)]
    #[ApiProperty(description: 'UUIDs of the transfers to act on.')]
    public array $transferIds = [];

    /** Required for apply_label and remove_label actions */
    #[ApiProperty(description: 'UUID of the label (required for apply_label and remove_label).')]
    public string|null $labelId = null;

    /** Required for mark_refund action */
    #[ApiProperty(description: 'UUID of the parent transfer (required for mark_refund).')]
    public string|null $parentTransferId = null;
}
