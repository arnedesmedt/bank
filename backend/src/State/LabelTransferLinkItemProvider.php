<?php

declare(strict_types=1);

namespace App\State;

use App\ApiResource\LabelTransferLinkApiResource;
use App\Entity\LabelTransferLink;
use App\Repository\LabelTransferLinkRepository;
use Symfony\Component\Uid\Uuid;

/**
 * Provider for LabelTransferLink items.
 */
class LabelTransferLinkItemProvider
{
    public function __construct(
        private readonly LabelTransferLinkRepository $labelTransferLinkRepository,
    ) {
    }

    public function provide(string $id): LabelTransferLinkApiResource|null
    {
        $uuid = Uuid::fromRfc4122($id);
        $link = $this->labelTransferLinkRepository->find($uuid);

        if (! $link instanceof LabelTransferLink) {
            return null;
        }

        return $this->transformToApiResource($link);
    }

    private function transformToApiResource(LabelTransferLink $labelTransferLink): LabelTransferLinkApiResource
    {
        $labelTransferLinkApiResource             = new LabelTransferLinkApiResource();
        $labelTransferLinkApiResource->id         = $labelTransferLink->getId()?->toRfc4122();
        $labelTransferLinkApiResource->labelId    = $labelTransferLink->getLabel()->getId()?->toRfc4122() ?? '';
        $labelTransferLinkApiResource->transferId = $labelTransferLink->getTransfer()->getId()?->toRfc4122() ?? '';
        $labelTransferLinkApiResource->labelName  = $labelTransferLink->getLabel()->getName();
        $labelTransferLinkApiResource->isManual   = $labelTransferLink->isManual();
        $labelTransferLinkApiResource->isArchived = $labelTransferLink->isArchived();

        return $labelTransferLinkApiResource;
    }
}
