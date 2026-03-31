<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\LabelTransferLink;
use App\Repository\LabelTransferLinkRepository;
use App\Service\LabelingService;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Uid\Uuid;

use function is_string;
use function str_contains;

/**
 * Processor for archiving/unarchiving LabelTransferLink items.
 *
 * @template-implements ProcessorInterface<mixed, mixed>
 */
class LabelTransferLinkArchiveProcessor implements ProcessorInterface
{
    public function __construct(
        private readonly LabelTransferLinkRepository $labelTransferLinkRepository,
        private readonly LabelingService $labelingService,
    ) {
    }

    /**
     * @param array<string, mixed> $uriVariables
     * @param array<string, mixed> $context
     */
    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): Response
    {
        $id = $uriVariables['id'] ?? null;

        if (! is_string($id)) {
            return new Response('Invalid ID format', 400);
        }

        $uuid = Uuid::fromRfc4122($id);
        $link = $this->labelTransferLinkRepository->find($uuid);

        if (! $link instanceof LabelTransferLink) {
            return new Response('Label transfer link not found', 404);
        }

        $path = $operation->getName() ?? '';

        try {
            if (str_contains($path, 'archive')) {
                $this->labelingService->archiveLabelTransferLink($link);

                return new Response('Label transfer link archived successfully', 200);
            }

            if (str_contains($path, 'unarchive')) {
                $this->labelingService->unarchiveLabelTransferLink($link);

                return new Response('Label transfer link unarchived successfully', 200);
            }
        } catch (InvalidArgumentException $invalidArgumentException) {
            return new Response($invalidArgumentException->getMessage(), 400);
        }

        return new Response('Invalid operation', 400);
    }
}
