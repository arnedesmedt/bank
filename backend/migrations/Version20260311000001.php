<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Migration: Backend Account Features (003)
 *
 * Changes:
 * - bank_accounts: add hash (unique), is_internal, total_balance; make account_name/account_number nullable; drop owner_id
 * - transfers: drop owner_id
 * - labels: drop owner_id
 */
final class Version20260311000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '003 Backend Account Features: add hash/isInternal/totalBalance to bank_accounts, make name/number nullable, remove owner from bank_accounts/transfers/labels';
    }

    public function up(Schema $schema): void
    {
        // bank_accounts: drop owner_id FK and column, add new columns, make name/number nullable
        $this->addSql('ALTER TABLE bank_accounts DROP CONSTRAINT FK_FB88842B7E3C61F9');
        $this->addSql('DROP INDEX IDX_FB88842B7E3C61F9');
        $this->addSql('DROP INDEX UNIQ_FB88842BB1A4D127');
        // Add hash as nullable first so existing rows can be backfilled
        $this->addSql('ALTER TABLE bank_accounts ADD hash VARCHAR(64) DEFAULT NULL');
        $this->addSql('ALTER TABLE bank_accounts ADD is_internal BOOLEAN NOT NULL DEFAULT FALSE');
        $this->addSql('ALTER TABLE bank_accounts ADD total_balance NUMERIC(15, 2) NOT NULL DEFAULT 0');
        // Backfill hash for existing rows using MD5 of UUID
        $this->addSql('UPDATE bank_accounts SET hash = MD5(uuid::text) WHERE hash IS NULL');
        // Now enforce NOT NULL, remove defaults, and add unique constraint
        $this->addSql('ALTER TABLE bank_accounts ALTER hash SET NOT NULL');
        $this->addSql('ALTER TABLE bank_accounts ALTER hash DROP DEFAULT');
        $this->addSql('ALTER TABLE bank_accounts ALTER is_internal DROP DEFAULT');
        $this->addSql('ALTER TABLE bank_accounts ALTER total_balance DROP DEFAULT');
        $this->addSql('ALTER TABLE bank_accounts DROP COLUMN owner_id');
        $this->addSql('ALTER TABLE bank_accounts ALTER account_name DROP NOT NULL');
        $this->addSql('ALTER TABLE bank_accounts ALTER account_number DROP NOT NULL');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_FB88842BD1B862B8 ON bank_accounts (hash)');

        // transfers: drop owner_id FK and column
        $this->addSql('ALTER TABLE transfers DROP CONSTRAINT FK_802A39187E3C61F9');
        $this->addSql('DROP INDEX IDX_802A39187E3C61F9');
        $this->addSql('ALTER TABLE transfers DROP COLUMN owner_id');

        // labels: drop owner_id FK and column
        $this->addSql('ALTER TABLE labels DROP CONSTRAINT FK_B5D102117E3C61F9');
        $this->addSql('DROP INDEX IDX_B5D102117E3C61F9');
        $this->addSql('ALTER TABLE labels DROP COLUMN owner_id');
    }

    public function down(Schema $schema): void
    {
        // Reverse bank_accounts changes
        $this->addSql('DROP INDEX UNIQ_FB88842BD1B862B8');
        $this->addSql('ALTER TABLE bank_accounts DROP COLUMN hash');
        $this->addSql('ALTER TABLE bank_accounts DROP COLUMN is_internal');
        $this->addSql('ALTER TABLE bank_accounts DROP COLUMN total_balance');
        $this->addSql('ALTER TABLE bank_accounts ALTER account_name SET NOT NULL');
        $this->addSql('ALTER TABLE bank_accounts ALTER account_number SET NOT NULL');
        $this->addSql('ALTER TABLE bank_accounts ADD owner_id UUID NOT NULL DEFAULT \'00000000-0000-0000-0000-000000000000\'');
        $this->addSql('CREATE INDEX IDX_FB88842B7E3C61F9 ON bank_accounts (owner_id)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_FB88842BB1A4D127 ON bank_accounts (account_number)');
        $this->addSql('ALTER TABLE bank_accounts ADD CONSTRAINT FK_FB88842B7E3C61F9 FOREIGN KEY (owner_id) REFERENCES users (uuid) NOT DEFERRABLE');

        // Reverse transfers changes
        $this->addSql('ALTER TABLE transfers ADD owner_id UUID NOT NULL DEFAULT \'00000000-0000-0000-0000-000000000000\'');
        $this->addSql('CREATE INDEX IDX_802A39187E3C61F9 ON transfers (owner_id)');
        $this->addSql('ALTER TABLE transfers ADD CONSTRAINT FK_802A39187E3C61F9 FOREIGN KEY (owner_id) REFERENCES users (uuid) NOT DEFERRABLE');

        // Reverse labels changes
        $this->addSql('ALTER TABLE labels ADD owner_id UUID NOT NULL DEFAULT \'00000000-0000-0000-0000-000000000000\'');
        $this->addSql('CREATE INDEX IDX_B5D102117E3C61F9 ON labels (owner_id)');
        $this->addSql('ALTER TABLE labels ADD CONSTRAINT FK_B5D102117E3C61F9 FOREIGN KEY (owner_id) REFERENCES users (uuid) NOT DEFERRABLE');
    }
}

