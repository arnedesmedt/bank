<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\ApiResource\BankAccountApiResource;
use App\Entity\BankAccount;
use App\Entity\User;
use App\Repository\BankAccountRepository;
use App\Service\EntityMapper;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\UnauthorizedHttpException;
use Symfony\Component\Uid\Uuid;

use function is_string;

/** @implements ProcessorInterface<BankAccountApiResource, BankAccountApiResource> */
class BankAccountStateProcessor implements ProcessorInterface
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
    public function process(
        mixed $data,
        Operation $operation,
        array $uriVariables = [],
        array $context = [],
    ): BankAccountApiResource {
        $user = $this->security->getUser();
        if (! $user instanceof User) {
            throw new UnauthorizedHttpException('Bearer', 'Not authenticated');
        }

        $id = $uriVariables['id'] ?? null;

        if ($id !== null && is_string($id)) {
            // Update existing
            $bankAccount = $this->bankAccountRepository->find(Uuid::fromRfc4122($id));
            if (! $bankAccount instanceof BankAccount) {
                throw new NotFoundHttpException('BankAccount not found');
            }
        } else {
            // Create new
            $bankAccount = new BankAccount();
            $bankAccount->setOwner($user);
        }

        $this->entityMapper->mapDtoToBankAccount($data, $bankAccount);
        $this->bankAccountRepository->save($bankAccount, true);

        return $this->entityMapper->mapBankAccountToDto($bankAccount);
    }
}
