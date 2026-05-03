<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\ApiResource\TransferImportResult;
use App\Entity\User;
use App\Message\CsvFileProcessingMessage;
use App\Message\MultiCsvFileProcessingMessage;
use RuntimeException;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\UnauthorizedHttpException;
use Symfony\Component\Messenger\MessageBusInterface;
use Symfony\Component\Uid\Uuid;
use Throwable;

use function count;
use function file_exists;
use function is_dir;
use function is_string;
use function mkdir;
use function move_uploaded_file;
use function sprintf;
use function uniqid;
use function unlink;

/** @implements ProcessorInterface<null, TransferImportResult> */
class TransferImportProcessor implements ProcessorInterface
{
    public function __construct(
        private readonly MessageBusInterface $messageBus,
        private readonly Security $security,
        private readonly RequestStack $requestStack,
        #[Autowire('%upload_dir%')]
        private readonly string $uploadDir,
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

        $files = $request->files->all('files');
        if ($files === []) {
            // Fallback for single file upload (backward compatibility)
            $file = $request->files->get('file');
            if (! ($file instanceof UploadedFile)) {
                throw new BadRequestHttpException('No files uploaded');
            }

            $files = [$file];
        }

        $bankTypeParam = $request->request->get('bankType');
        $bankType      = is_string($bankTypeParam) ? $bankTypeParam : 'belfius';

        $uploadId       = Uuid::v4()->toRfc4122();
        $processedFiles = [];

        try {
            foreach ($files as $file) {
                if (! $file instanceof UploadedFile) {
                    continue;
                }

                if (! $file->isValid()) {
                    $fileName = $file->getClientOriginalName();

                    throw new BadRequestHttpException(
                        sprintf('Invalid file upload: %s', $fileName),
                    );
                }

                // Validate file type and determine extension
                if ($bankType === 'belfius_pdf') {
                    $isPdf = $file->getClientMimeType() === 'application/pdf'
                        || $file->getClientOriginalExtension() === 'pdf';

                    if (! $isPdf) {
                        $fileName = $file->getClientOriginalName();

                        throw new BadRequestHttpException(
                            sprintf('File %s must be a PDF file for Belfius PDF import', $fileName),
                        );
                    }

                    $extension = 'pdf';
                } else {
                    $isCsv = $file->getClientMimeType() === 'text/csv'
                        || $file->getClientOriginalExtension() === 'csv';

                    if (! $isCsv) {
                        $fileName = $file->getClientOriginalName();

                        throw new BadRequestHttpException(
                            sprintf('File %s must be a CSV file', $fileName),
                        );
                    }

                    $extension = 'csv';
                }

                // Store file temporarily
                $fileName = $uploadId . '_' . uniqid() . '.' . $extension;
                $filePath = $this->uploadDir . '/' . $fileName;

                if (! is_dir($this->uploadDir)) {
                    mkdir($this->uploadDir, 0755, true);
                }

                if (! move_uploaded_file($file->getPathname(), $filePath)) {
                    $fileName = $file->getClientOriginalName();

                    throw new BadRequestHttpException(
                        sprintf('Failed to store file: %s', $fileName),
                    );
                }

                $processedFiles[] = [
                    'filePath' => $filePath,
                    'originalFileName' => $file->getClientOriginalName() ?: 'unknown.csv',
                    'bankType' => $bankType,
                ];
            }

            if ($processedFiles === []) {
                throw new BadRequestHttpException('No valid files were uploaded');
            }

            // Dispatch message(s) for async processing
            $userId = $user->getId();
            if (! $userId instanceof Uuid) {
                throw new RuntimeException('User ID cannot be null');
            }

            if (count($processedFiles) === 1) {
                $file    = $processedFiles[0];
                $message = new CsvFileProcessingMessage(
                    $file['filePath'],
                    $file['originalFileName'],
                    $file['bankType'],
                    $userId->toRfc4122(),
                    $uploadId,
                );
                $this->messageBus->dispatch($message);
            } else {
                $message = new MultiCsvFileProcessingMessage(
                    $processedFiles,
                    $userId->toRfc4122(),
                    $uploadId,
                );
                $this->messageBus->dispatch($message);
            }

            $transferImportResult           = new TransferImportResult();
            $transferImportResult->message  = sprintf(
                'Files uploaded successfully for processing. Upload ID: %s',
                $uploadId,
            );
            $transferImportResult->imported = 0; // Will be updated async
            $transferImportResult->skipped  = 0; // Will be updated async
            $transferImportResult->errors   = []; // Will be updated async

            return $transferImportResult;
        } catch (Throwable $throwable) {
            // Clean up uploaded files on error
            foreach ($processedFiles as $processedFile) {
                if (! file_exists($processedFile['filePath'])) {
                    continue;
                }

                unlink($processedFile['filePath']);
            }

            throw new BadRequestHttpException($throwable->getMessage(), $throwable);
        }
    }
}
