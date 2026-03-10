<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Transfer;
use App\Repository\TransferRepository;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;

class TransferService
{
    public function __construct(
        private readonly TransferRepository $transferRepository,
    ) {
    }

    /**
     * Save transfer with idempotency check.
     * Returns true if transfer was saved, false if it was a duplicate.
     */
    public function saveTransfer(Transfer $transfer): bool
    {
        // Check for duplicate by transaction ID
        if ($transfer->getTransactionId() !== null) {
            $existing = $this->transferRepository->findByTransactionId($transfer->getTransactionId());
            if ($existing instanceof Transfer) {
                return false; // Duplicate found
            }
        }

        // Check for duplicate by fingerprint
        $existing = $this->transferRepository->findByFingerprint($transfer->getFingerprint());
        if ($existing instanceof Transfer) {
            return false; // Duplicate found
        }

        try {
            $this->transferRepository->save($transfer, true);

            return true;
        } catch (UniqueConstraintViolationException) {
            // Race condition: another process saved the same transfer
            return false;
        }
    }
}
