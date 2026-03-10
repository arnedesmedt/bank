<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\ApiResource\LabelApiResource;
use App\Entity\Label;
use App\Repository\LabelRepository;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Uid\Uuid;

use function is_string;

/** @implements ProcessorInterface<LabelApiResource, null> */
class LabelDeleteProcessor implements ProcessorInterface
{
    public function __construct(
        private readonly LabelRepository $labelRepository,
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
            throw new NotFoundHttpException('Label not found');
        }

        $label = $this->labelRepository->find(Uuid::fromRfc4122($id));
        if (! $label instanceof Label) {
            throw new NotFoundHttpException('Label not found');
        }

        $this->labelRepository->remove($label, true);

        return null;
    }
}
