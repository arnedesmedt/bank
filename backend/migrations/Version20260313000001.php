<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Migration: Create label_transfer_link join entity table and migrate existing data.
 *
 * This migration introduces the LabelTransferLink entity which replaces the raw
 * many-to-many join table `transfer_label`. The new table adds an `is_manual`
 * flag to distinguish between automatically-assigned labels (by rules) and
 * manually-assigned labels (by explicit user/API action).
 *
 * Existing data from `transfer_label` is migrated as automatic links (is_manual = false),
 * since all prior assignments were rule-based (CSV import auto-labeling).
 * After migration the old `transfer_label` table is dropped.
 */
final class Version20260313000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create label_transfer_link table with is_manual flag; migrate from transfer_label; drop old join table';
    }

    public function up(Schema $schema): void
    {
        // Create new join entity table
        $this->addSql(
            "CREATE TABLE label_transfer_link (
                uuid UUID NOT NULL,
                label_uuid UUID NOT NULL,
                transfer_uuid UUID NOT NULL,
                is_manual BOOLEAN NOT NULL DEFAULT FALSE,
                PRIMARY KEY (uuid),
                CONSTRAINT uq_label_transfer UNIQUE (label_uuid, transfer_uuid),
                CONSTRAINT fk_ltl_label FOREIGN KEY (label_uuid) REFERENCES labels(uuid) ON DELETE CASCADE,
                CONSTRAINT fk_ltl_transfer FOREIGN KEY (transfer_uuid) REFERENCES transfers(uuid) ON DELETE CASCADE
            )"
        );

        $this->addSql('CREATE INDEX idx_ltl_label ON label_transfer_link (label_uuid)');
        $this->addSql('CREATE INDEX idx_ltl_transfer ON label_transfer_link (transfer_uuid)');

        // Migrate existing transfer_label data → label_transfer_link with is_manual = false
        $this->addSql(
            "INSERT INTO label_transfer_link (uuid, label_uuid, transfer_uuid, is_manual)
             SELECT gen_random_uuid(), tl.label_uuid, tl.transfer_uuid, FALSE
             FROM transfer_label tl"
        );

        // Drop the old many-to-many join table
        $this->addSql('DROP TABLE IF EXISTS transfer_label');
    }

    public function down(Schema $schema): void
    {
        // Re-create the old transfer_label table
        $this->addSql(
            "CREATE TABLE transfer_label (
                transfer_uuid UUID NOT NULL,
                label_uuid UUID NOT NULL,
                PRIMARY KEY (transfer_uuid, label_uuid),
                CONSTRAINT fk_tl_transfer FOREIGN KEY (transfer_uuid) REFERENCES transfers(uuid) ON DELETE CASCADE,
                CONSTRAINT fk_tl_label FOREIGN KEY (label_uuid) REFERENCES labels(uuid) ON DELETE CASCADE
            )"
        );

        // Restore data from label_transfer_link (only automatic links to avoid duplicates)
        $this->addSql(
            "INSERT INTO transfer_label (transfer_uuid, label_uuid)
             SELECT ltl.transfer_uuid, ltl.label_uuid
             FROM label_transfer_link ltl"
        );

        // Drop the new table
        $this->addSql('DROP TABLE label_transfer_link');
    }
}

