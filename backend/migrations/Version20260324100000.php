<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Add amount_before_refund column to the transfers table.
 *
 * This column stores the original amount before any refunds are subtracted.
 * It is nullable for backward compatibility.
 */
final class Version20260324100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add amount_before_refund column to transfers table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE transfers ADD COLUMN amount_before_refund NUMERIC(10, 2) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE transfers DROP COLUMN amount_before_refund');
    }
}

