<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\BankAccountApiResource;
use App\Repository\BankAccountRepository;
use App\Service\EntityMapper;

use function array_map;

/** @implements ProviderInterface<BankAccountApiResource> */
class BankAccountStateProvider implements ProviderInterface
{
    public function __construct(
        private readonly BankAccountRepository $bankAccountRepository,
        private readonly EntityMapper $entityMapper,
    ) {
    }

    /**
     * @param array<string, mixed> $uriVariables
     * @param array<string, mixed> $context
     *
     * @return array<BankAccountApiResource>
     */
    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        $bankAccounts = $this->bankAccountRepository->findAll();

        return array_map(
            $this->entityMapper->mapBankAccountToDto(...),
            $bankAccounts,
        );
    }
}
