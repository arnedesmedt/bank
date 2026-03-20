<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Transaction IDs in Belfius exports are unique per (year, own account), not globally.
 * The previous migration added a unique index on (transaction_id, EXTRACT(YEAR FROM date)),
 * which is still too broad: two different internal accounts can legitimately share the same
 * transaction ID in the same year (each account has its own numbering sequence).
 *
 * There is no clean way to express (transaction_id, year, own_account_id) as a DB-level
 * unique constraint without adding a dedicated own_account_id column.  Since the fingerprint
 * unique index already guarantees true row uniqueness, the transaction-ID uniqueness check
 * lives at the application layer (TransferService::saveTransfer) and does not need its own
 * DB constraint.
 *
 * This migration:
 *   1. Drops the incorrect uniq_transfer_transaction_year partial unique index.
 *   2. Adds a plain (non-unique) index on transaction_id for lookup performance.
 */
final class Version20260319000002 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Drop per-year transaction_id unique index; uniqueness is now (transactionId, year, ownAccount) enforced at application level';
    }

    public function up(Schema $schema): void
    {
        // Drop the partial unique index that was too broad (year only, no account scope)
        $this->addSql('DROP INDEX IF EXISTS uniq_transfer_transaction_year');

        // Plain lookup index so findByTransactionId queries remain fast
        $this->addSql(
            'CREATE INDEX IF NOT EXISTS idx_transaction_id ON transfers (transaction_id) WHERE transaction_id IS NOT NULL',
        );
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS idx_transaction_id');

        // Restore the previous (year-scoped) unique index
        $this->addSql(
            "CREATE UNIQUE INDEX uniq_transfer_transaction_year
             ON transfers (transaction_id, EXTRACT(YEAR FROM date))
             WHERE transaction_id IS NOT NULL",
        );
    }
}

