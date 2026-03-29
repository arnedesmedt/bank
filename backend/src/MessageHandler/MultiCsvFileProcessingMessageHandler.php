<?php

declare(strict_types=1);

namespace App\MessageHandler;

use App\Message\CsvFileProcessingMessage;
use App\Message\MultiCsvFileProcessingMessage;
use Psr\Log\LoggerInterface;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;
use Symfony\Component\Messenger\MessageBusInterface;

use function basename;
use function count;

#[AsMessageHandler]
class MultiCsvFileProcessingMessageHandler
{
    public function __construct(
        private readonly MessageBusInterface $messageBus,
        private readonly LoggerInterface $logger,
    ) {
    }

    public function __invoke(MultiCsvFileProcessingMessage $multiCsvFileProcessingMessage): void
    {
        $this->logger->info('Starting multi CSV file processing', [
            'uploadId' => $multiCsvFileProcessingMessage->uploadId,
            'fileCount' => count($multiCsvFileProcessingMessage->files),
            'userId' => $multiCsvFileProcessingMessage->userId,
        ]);

        foreach ($multiCsvFileProcessingMessage->files as $file) {
            $csvMessage = new CsvFileProcessingMessage(
                $file['filePath'],
                $file['originalFileName'],
                $file['bankType'],
                $multiCsvFileProcessingMessage->userId,
                $multiCsvFileProcessingMessage->uploadId . '_' . basename($file['filePath']),
            );

            $this->messageBus->dispatch($csvMessage);
        }

        $this->logger->info('Dispatched individual CSV processing messages', [
            'uploadId' => $multiCsvFileProcessingMessage->uploadId,
            'fileCount' => count($multiCsvFileProcessingMessage->files),
        ]);
    }
}
