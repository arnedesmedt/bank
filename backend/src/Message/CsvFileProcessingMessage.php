<?php

declare(strict_types=1);

namespace App\Message;

class CsvFileProcessingMessage
{
    public function __construct(
        public readonly string $filePath,
        public readonly string $originalFileName,
        public readonly string $bankType,
        public readonly string $userId,
        public readonly string $uploadId,
    ) {
    }
}
