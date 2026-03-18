<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Migration: Add parent_transfer_uuid to transfers for refund/parent-child logic.
 *
 * This enables marking a transfer as a refund of another transfer.
 * The column is nullable and self-referencing (transfers.uuid).
 * ON DELETE SET NULL ensures orphaned refunds are handled gracefully.
 */
final class Version20260317000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add parent_transfer_uuid column to transfers table for refund/parent-child relationship';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(
            'ALTER TABLE transfers ADD COLUMN IF NOT EXISTS parent_transfer_uuid UUID DEFAULT NULL',
        );
        $this->addSql(
            'ALTER TABLE transfers ADD CONSTRAINT fk_transfer_parent_transfer
             FOREIGN KEY (parent_transfer_uuid)
             REFERENCES transfers (uuid)
             ON DELETE SET NULL
             DEFERRABLE INITIALLY DEFERRED',
        );
        $this->addSql(
            'CREATE INDEX IF NOT EXISTS idx_transfer_parent ON transfers (parent_transfer_uuid)',
        );
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS idx_transfer_parent');
        $this->addSql('ALTER TABLE transfers DROP CONSTRAINT IF EXISTS fk_transfer_parent_transfer');
        $this->addSql('ALTER TABLE transfers DROP COLUMN IF EXISTS parent_transfer_uuid');
    }
}

