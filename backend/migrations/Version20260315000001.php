<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Migration: Recalculate totalBalance for all bank accounts.
 *
 * The previous balance-update logic was inverted for incoming transfers:
 * fromAccount received +amount (should be -|amount|) and
 * toAccount received -amount (should be +|amount|).
 *
 * This migration resets every account's balance to 0 and recalculates it
 * correctly: fromAccount -= |amount|, toAccount += |amount| for every transfer.
 */
final class Version20260315000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Recalculate totalBalance for all bank accounts using correct from/to signed logic';
    }

    public function up(Schema $schema): void
    {
        // Reset all balances to zero
        $this->addSql('UPDATE bank_accounts SET total_balance = 0');

        // For each transfer: toAccount gains |amount|, fromAccount loses |amount|
        $this->addSql(
            "UPDATE bank_accounts ba
             SET total_balance = ba.total_balance + sub.delta
             FROM (
                 SELECT
                     to_account_id   AS account_uuid,
                     ABS(CAST(amount AS NUMERIC)) AS delta
                 FROM transfers
                 UNION ALL
                 SELECT
                     from_account_id AS account_uuid,
                     -ABS(CAST(amount AS NUMERIC)) AS delta
                 FROM transfers
             ) sub
             WHERE ba.uuid = sub.account_uuid",
        );
    }

    public function down(Schema $schema): void
    {
        // Cannot reliably restore the previous (incorrect) values; reset to zero
        $this->addSql('UPDATE bank_accounts SET total_balance = 0');
    }
}

