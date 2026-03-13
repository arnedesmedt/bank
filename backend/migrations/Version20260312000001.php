<?php
declare(strict_types=1);
namespace DoctrineMigrations;
use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;
/**
 * Migration: Normalize existing bank account numbers to 'BEXX XXXX XXXX XXXX' format.
 *
 * T016 [US1]: Normalizes all Belgian IBAN account numbers in bank_accounts table.
 * Numbers that cannot be normalized (non-Belgian IBAN or invalid format) are set to NULL.
 *
 * Note: Hash values are NOT recalculated here. Existing hashes (set via MD5(uuid::text)
 * in Version20260311000001) remain as-is. New accounts created via the API will use SHA-256.
 */
final class Version20260312000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'US1: Normalize existing bank account numbers to BEXX XXXX XXXX XXXX format';
    }
    public function up(Schema $schema): void
    {
        // Step 1: Strip all whitespace from existing account numbers
        $this->addSql(
            "UPDATE bank_accounts
             SET account_number = REGEXP_REPLACE(account_number, '\s+', '', 'g')
             WHERE account_number IS NOT NULL"
        );
        // Step 2: Uppercase valid Belgian IBANs (BE + 14 digits)
        $this->addSql(
            "UPDATE bank_accounts
             SET account_number = UPPER(account_number)
             WHERE account_number IS NOT NULL
               AND account_number ~ '^[Bb][Ee][0-9]{14}$'"
        );
        // Step 3: Format valid Belgian IBANs with spaces: 'BEXX XXXX XXXX XXXX'
        $this->addSql(
            "UPDATE bank_accounts
             SET account_number = CONCAT(
                 SUBSTRING(account_number, 1, 4), ' ',
                 SUBSTRING(account_number, 5, 4), ' ',
                 SUBSTRING(account_number, 9, 4), ' ',
                 SUBSTRING(account_number, 13, 4)
             )
             WHERE account_number IS NOT NULL
               AND account_number ~ '^BE[0-9]{14}$'"
        );
        // Step 4: Set to NULL any account numbers that could not be normalized
        $this->addSql(
            "UPDATE bank_accounts
             SET account_number = NULL
             WHERE account_number IS NOT NULL
               AND account_number !~ '^BE[0-9]{4} [0-9]{4} [0-9]{4} [0-9]{4}$'"
        );
    }
    public function down(Schema $schema): void
    {
        // Account number normalization cannot be trivially reversed;
        // this migration is intentionally irreversible for data normalization.
        $this->addSql('SELECT 1'); // no-op down migration
    }
}
