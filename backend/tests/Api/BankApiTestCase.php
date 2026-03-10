<?php

declare(strict_types=1);

namespace App\Tests\Api;

use ApiPlatform\Symfony\Bundle\Test\ApiTestCase;
use ApiPlatform\Symfony\Bundle\Test\Response;
use App\Tests\DataFixtures\OAuth2ClientFixtures;
use App\Tests\Factory\UserFactory;
use App\Tests\Story\GlobalFixtures;
use Doctrine\Bundle\DoctrineBundle\Registry;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

use function assert;
use function is_array;
use function is_string;
use function json_decode;

abstract class BankApiTestCase extends ApiTestCase
{
    use ResetDatabase;
    use Factories;

    protected function setUp(): void
    {
        parent::setUp();

        $passwordHasher = static::getContainer()->get(UserPasswordHasherInterface::class);
        assert($passwordHasher instanceof UserPasswordHasherInterface);
        UserFactory::setPasswordHasher($passwordHasher);

        GlobalFixtures::load();

        $container = static::getContainer();
        $doctrine  = $container->get('doctrine');
        assert($doctrine instanceof Registry);
        $objectManager        = $doctrine->getManager();
        $oAuth2ClientFixtures = new OAuth2ClientFixtures();
        $oAuth2ClientFixtures->load($objectManager);
    }

    protected function getToken(
        string $email = UserFactory::ADMIN_EMAIL,
        string $password = UserFactory::ADMIN_PASSWORD,
    ): string {
        $client = static::createClient();
        $client->request('POST', '/token', [
            'headers' => ['Content-Type' => 'application/json'],
            'json'    => [
                'grant_type' => 'password',
                'username'   => $email,
                'password'   => $password,
                'client_id'  => OAuth2ClientFixtures::DEFAULT_CLIENT_IDENTIFIER,
            ],
        ]);

        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);

        assert(is_array($data));
        assert(isset($data['access_token']) && is_string($data['access_token']));

        return $data['access_token'];
    }
}
