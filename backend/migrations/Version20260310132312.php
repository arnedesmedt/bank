<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260310132312 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE bank_accounts (uuid UUID NOT NULL, account_name VARCHAR(255) NOT NULL, account_number VARCHAR(255) NOT NULL, owner_id UUID NOT NULL, PRIMARY KEY (uuid))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_FB88842BB1A4D127 ON bank_accounts (account_number)');
        $this->addSql('CREATE INDEX IDX_FB88842B7E3C61F9 ON bank_accounts (owner_id)');
        $this->addSql('CREATE TABLE labels (uuid UUID NOT NULL, name VARCHAR(255) NOT NULL, linked_regexes JSON NOT NULL, max_value NUMERIC(10, 2) DEFAULT NULL, max_percentage NUMERIC(5, 2) DEFAULT NULL, parent_label_id UUID DEFAULT NULL, owner_id UUID NOT NULL, PRIMARY KEY (uuid))');
        $this->addSql('CREATE INDEX IDX_B5D10211AC7483E8 ON labels (parent_label_id)');
        $this->addSql('CREATE INDEX IDX_B5D102117E3C61F9 ON labels (owner_id)');
        $this->addSql('CREATE TABLE label_bank_account (label_uuid UUID NOT NULL, bank_account_uuid UUID NOT NULL, PRIMARY KEY (label_uuid, bank_account_uuid))');
        $this->addSql('CREATE INDEX IDX_797B5F31D47C56A ON label_bank_account (label_uuid)');
        $this->addSql('CREATE INDEX IDX_797B5F39D743017 ON label_bank_account (bank_account_uuid)');
        $this->addSql('CREATE TABLE transfers (uuid UUID NOT NULL, amount NUMERIC(10, 2) NOT NULL, date TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, reference TEXT NOT NULL, csv_source VARCHAR(255) NOT NULL, transaction_id VARCHAR(255) DEFAULT NULL, fingerprint VARCHAR(255) NOT NULL, is_internal BOOLEAN NOT NULL, from_account_id UUID NOT NULL, to_account_id UUID NOT NULL, owner_id UUID NOT NULL, PRIMARY KEY (uuid))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_802A39182FC0CB0F ON transfers (transaction_id)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_802A3918FC0B754A ON transfers (fingerprint)');
        $this->addSql('CREATE INDEX IDX_802A3918B0CF99BD ON transfers (from_account_id)');
        $this->addSql('CREATE INDEX IDX_802A3918BC58BDC7 ON transfers (to_account_id)');
        $this->addSql('CREATE INDEX IDX_802A39187E3C61F9 ON transfers (owner_id)');
        $this->addSql('CREATE INDEX idx_transaction_id ON transfers (transaction_id)');
        $this->addSql('CREATE INDEX idx_fingerprint ON transfers (fingerprint)');
        $this->addSql('CREATE INDEX idx_date ON transfers (date)');
        $this->addSql('CREATE TABLE transfer_label (transfer_uuid UUID NOT NULL, label_uuid UUID NOT NULL, PRIMARY KEY (transfer_uuid, label_uuid))');
        $this->addSql('CREATE INDEX IDX_AD23A5B0E98A7CC4 ON transfer_label (transfer_uuid)');
        $this->addSql('CREATE INDEX IDX_AD23A5B01D47C56A ON transfer_label (label_uuid)');
        $this->addSql('ALTER TABLE bank_accounts ADD CONSTRAINT FK_FB88842B7E3C61F9 FOREIGN KEY (owner_id) REFERENCES users (uuid) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE labels ADD CONSTRAINT FK_B5D10211AC7483E8 FOREIGN KEY (parent_label_id) REFERENCES labels (uuid) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE labels ADD CONSTRAINT FK_B5D102117E3C61F9 FOREIGN KEY (owner_id) REFERENCES users (uuid) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE label_bank_account ADD CONSTRAINT FK_797B5F31D47C56A FOREIGN KEY (label_uuid) REFERENCES labels (uuid) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE label_bank_account ADD CONSTRAINT FK_797B5F39D743017 FOREIGN KEY (bank_account_uuid) REFERENCES bank_accounts (uuid) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE transfers ADD CONSTRAINT FK_802A3918B0CF99BD FOREIGN KEY (from_account_id) REFERENCES bank_accounts (uuid) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE transfers ADD CONSTRAINT FK_802A3918BC58BDC7 FOREIGN KEY (to_account_id) REFERENCES bank_accounts (uuid) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE transfers ADD CONSTRAINT FK_802A39187E3C61F9 FOREIGN KEY (owner_id) REFERENCES users (uuid) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE transfer_label ADD CONSTRAINT FK_AD23A5B0E98A7CC4 FOREIGN KEY (transfer_uuid) REFERENCES transfers (uuid) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE transfer_label ADD CONSTRAINT FK_AD23A5B01D47C56A FOREIGN KEY (label_uuid) REFERENCES labels (uuid) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE oauth2_access_token ALTER identifier TYPE CHAR(80)');
        $this->addSql('ALTER TABLE oauth2_access_token ALTER revoked DROP DEFAULT');
        $this->addSql('ALTER TABLE oauth2_access_token ADD CONSTRAINT FK_454D9673C7440455 FOREIGN KEY (client) REFERENCES oauth2_client (identifier) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE oauth2_authorization_code ALTER identifier TYPE CHAR(80)');
        $this->addSql('ALTER TABLE oauth2_authorization_code ALTER revoked DROP DEFAULT');
        $this->addSql('ALTER TABLE oauth2_authorization_code ADD CONSTRAINT FK_509FEF5FC7440455 FOREIGN KEY (client) REFERENCES oauth2_client (identifier) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE oauth2_client ALTER name TYPE VARCHAR(128)');
        $this->addSql('ALTER TABLE oauth2_client ALTER name SET NOT NULL');
        $this->addSql('ALTER TABLE oauth2_client ALTER active DROP DEFAULT');
        $this->addSql('ALTER TABLE oauth2_refresh_token ALTER identifier TYPE CHAR(80)');
        $this->addSql('ALTER TABLE oauth2_refresh_token ALTER access_token TYPE CHAR(80)');
        $this->addSql('ALTER TABLE oauth2_refresh_token ALTER access_token DROP NOT NULL');
        $this->addSql('ALTER TABLE oauth2_refresh_token ALTER revoked DROP DEFAULT');
        $this->addSql('ALTER TABLE oauth2_refresh_token ADD CONSTRAINT FK_4DD90732B6A2DD68 FOREIGN KEY (access_token) REFERENCES oauth2_access_token (identifier) ON DELETE SET NULL');
        // $this->addSql('DROP INDEX users_email_key'); // Already exists as unique constraint
        $this->addSql('ALTER TABLE users ALTER uuid DROP DEFAULT');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE bank_accounts DROP CONSTRAINT FK_FB88842B7E3C61F9');
        $this->addSql('ALTER TABLE labels DROP CONSTRAINT FK_B5D10211AC7483E8');
        $this->addSql('ALTER TABLE labels DROP CONSTRAINT FK_B5D102117E3C61F9');
        $this->addSql('ALTER TABLE label_bank_account DROP CONSTRAINT FK_797B5F31D47C56A');
        $this->addSql('ALTER TABLE label_bank_account DROP CONSTRAINT FK_797B5F39D743017');
        $this->addSql('ALTER TABLE transfers DROP CONSTRAINT FK_802A3918B0CF99BD');
        $this->addSql('ALTER TABLE transfers DROP CONSTRAINT FK_802A3918BC58BDC7');
        $this->addSql('ALTER TABLE transfers DROP CONSTRAINT FK_802A39187E3C61F9');
        $this->addSql('ALTER TABLE transfer_label DROP CONSTRAINT FK_AD23A5B0E98A7CC4');
        $this->addSql('ALTER TABLE transfer_label DROP CONSTRAINT FK_AD23A5B01D47C56A');
        $this->addSql('DROP TABLE bank_accounts');
        $this->addSql('DROP TABLE labels');
        $this->addSql('DROP TABLE label_bank_account');
        $this->addSql('DROP TABLE transfers');
        $this->addSql('DROP TABLE transfer_label');
        $this->addSql('ALTER TABLE oauth2_access_token DROP CONSTRAINT FK_454D9673C7440455');
        $this->addSql('ALTER TABLE oauth2_access_token ALTER identifier TYPE VARCHAR(80)');
        $this->addSql('ALTER TABLE oauth2_access_token ALTER revoked SET DEFAULT false');
        $this->addSql('ALTER TABLE oauth2_authorization_code DROP CONSTRAINT FK_509FEF5FC7440455');
        $this->addSql('ALTER TABLE oauth2_authorization_code ALTER identifier TYPE VARCHAR(80)');
        $this->addSql('ALTER TABLE oauth2_authorization_code ALTER revoked SET DEFAULT false');
        $this->addSql('ALTER TABLE oauth2_client ALTER name TYPE VARCHAR(255)');
        $this->addSql('ALTER TABLE oauth2_client ALTER name DROP NOT NULL');
        $this->addSql('ALTER TABLE oauth2_client ALTER active SET DEFAULT true');
        $this->addSql('ALTER TABLE oauth2_refresh_token DROP CONSTRAINT FK_4DD90732B6A2DD68');
        $this->addSql('ALTER TABLE oauth2_refresh_token ALTER identifier TYPE VARCHAR(80)');
        $this->addSql('ALTER TABLE oauth2_refresh_token ALTER revoked SET DEFAULT false');
        $this->addSql('ALTER TABLE oauth2_refresh_token ALTER access_token TYPE VARCHAR(80)');
        $this->addSql('ALTER TABLE oauth2_refresh_token ALTER access_token SET NOT NULL');
        $this->addSql('ALTER TABLE users ALTER uuid SET DEFAULT \'uuid_generate_v4()\'');
        $this->addSql('CREATE UNIQUE INDEX users_email_key ON users (email)');
    }
}
