<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260331192913 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add archived field to label_transfer_link table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE label_transfer_link ADD is_archived BOOLEAN NOT NULL DEFAULT FALSE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE label_transfer_link DROP is_archived');
    }
}
