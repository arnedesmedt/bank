<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\ApiResource\TransferImportResult;
use App\Entity\User;
use App\Service\CsvImportService;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\UnauthorizedHttpException;
use Throwable;

use function is_string;

/** @implements ProcessorInterface<null, TransferImportResult> */
class TransferImportProcessor implements ProcessorInterface
{
    public function __construct(
        private readonly CsvImportService $csvImportService,
        private readonly Security $security,
        private readonly RequestStack $requestStack,
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
    ): TransferImportResult {
        $user = $this->security->getUser();
        if (! $user instanceof User) {
            throw new UnauthorizedHttpException('Bearer', 'Not authenticated');
        }

        $request = $this->requestStack->getCurrentRequest();
        if (! $request instanceof Request) {
            throw new BadRequestHttpException('No request available');
        }

        $file = $request->files->get('file');
        if (! $file instanceof UploadedFile) {
            throw new BadRequestHttpException('No file uploaded');
        }

        if (! $file->isValid()) {
            throw new BadRequestHttpException('Invalid file upload');
        }

        $bankTypeParam = $request->request->get('bankType');
        $bankType      = is_string($bankTypeParam) ? $bankTypeParam : 'belfius';

        try {
            $fileName = $file->getClientOriginalName() ?: 'unknown.csv';
            $result   = $this->csvImportService->importCsv(
                $file->getPathname(),
                $bankType,
                $fileName,
            );

            $transferImportResult           = new TransferImportResult();
            $transferImportResult->message  = 'Import completed';
            $transferImportResult->imported = $result['imported'];
            $transferImportResult->skipped  = $result['skipped'];
            $transferImportResult->errors   = $result['errors'];

            return $transferImportResult;
        } catch (Throwable $throwable) {
            throw new BadRequestHttpException($throwable->getMessage(), $throwable);
        }
    }
}
