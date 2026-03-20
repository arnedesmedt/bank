<?php

declare(strict_types=1);

namespace App\ApiResource;

class TransferImportResult
{
    public string $message = '';

    public int $imported = 0;

    /** Total skipped (sum of the three breakdown counters below) */
    public int $skipped = 0;

    /** Skipped because a transfer with the same transaction ID or fingerprint already exists */
    public int $skippedDuplicates = 0;

    /** Skipped because both accounts are internal and the reversed transfer was cancelled out */
    public int $skippedReversedInternal = 0;

    /** Skipped because the row contained missing or invalid data */
    public int $skippedInvalidData = 0;

    /** @var array<string> */
    public array $errors = [];
}
