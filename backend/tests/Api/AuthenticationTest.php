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

class AuthenticationTest extends ApiTestCase
{
    use ResetDatabase;
    use Factories;

    protected function setUp(): void
    {
        parent::setUp();

        // Set password hasher for factories
        $passwordHasher = static::getContainer()->get(UserPasswordHasherInterface::class);
        assert($passwordHasher instanceof UserPasswordHasherInterface);
        UserFactory::setPasswordHasher($passwordHasher);

        // Load global fixtures (admin user)
        GlobalFixtures::load();

        // Load OAuth2 client fixture
        $container = static::getContainer();
        $doctrine  = $container->get('doctrine');
        assert($doctrine instanceof Registry);
        $objectManager        = $doctrine->getManager();
        $oAuth2ClientFixtures = new OAuth2ClientFixtures();
        $oAuth2ClientFixtures->load($objectManager);
    }

    public function testUserCanLoginWithValidCredentials(): void
    {
        $client = static::createClient();

        $client->request('POST', '/token', [
            'headers' => ['Content-Type' => 'application/json'],
            'json' => [
                'grant_type' => 'password',
                'username' => UserFactory::ADMIN_EMAIL,
                'password' => UserFactory::ADMIN_PASSWORD,
                'client_id' => OAuth2ClientFixtures::DEFAULT_CLIENT_IDENTIFIER,
            ],
        ]);

        $response = $client->getResponse();
        assert($response instanceof Response);

        // Then: User receives an access token
        $this->assertResponseIsSuccessful();
        $this->assertResponseHeaderSame('content-type', 'application/json; charset=UTF-8');

        $data = json_decode($response->getContent(), true);
        assert(is_array($data));
        $this->assertArrayHasKey('access_token', $data);
        $this->assertArrayHasKey('token_type', $data);
        $this->assertSame('Bearer', $data['token_type']);
        $this->assertNotEmpty($data['access_token']);
    }

    public function testUserCannotLoginWithInvalidPassword(): void
    {
        // Given: A registered user exists
        UserFactory::new()
            ->withCredentials('john@example.com', 'password123')
            ->create();

        // When: User attempts to login with wrong password
        $client = static::createClient();
        $client->request('POST', '/token', [
            'headers' => ['Content-Type' => 'application/json'],
            'json' => [
                'grant_type' => 'password',
                'username' => 'john@example.com',
                'password' => 'WrongPassword',
                'client_id' => OAuth2ClientFixtures::DEFAULT_CLIENT_IDENTIFIER,
            ],
        ]);

        // Then: Login fails with 400 Bad Request (OAuth2 standard for invalid_grant)
        $this->assertResponseStatusCodeSame(400);
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(false), true);
        assert(is_array($data));
        $this->assertArrayHasKey('error', $data);
        $this->assertSame('invalid_grant', $data['error']);
    }

    public function testUserCannotLoginWithNonexistentEmail(): void
    {
        // Given: User factory initialized but no specific user created

        // When: User attempts to login
        $client = static::createClient();
        $client->request('POST', '/token', [
            'headers' => ['Content-Type' => 'application/json'],
            'json' => [
                'grant_type' => 'password',
                'username' => 'nonexistent@example.com',
                'password' => 'SomePassword',
                'client_id' => OAuth2ClientFixtures::DEFAULT_CLIENT_IDENTIFIER,
            ],
        ]);

        // Then: Login fails with 400 Bad Request (OAuth2 standard for invalid_grant)
        $this->assertResponseStatusCodeSame(400);
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(false), true);
        assert(is_array($data));
        $this->assertArrayHasKey('error', $data);
        $this->assertSame('invalid_grant', $data['error']);
    }

    public function testAuthenticatedUserCanAccessProtectedEndpoint(): void
    {
        // Given: A registered and authenticated user
        UserFactory::new()
            ->withCredentials('john@example.com', 'password123')
            ->create();

        // Get access token
        $client = static::createClient();
        $client->request('POST', '/token', [
            'headers' => ['Content-Type' => 'application/json'],
            'json' => [
                'grant_type' => 'password',
                'username' => 'john@example.com',
                'password' => 'password123',
                'client_id' => OAuth2ClientFixtures::DEFAULT_CLIENT_IDENTIFIER,
            ],
        ]);

        $response = $client->getResponse();
        assert($response instanceof Response);
        $tokenData = json_decode($response->getContent(), true);
        assert(is_array($tokenData));
        assert(isset($tokenData['access_token']) && is_string($tokenData['access_token']));
        $accessToken = $tokenData['access_token'];

        // When: User accesses a protected endpoint with valid token
        $client->request('GET', '/api/me', [
            'headers' => ['Authorization' => 'Bearer ' . $accessToken],
        ]);

        // Then: Access is granted and user data is returned
        $this->assertResponseIsSuccessful();
        $response = $client->getResponse();
        assert($response instanceof Response);
        $userData = json_decode($response->getContent(), true);
        assert(is_array($userData));
        $this->assertArrayHasKey('id', $userData);
        $this->assertArrayHasKey('email', $userData);
        assert(isset($userData['email']));
        $this->assertSame('john@example.com', $userData['email']);
    }

    public function testUnauthenticatedUserCannotAccessProtectedEndpoint(): void
    {
        // Given: No authentication token

        // When: User attempts to access protected endpoint
        $client = static::createClient();
        $client->request('GET', '/api/me');

        // Then: Access is denied with 401 Unauthorized
        $this->assertResponseStatusCodeSame(401);
    }

    public function testUserCannotAccessProtectedEndpointWithInvalidToken(): void
    {
        // Given: An invalid token
        $invalidToken = 'invalid.token.here';

        // When: User attempts to access protected endpoint with invalid token
        $client = static::createClient();
        $client->request('GET', '/api/me', [
            'headers' => ['Authorization' => 'Bearer ' . $invalidToken],
        ]);

        // Then: Access is denied with 401 Unauthorized
        $this->assertResponseStatusCodeSame(401);
    }

    public function testTokenEndpointRequiresAllRequiredParameters(): void
    {
        // Given: Missing required parameters

        // When: User attempts to get token without password
        $client = static::createClient();
        $client->request('POST', '/token', [
            'headers' => ['Content-Type' => 'application/json'],
            'json' => [
                'grant_type' => 'password',
                'client_id' => 'bank_app',
                'username' => 'test@example.com',
                // Missing password field
            ],
        ]);

        // Then: Request fails with 400 Bad Request
        $this->assertResponseStatusCodeSame(400);
    }

    public function testMultipleUsersCanLoginIndependently(): void
    {
        // Given: Multiple users exist
        UserFactory::new()
            ->withCredentials('john@example.com', 'password123')
            ->create();

        UserFactory::new()
            ->withCredentials('jane@example.com', 'password456')
            ->create();

        $client = static::createClient();

        // When: User 1 logs in
        $client->request('POST', '/token', [
            'headers' => ['Content-Type' => 'application/json'],
            'json' => [
                'grant_type' => 'password',
                'username' => 'john@example.com',
                'password' => 'password123',
                'client_id' => OAuth2ClientFixtures::DEFAULT_CLIENT_IDENTIFIER,
            ],
        ]);

        // When: User 2 logs in
        $response = $client->getResponse();
        assert($response instanceof Response);
        $token1Data = json_decode($response->getContent(), true);
        assert(is_array($token1Data));
        assert(isset($token1Data['access_token']) && is_string($token1Data['access_token']));

        $client->request('POST', '/token', [
            'headers' => ['Content-Type' => 'application/json'],
            'json' => [
                'grant_type' => 'password',
                'username' => 'jane@example.com',
                'password' => 'password456',
                'client_id' => OAuth2ClientFixtures::DEFAULT_CLIENT_IDENTIFIER,
            ],
        ]);

        // Then: Both users receive different tokens
        $this->assertResponseIsSuccessful();
        $response = $client->getResponse();
        assert($response instanceof Response);
        $token2Data = json_decode($response->getContent(), true);
        assert(is_array($token2Data));
        assert(isset($token2Data['access_token']) && is_string($token2Data['access_token']));

        $this->assertNotSame($token1Data['access_token'], $token2Data['access_token']);

        // Both can access their own data
        $client->request('GET', '/api/me', [
            'headers' => ['Authorization' => 'Bearer ' . $token1Data['access_token']],
        ]);
        $this->assertResponseIsSuccessful();
        $response = $client->getResponse();
        assert($response instanceof Response);
        $user1Data = json_decode($response->getContent(), true);
        assert(is_array($user1Data));
        assert(isset($user1Data['email']));
        $this->assertSame('john@example.com', $user1Data['email']);

        $client->request('GET', '/api/me', [
            'headers' => ['Authorization' => 'Bearer ' . $token2Data['access_token']],
        ]);
        $this->assertResponseIsSuccessful();
        $response = $client->getResponse();
        assert($response instanceof Response);
        $user2Data = json_decode($response->getContent(), true);
        assert(is_array($user2Data));
        assert(isset($user2Data['email']));
        $this->assertSame('jane@example.com', $user2Data['email']);
    }
}
