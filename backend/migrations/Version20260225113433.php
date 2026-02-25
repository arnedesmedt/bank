<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Rename id column to uuid in users table
 */
final class Version20260225113433 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Rename id column to uuid in users table';
    }

    public function up(Schema $schema): void
    {
        // Rename id to uuid in users table
        $this->addSql('ALTER TABLE users RENAME COLUMN id TO uuid');
    }

    public function down(Schema $schema): void
    {
        // Rename uuid back to id in users table
        $this->addSql('ALTER TABLE users RENAME COLUMN uuid TO id');
    }
}
