<?php

declare(strict_types=1);

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use App\State\BankAccountItemProvider;
use App\State\BankAccountStateProcessor;
use App\State\BankAccountStateProvider;
use App\State\TransfersByAccountProvider;

/**
 * API resource for bank accounts.
 *
 * T028 [US3]: Delete operation intentionally removed — bank accounts cannot be
 * deleted via the API. Deletion is blocked at the API level.
 */
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
        new GetCollection(
            uriTemplate: '/bank-accounts/{id}/transfers',
            provider: TransfersByAccountProvider::class,
        ),
    ],
)]
class BankAccountApiResource
{
    #[ApiProperty(identifier: true)]
    public string|null $id = null;

    public string|null $accountName = null;

    public string|null $accountNumber = null;

    public string|null $hash = null;

    public bool $isInternal = false;

    public string $totalBalance = '0.00';

    /** @var array<string> */
    public array $linkedLabelIds = [];
}
