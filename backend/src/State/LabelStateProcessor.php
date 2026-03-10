<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\ApiResource\LabelApiResource;
use App\Entity\Label;
use App\Entity\User;
use App\Repository\LabelRepository;
use App\Service\EntityMapper;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\UnauthorizedHttpException;
use Symfony\Component\Uid\Uuid;

use function is_string;

/** @implements ProcessorInterface<LabelApiResource, LabelApiResource> */
class LabelStateProcessor implements ProcessorInterface
{
    public function __construct(
        private readonly LabelRepository $labelRepository,
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
    ): LabelApiResource {
        $user = $this->security->getUser();
        if (! $user instanceof User) {
            throw new UnauthorizedHttpException('Bearer', 'Not authenticated');
        }

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
            $label->setOwner($user);
        }

        $this->entityMapper->mapDtoToLabel($data, $label, $user);
        $this->labelRepository->save($label, true);

        return $this->entityMapper->mapLabelToDto($label);
    }
}
