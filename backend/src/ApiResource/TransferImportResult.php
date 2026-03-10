<?php

declare(strict_types=1);

namespace App\ApiResource;

class TransferImportResult
{
    public string $message = '';

    public int $imported = 0;

    public int $skipped = 0;

    /** @var array<string> */
    public array $errors = [];
}
