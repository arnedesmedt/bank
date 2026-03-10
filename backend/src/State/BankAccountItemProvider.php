<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\BankAccountApiResource;
use App\Entity\BankAccount;
use App\Entity\User;
use App\Repository\BankAccountRepository;
use App\Service\EntityMapper;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Uid\Uuid;

use function is_string;

/** @implements ProviderInterface<BankAccountApiResource> */
class BankAccountItemProvider implements ProviderInterface
{
    public function __construct(
        private readonly BankAccountRepository $bankAccountRepository,
        private readonly Security $security,
        private readonly EntityMapper $entityMapper,
    ) {
    }

    /**
     * @param array<string, mixed> $uriVariables
     * @param array<string, mixed> $context
     */
    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        $user = $this->security->getUser();
        if (! $user instanceof User) {
            return null;
        }

        $id = $uriVariables['id'] ?? null;
        if (! is_string($id)) {
            throw new NotFoundHttpException('BankAccount not found');
        }

        $bankAccount = $this->bankAccountRepository->find(Uuid::fromRfc4122($id));
        if (! $bankAccount instanceof BankAccount) {
            throw new NotFoundHttpException('BankAccount not found');
        }

        if ($bankAccount->getOwner()->getId()?->toRfc4122() !== $user->getId()?->toRfc4122()) {
            throw new AccessDeniedHttpException('Access denied');
        }

        return $this->entityMapper->mapBankAccountToDto($bankAccount);
    }
}
