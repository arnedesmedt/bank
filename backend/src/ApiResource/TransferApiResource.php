<?php

declare(strict_types=1);

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use App\State\TransferImportProcessor;
use App\State\TransferItemProvider;
use App\State\TransferStateProvider;
use DateTimeImmutable;

#[ApiResource(
    shortName: 'Transfer',
    operations: [
        new GetCollection(
            uriTemplate: '/transfers',
            provider: TransferStateProvider::class,
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
    ],
)]
class TransferApiResource
{
    #[ApiProperty(identifier: true)]
    public string $id;

    public string $amount;

    public DateTimeImmutable $date;

    public string $fromAccountNumber;

    public string $fromAccountName;

    public string $toAccountNumber;

    public string $toAccountName;

    public string $reference;

    public string $csvSource;

    public string|null $transactionId = null;

    public bool $isInternal = false;

    /** @var array<string> */
    public array $labelIds = [];

    /** @var array<string> */
    public array $labelNames = [];
}
