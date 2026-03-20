<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Belfius resets transaction IDs at the start of each year, so a bare unique
 * constraint on transaction_id causes legitimate transfers from a new year to
 * be incorrectly rejected as duplicates.
 *
 * This migration:
 *   1. Drops the global unique index on transaction_id.
 *   2. Replaces it with a per-year unique index using a functional expression
 *      on EXTRACT(YEAR FROM date), so the combination (transaction_id, year)
 *      is unique instead of transaction_id alone.
 *   3. Keeps the plain idx_transaction_id lookup index for query performance.
 */
final class Version20260319000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Scope transaction_id uniqueness to the transfer year (Belfius resets IDs annually)';
    }

    public function up(Schema $schema): void
    {
        // Drop the old global unique constraint on transaction_id
        $this->addSql('DROP INDEX IF EXISTS uniq_802a39182fc0cb0f');

        // Drop the plain lookup index — we will recreate it as part of the unique index below
        $this->addSql('DROP INDEX IF EXISTS idx_transaction_id');

        // New unique index: (transaction_id, year-of-date), NULL transaction_ids are excluded
        // so rows without a transaction ID are never blocked by this constraint.
        $this->addSql(
            "CREATE UNIQUE INDEX uniq_transfer_transaction_year
             ON transfers (transaction_id, EXTRACT(YEAR FROM date))
             WHERE transaction_id IS NOT NULL",
        );
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS uniq_transfer_transaction_year');

        // Restore the original unique index and plain lookup index
        $this->addSql(
            'CREATE UNIQUE INDEX uniq_802a39182fc0cb0f ON transfers (transaction_id)',
        );
        $this->addSql(
            'CREATE INDEX idx_transaction_id ON transfers (transaction_id)',
        );
    }
}

