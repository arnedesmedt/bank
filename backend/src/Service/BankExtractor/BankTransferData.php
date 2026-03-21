<?php

declare(strict_types=1);

namespace App\Service\BankExtractor;

use DateTimeImmutable;

/**
 * Structured transfer data extracted from a bank CSV export.
 *
 * All account numbers are already normalized to the 'BEXX XXXX XXXX XXXX' format.
 * The amount is a plain numeric string using '.' as the decimal separator
 * (e.g. "1950.00" for incoming, "-22.50" for outgoing from the own account perspective).
 */
readonly class BankTransferData
{
    public function __construct(
        public DateTimeImmutable $date,
        /** Normalized IBAN of the own (internal) account */
        public string $ownAccountNumber,
        /** Normalized IBAN of the counter-party account, or null when not available */
        public string|null $counterAccountNumber,
        /** Human-readable name of the counter-party, or null when not available */
        public string|null $counterAccountName,
        /**
         * Signed numeric amount string, decimal separator is '.'.
         * Positive  → money received by own account.
         * Negative  → money sent from own account.
         *
         * @var numeric-string
         */
        public string $amount,
        public string $reference,
        public string|null $transactionId,
    ) {
    }
}
