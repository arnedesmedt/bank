<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;
use Override;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250325204500 extends AbstractMigration
{
    #[Override]
    public function getDescription(): string
    {
        return 'Create tables for Symfony Messenger';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(
            'CREATE TABLE messenger_messages ('
            . 'id BIGSERIAL AUTO_INCREMENT NOT NULL, '
            . 'body LONGTEXT NOT NULL, '
            . 'headers LONGTEXT NOT NULL, '
            . 'queue_name VARCHAR(255) NOT NULL, '
            . "created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', "
            . "available_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)', "
            . "delivered_at DATETIME DEFAULT NULL COMMENT '(DC2Type:datetime_immutable)', "
            . 'PRIMARY KEY(id)'
            . ')',
        );
        $this->addSql('CREATE INDEX IDX_MESSENGER_MESSAGES_QUEUE_NAME ON messenger_messages (queue_name)');
        $this->addSql('CREATE INDEX IDX_MESSENGER_MESSAGES_AVAILABLE_AT ON messenger_messages (available_at)');
        $this->addSql('CREATE INDEX IDX_MESSENGER_MESSAGES_DELIVERED_AT ON messenger_messages (delivered_at)');
    }

    #[Override]
    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP TABLE messenger_messages');
    }
}
