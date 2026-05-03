<?php

declare(strict_types=1);

namespace App\MessageHandler;

use App\Message\CsvFileProcessingMessage;
use App\Repository\UserRepository;
use App\Service\CsvImportService;
use Psr\Log\LoggerInterface;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;
use Throwable;

use function count;
use function file_exists;
use function unlink;

#[AsMessageHandler]
class CsvFileProcessingMessageHandler
{
    public function __construct(
        private readonly CsvImportService $csvImportService,
        private readonly UserRepository $userRepository,
        private readonly LoggerInterface $logger,
    ) {
    }

    public function __invoke(CsvFileProcessingMessage $csvFileProcessingMessage): void
    {
        try {
            $this->logger->info('Starting CSV file processing', [
                'uploadId' => $csvFileProcessingMessage->uploadId,
                'fileName' => $csvFileProcessingMessage->originalFileName,
                'userId' => $csvFileProcessingMessage->userId,
            ]);

            // Verify user exists
            $user = $this->userRepository->find($csvFileProcessingMessage->userId);
            if ($user === null) {
                $this->logger->error('User not found for CSV processing', [
                    'uploadId' => $csvFileProcessingMessage->uploadId,
                    'userId' => $csvFileProcessingMessage->userId,
                ]);

                return;
            }

            // Process the CSV file
            $result = $this->csvImportService->importCsv(
                $csvFileProcessingMessage->filePath,
                $csvFileProcessingMessage->bankType,
                $csvFileProcessingMessage->originalFileName,
            );

            $this->logger->info('CSV file processing completed', [
                'uploadId' => $csvFileProcessingMessage->uploadId,
                'imported' => $result['imported'],
                'skipped' => $result['skippedDuplicates']
                    + $result['skippedReversedInternal']
                    + $result['skippedInvalidData'],
                'errors' => count($result['errors']),
            ]);

            // Clean up the temporary file
            if (file_exists($csvFileProcessingMessage->filePath)) {
                unlink($csvFileProcessingMessage->filePath);
            }
        } catch (Throwable $throwable) {
            $this->logger->error('Error processing CSV file', [
                'uploadId' => $csvFileProcessingMessage->uploadId,
                'fileName' => $csvFileProcessingMessage->originalFileName,
                'error' => $throwable->getMessage(),
                'trace' => $throwable->getTraceAsString(),
            ]);

            // Do NOT delete the file here – the message may be retried and the file
            // must still exist for the next attempt.  Orphaned files are cleaned up
            // by the MultiCsvFileProcessingMessageHandler or a future scheduled task.

            throw $throwable;
        }
    }
}
