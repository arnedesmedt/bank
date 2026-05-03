<?php

declare(strict_types=1);

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use App\State\TransferImportProcessor;
use App\State\TransferItemProvider;
use App\State\TransferLabelProcessor;
use App\State\TransferStateProvider;
use App\State\TransferTotalsProvider;

#[ApiResource(
    shortName: 'Transfer',
    operations: [
        new GetCollection(
            uriTemplate: '/transfers',
            provider: TransferStateProvider::class,
        ),
        new Get(
            uriTemplate: '/transfers/totals',
            description: 'Get totals (in/out/net) for transfers matching filters',
            provider: TransferTotalsProvider::class,
        ),
        new Get(
            uriTemplate: '/transfers/{id}',
            provider: TransferItemProvider::class,
        ),
        new Post(
            uriTemplate: '/transfers/import',
            inputFormats: ['multipart' => ['multipart/form-data']],
            output: TransferImportResult::class,
            read: false,
            deserialize: false,
            provider: null,
            processor: TransferImportProcessor::class,
        ),
        new Post(
            uriTemplate: '/transfers/{id}/labels/{labelId}',
            read: false,
            deserialize: false,
            provider: null,
            processor: TransferLabelProcessor::class,
        ),
        new Delete(
            uriTemplate: '/transfers/{id}/labels/{labelId}',
            status: 200,
            read: false,
            provider: null,
            processor: TransferLabelProcessor::class,
        ),
    ],
)]
class TransferApiResource
{
    #[ApiProperty(identifier: true)]
    public string $id;

    public string $amount;

    public string $date;

    public string|null $fromAccountId = null;

    public string|null $fromAccountNumber = null;

    public string|null $fromAccountName = null;

    public string|null $toAccountId = null;

    public string|null $toAccountNumber = null;

    public string|null $toAccountName = null;

    public string $reference;

    public string $csvSource;

    public string|null $transactionId = null;

    public bool $isInternal = false;

    /** @var array<string> */
    public array $labelIds = [];

    /** @var array<string> */
    public array $labelNames = [];

    /**
     * Label links with manual/automatic/archived flags.
     * Each entry: {id: string, name: string, isManual: bool, isArchived: bool}
     * Note: The 'id' field contains the LabelTransferLink UUID, not the Label UUID.
     * Archived links appear here for UI management but are excluded from labelIds/labelNames.
     *
     * @var array<array{id: string, name: string, isManual: bool, isArchived: bool}>
     */
    public array $labelLinks = [];

    public string|null $parentTransferId = null;

    #[ApiProperty(description: 'Original amount before any refunds were subtracted. Null if no refunds linked.')]
    public string|null $amountBeforeRefund = null;

    /**
     * Child refund transfers embedded directly in this parent transfer.
     * Empty for transfers that have no refunds or for child transfers themselves.
     *
     * @var array<self>
     */
    #[ApiProperty(description: 'Child refund transfers embedded in this parent transfer.')]
    public array $childRefunds = [];
}
