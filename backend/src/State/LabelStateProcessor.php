<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\ApiResource\LabelApiResource;
use App\Entity\Label;
use App\Repository\LabelRepository;
use App\Service\EntityMapper;
use App\Service\LabelingService;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Uid\Uuid;

use function is_string;

/** @implements ProcessorInterface<LabelApiResource, LabelApiResource> */
class LabelStateProcessor implements ProcessorInterface
{
    public function __construct(
        private readonly LabelRepository $labelRepository,
        private readonly EntityMapper $entityMapper,
        private readonly LabelingService $labelingService,
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
    ): LabelApiResource {
        $id = $uriVariables['id'] ?? null;

        if ($id !== null && is_string($id)) {
            // Update existing
            $label = $this->labelRepository->find(Uuid::fromRfc4122($id));
            if (! $label instanceof Label) {
                throw new NotFoundHttpException('Label not found');
            }
        } else {
            // Create new
            $label = new Label();
        }

        $this->entityMapper->mapDtoToLabel($data, $label);
        $this->labelRepository->save($label, true);

        // FR-008: Auto-assign label to all matching existing transfers after create/update
        $this->labelingService->autoAssignLabelToAllTransfers($label);

        return $this->entityMapper->mapLabelToDto($label);
    }
}
