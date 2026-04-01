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
use DateTimeImmutable;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Uid\Uuid;

use function array_filter;
use function array_map;
use function array_values;
use function in_array;
use function is_array;
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

        $filters  = is_array($context['filters'] ?? null) ? $context['filters'] : [];
        $search   = null;
        $dateFrom = null;
        $dateTo   = null;
        $labelIds = [];

        if (isset($filters['search']) && is_string($filters['search']) && $filters['search'] !== '') {
            $search = $filters['search'];
        }

        if (isset($filters['dateFrom']) && is_string($filters['dateFrom']) && $filters['dateFrom'] !== '') {
            $parsed = DateTimeImmutable::createFromFormat('Y-m-d', $filters['dateFrom']);
            if ($parsed !== false) {
                $dateFrom = $parsed->setTime(0, 0, 0);
            }
        }

        if (isset($filters['dateTo']) && is_string($filters['dateTo']) && $filters['dateTo'] !== '') {
            $parsed = DateTimeImmutable::createFromFormat('Y-m-d', $filters['dateTo']);
            if ($parsed !== false) {
                $dateTo = $parsed->setTime(23, 59, 59);
            }
        }

        if (isset($filters['labelIds']) && is_array($filters['labelIds'])) {
            $labelIds = array_values(array_filter(
                $filters['labelIds'],
                static fn (mixed $lid): bool => is_string($lid) && $lid !== '',
            ));
        }

        // Check for "no-labels" filter
        $noLabelsOnly = false;
        if (in_array('no-labels', $labelIds, true)) {
            $noLabelsOnly = true;
            // Remove 'no-labels' from the array so it doesn't get processed as a regular label ID
            $labelIds = array_filter($labelIds, static fn (string $id): bool => $id !== 'no-labels');
        }

        $transfers = $this->transferRepository->findWithFilters(
            $search,
            $dateFrom,
            $dateTo,
            $labelIds,
            [$id],
            null,
            null,
            null,
            'eq',
            $noLabelsOnly,
            10000,
            0,
        );

        return array_map(
            $this->entityMapper->mapTransferToDto(...),
            $transfers,
        );
    }
}
