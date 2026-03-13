<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\LabelApiResource;
use App\Repository\LabelRepository;
use App\Service\EntityMapper;

use function array_map;

/** @implements ProviderInterface<LabelApiResource> */
class LabelStateProvider implements ProviderInterface
{
    public function __construct(
        private readonly LabelRepository $labelRepository,
        private readonly EntityMapper $entityMapper,
    ) {
    }

    /**
     * @param array<string, mixed> $uriVariables
     * @param array<string, mixed> $context
     *
     * @return array<LabelApiResource>
     */
    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        $labels = $this->labelRepository->findAll();

        return array_map(
            $this->entityMapper->mapLabelToDto(...),
            $labels,
        );
    }
}
