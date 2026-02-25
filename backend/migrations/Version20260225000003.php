<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Create OAuth2 tables for League OAuth2 Server
 */
final class Version20260225000003 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create OAuth2 server tables (clients, access tokens, refresh tokens, auth codes)';
    }

    public function up(Schema $schema): void
    {
        // OAuth2 Clients
        $this->addSql('CREATE TABLE oauth2_client (
            identifier VARCHAR(32) PRIMARY KEY,
            name VARCHAR(255) DEFAULT NULL,
            secret VARCHAR(128) DEFAULT NULL,
            redirect_uris TEXT DEFAULT NULL,
            grants TEXT DEFAULT NULL,
            scopes TEXT DEFAULT NULL,
            active BOOLEAN DEFAULT true NOT NULL,
            allow_plain_text_pkce BOOLEAN DEFAULT false NOT NULL
        )');

        // OAuth2 Access Tokens
        $this->addSql('CREATE TABLE oauth2_access_token (
            identifier VARCHAR(80) PRIMARY KEY,
            client VARCHAR(32) NOT NULL,
            expiry TIMESTAMP NOT NULL,
            user_identifier VARCHAR(128) DEFAULT NULL,
            scopes TEXT DEFAULT NULL,
            revoked BOOLEAN DEFAULT false NOT NULL
        )');
        $this->addSql('CREATE INDEX IDX_454D9673C7440455 ON oauth2_access_token (client)');

        // OAuth2 Refresh Tokens
        $this->addSql('CREATE TABLE oauth2_refresh_token (
            identifier VARCHAR(80) PRIMARY KEY,
            access_token VARCHAR(80) NOT NULL,
            expiry TIMESTAMP NOT NULL,
            revoked BOOLEAN DEFAULT false NOT NULL
        )');
        $this->addSql('CREATE INDEX IDX_4DD90732B6A2DD68 ON oauth2_refresh_token (access_token)');

        // OAuth2 Authorization Codes
        $this->addSql('CREATE TABLE oauth2_authorization_code (
            identifier VARCHAR(80) PRIMARY KEY,
            client VARCHAR(32) NOT NULL,
            expiry TIMESTAMP NOT NULL,
            user_identifier VARCHAR(128) DEFAULT NULL,
            scopes TEXT DEFAULT NULL,
            revoked BOOLEAN DEFAULT false NOT NULL
        )');
        $this->addSql('CREATE INDEX IDX_509FEF5FC7440455 ON oauth2_authorization_code (client)');

        // Insert default test client
        $this->addSql("INSERT INTO oauth2_client (identifier, name, secret, redirect_uris, grants, scopes, active)
            VALUES (
                'bank_app',
                'Bank Application',
                NULL,
                'http://localhost:3000',
                'password,refresh_token',
                'email',
                true
            )");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS oauth2_authorization_code');
        $this->addSql('DROP TABLE IF EXISTS oauth2_refresh_token');
        $this->addSql('DROP TABLE IF EXISTS oauth2_access_token');
        $this->addSql('DROP TABLE IF EXISTS oauth2_client');
    }
}

