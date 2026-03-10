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
use App\State\BankAccountDeleteProcessor;
use App\State\BankAccountItemProvider;
use App\State\BankAccountStateProcessor;
use App\State\BankAccountStateProvider;

#[ApiResource(
    shortName: 'BankAccount',
    operations: [
        new GetCollection(
            uriTemplate: '/bank-accounts',
            provider: BankAccountStateProvider::class,
        ),
        new Get(
            uriTemplate: '/bank-accounts/{id}',
            provider: BankAccountItemProvider::class,
        ),
        new Post(
            uriTemplate: '/bank-accounts',
            read: false,
            processor: BankAccountStateProcessor::class,
        ),
        new Put(
            uriTemplate: '/bank-accounts/{id}',
            provider: BankAccountItemProvider::class,
            processor: BankAccountStateProcessor::class,
        ),
        new Delete(
            uriTemplate: '/bank-accounts/{id}',
            provider: BankAccountItemProvider::class,
            processor: BankAccountDeleteProcessor::class,
        ),
    ],
)]
class BankAccountApiResource
{
    #[ApiProperty(identifier: true)]
    public string|null $id = null;

    public string $accountName;

    public string $accountNumber;

    /** @var array<string> */
    public array $linkedLabelIds = [];
}
