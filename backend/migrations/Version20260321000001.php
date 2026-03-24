<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Add is_reversed column to the transfers table.
 *
 * Reversed internal transfers (both legs of a Belfius dual-export pair) are now
 * kept in the database instead of being deleted.  Keeping them ensures that
 * re-importing the same CSV files is idempotent — the fingerprint unique constraint
 * prevents a second insertion.
 *
 * All collection queries filter on is_reversed = false so reversed transfers
 * are invisible to the rest of the application.
 */
final class Version20260321000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add is_reversed flag to transfers; mark reversed internal pairs instead of deleting them';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE transfers ADD COLUMN is_reversed BOOLEAN NOT NULL DEFAULT FALSE');
        $this->addSql('CREATE INDEX idx_is_reversed ON transfers (is_reversed)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS idx_is_reversed');
        $this->addSql('ALTER TABLE transfers DROP COLUMN is_reversed');
    }
}

