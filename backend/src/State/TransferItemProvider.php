<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\TransferApiResource;
use App\Entity\Transfer;
use App\Entity\User;
use App\Repository\TransferRepository;
use App\Service\EntityMapper;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Uid\Uuid;

use function is_string;

/** @implements ProviderInterface<TransferApiResource> */
class TransferItemProvider implements ProviderInterface
{
    public function __construct(
        private readonly TransferRepository $transferRepository,
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
            throw new NotFoundHttpException('Transfer not found');
        }

        $transfer = $this->transferRepository->find(Uuid::fromRfc4122($id));
        if (! $transfer instanceof Transfer) {
            throw new NotFoundHttpException('Transfer not found');
        }

        if ($transfer->getOwner()->getId()?->toRfc4122() !== $user->getId()?->toRfc4122()) {
            throw new AccessDeniedHttpException('Access denied');
        }

        return $this->entityMapper->mapTransferToDto($transfer);
    }
}
