<?php

declare(strict_types=1);

namespace App\Message;

class MultiCsvFileProcessingMessage
{
    /** @param array<array{filePath: string, originalFileName: string, bankType: string}> $files */
    public function __construct(
        public readonly array $files,
        public readonly string $userId,
        public readonly string $uploadId,
    ) {
    }
}
