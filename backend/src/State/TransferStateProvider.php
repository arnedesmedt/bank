<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\TransferApiResource;
use App\Repository\TransferRepository;
use App\Service\EntityMapper;

use function array_map;
use function is_array;
use function is_numeric;

/** @implements ProviderInterface<TransferApiResource> */
class TransferStateProvider implements ProviderInterface
{
    public function __construct(
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
        $page = 1;
        if (isset($context['filters']) && is_array($context['filters']) && isset($context['filters']['page'])) {
            $pageValue = $context['filters']['page'];
            if (is_numeric($pageValue)) {
                $page = (int) $pageValue;
            }
        }

        $itemsPerPage = 30;
        $offset       = ($page - 1) * $itemsPerPage;

        $transfers = $this->transferRepository->findAll($itemsPerPage, $offset);

        return array_map(
            $this->entityMapper->mapTransferToDto(...),
            $transfers,
        );
    }
}
