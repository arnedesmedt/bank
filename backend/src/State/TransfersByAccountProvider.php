<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\TransferApiResource;
use App\Entity\BankAccount;
use App\Repository\BankAccountRepository;
use App\Repository\TransferRepository;
use App\Service\EntityMapper;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Uid\Uuid;

use function array_map;
use function is_string;

/** @implements ProviderInterface<TransferApiResource> */
class TransfersByAccountProvider implements ProviderInterface
{
    public function __construct(
        private readonly BankAccountRepository $bankAccountRepository,
        private readonly TransferRepository $transferRepository,
        private readonly EntityMapper $entityMapper,
    ) {
    }

    /**
     * @param array<string, mixed> $uriVariables
     * @param array<string, mixed> $context
     *
     * @return array<TransferApiResource>
     */
    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        $id = $uriVariables['id'] ?? null;
        if (! is_string($id)) {
            throw new NotFoundHttpException('Bank account not found');
        }

        $account = $this->bankAccountRepository->find(Uuid::fromRfc4122($id));
        if (! $account instanceof BankAccount) {
            throw new NotFoundHttpException('Bank account not found');
        }

        $transfers = $this->transferRepository->findByAccount($account);

        return array_map(
            $this->entityMapper->mapTransferToDto(...),
            $transfers,
        );
    }
}
