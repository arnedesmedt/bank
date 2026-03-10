<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\ApiResource\BankAccountApiResource;
use App\Entity\BankAccount;
use App\Repository\BankAccountRepository;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Uid\Uuid;

use function is_string;

/** @implements ProcessorInterface<BankAccountApiResource, null> */
class BankAccountDeleteProcessor implements ProcessorInterface
{
    public function __construct(
        private readonly BankAccountRepository $bankAccountRepository,
    ) {
    }

    /**
     * @param array<string, mixed> $uriVariables
     * @param array<string, mixed> $context
     */
    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): null
    {
        $id = $uriVariables['id'] ?? null;
        if ($id === null || ! is_string($id)) {
            throw new NotFoundHttpException('BankAccount not found');
        }

        $bankAccount = $this->bankAccountRepository->find(Uuid::fromRfc4122($id));
        if (! $bankAccount instanceof BankAccount) {
            throw new NotFoundHttpException('BankAccount not found');
        }

        $this->bankAccountRepository->remove($bankAccount, true);

        return null;
    }
}
