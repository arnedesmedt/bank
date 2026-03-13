<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\LabelApiResource;
use App\Entity\Label;
use App\Repository\LabelRepository;
use App\Service\EntityMapper;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Uid\Uuid;

use function is_string;

/** @implements ProviderInterface<LabelApiResource> */
class LabelItemProvider implements ProviderInterface
{
    public function __construct(
        private readonly LabelRepository $labelRepository,
        private readonly EntityMapper $entityMapper,
    ) {
    }

    /**
     * @param array<string, mixed> $uriVariables
     * @param array<string, mixed> $context
     */
    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        $id = $uriVariables['id'] ?? null;
        if (! is_string($id)) {
            throw new NotFoundHttpException('Label not found');
        }

        $label = $this->labelRepository->find(Uuid::fromRfc4122($id));
        if (! $label instanceof Label) {
            throw new NotFoundHttpException('Label not found');
        }


        return $this->entityMapper->mapLabelToDto($label);
    }
}
