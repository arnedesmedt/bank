<?php

declare(strict_types=1);

namespace App\Tests\DataFixtures;

use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\ORM\EntityManager;
use Doctrine\Persistence\ObjectManager;

use function assert;

class OAuth2ClientFixtures extends Fixture
{
    public const string DEFAULT_CLIENT_IDENTIFIER = 'bank_app';

    public function load(ObjectManager $manager): void
    {
        assert($manager instanceof EntityManager);

        // Create OAuth2 client for tests
        $manager->getConnection()->executeStatement("
            INSERT INTO oauth2_client
                (identifier, name, secret, redirect_uris, grants, scopes, active, allow_plain_text_pkce)
            VALUES (
                '" . self::DEFAULT_CLIENT_IDENTIFIER . "',
                'Bank Application',
                NULL,
                'http://localhost:3000',
                'password,refresh_token',
                'email',
                true,
                false
            )
            ON CONFLICT (identifier) DO NOTHING
        ");
    }
}
