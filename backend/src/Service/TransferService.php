<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\BankAccount;
use App\Entity\Transfer;
use App\Repository\BankAccountRepository;
use App\Repository\TransferRepository;
use DateTimeImmutable;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;

use function bcsub;
use function ltrim;

class TransferService
{
    public function __construct(
        private readonly TransferRepository $transferRepository,
        private readonly BankAccountRepository $bankAccountRepository,
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

    /**
     * Check if a reversed internal transfer already exists.
     * Used to filter out duplicate mirrored internal transfers.
     */
    public function hasReversedInternalTransfer(
        BankAccount $fromAccount,
        BankAccount $toAccount,
        string $amount,
        DateTimeImmutable $date,
    ): bool {
        return $this->transferRepository->findReversedInternalTransfer(
            $fromAccount,
            $toAccount,
            $amount,
            $date,
        ) instanceof Transfer;
    }

    /**
     * T018: Find and delete the reversed internal transfer, reversing its balance impact.
     *
     * When a new internal transfer matches a previously saved reversed internal transfer
     * (same amount negated, same date, accounts switched), we must:
     * 1. Undo the balance updates that were applied when the reversed transfer was saved.
     * 2. Delete the reversed transfer from the database.
     *
     * This ensures "neither transfer is persisted" per the spec.
     * Returns true if a reversed transfer was found and deleted, false otherwise.
     */
    public function deleteReversedInternalTransfer(
        BankAccount $fromAccount,
        BankAccount $toAccount,
        string $amount,
        DateTimeImmutable $date,
    ): bool {
        $reversed = $this->transferRepository->findReversedInternalTransfer(
            $fromAccount,
            $toAccount,
            $amount,
            $date,
        );

        if (! $reversed instanceof Transfer) {
            return false;
        }

        // Undo balance updates for the reversed transfer.
        // With the fixed balance logic, when the reversed transfer was saved:
        //   reversedFrom (= toAccount) lost  |reversedAmount|  (balance -= |reversedAmount|)
        //   reversedTo   (= fromAccount) gained |reversedAmount| (balance += |reversedAmount|)
        // To undo: apply the OPPOSITE of those deltas.
        $bankAccount       = $reversed->getFromAccount();
        $reversedToAccount = $reversed->getToAccount();
        $reversedAmount    = $reversed->getAmount();
        $absReversedAmount = ltrim($reversedAmount, '-');

        // Restore from-account (give back what it lost)
        $bankAccount->adjustBalance($absReversedAmount);
        $this->bankAccountRepository->save($bankAccount, true);

        // Restore to-account (take back what it gained)
        $reversedToAccount->adjustBalance(bcsub('0', $absReversedAmount, 2));
        $this->bankAccountRepository->save($reversedToAccount, true);

        $this->transferRepository->remove($reversed, true);

        return true;
    }
}
