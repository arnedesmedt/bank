<?php

declare(strict_types=1);

namespace App\Tests\Api;

use ApiPlatform\Symfony\Bundle\Test\Response;
use App\Tests\Factory\BankAccountFactory;
use App\Tests\Factory\UserFactory;

use function assert;
use function is_array;
use function json_decode;

class BankAccountApiResourceTest extends BankApiTestCase
{
    public function testGetCollectionRequiresAuthentication(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/bank-accounts');

        $this->assertResponseStatusCodeSame(401);
    }

    public function testGetCollectionReturnsOwnedBankAccounts(): void
    {
        // Given: Admin user has 2 bank accounts, another user has 1
        $adminUser = UserFactory::find(['email' => UserFactory::ADMIN_EMAIL]);
        BankAccountFactory::createMany(2, ['owner' => $adminUser]);

        $otherUser = UserFactory::new()->withCredentials('other@example.com', 'pass')->create();
        BankAccountFactory::createOne(['owner' => $otherUser]);

        $token  = $this->getToken();
        $client = static::createClient();

        // When: Admin requests their bank accounts
        $client->request('GET', '/api/bank-accounts', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Accept'        => 'application/json',
            ],
        ]);

        // Then: Only admin's 2 accounts are returned
        $this->assertResponseIsSuccessful();
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));
        $this->assertCount(2, $data);
    }

    public function testGetSingleBankAccount(): void
    {
        $adminUser   = UserFactory::find(['email' => UserFactory::ADMIN_EMAIL]);
        $bankAccount = BankAccountFactory::createOne([
            'owner'         => $adminUser,
            'accountName'   => 'My Savings',
            'accountNumber' => 'BE68539007547034',
        ]);

        $uuid = $bankAccount->getId();
        assert($uuid !== null);
        $token = $this->getToken();

        $client = static::createClient();
        $client->request('GET', '/api/bank-accounts/' . $uuid->toRfc4122(), [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Accept'        => 'application/json',
            ],
        ]);

        $this->assertResponseIsSuccessful();
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));
        $this->assertSame('My Savings', $data['accountName']);
        $this->assertSame('BE68539007547034', $data['accountNumber']);
    }

    public function testCreateBankAccount(): void
    {
        $token  = $this->getToken();
        $client = static::createClient();

        $client->request('POST', '/api/bank-accounts', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'json' => [
                'accountName'   => 'My New Account',
                'accountNumber' => 'BE71096123456769',
            ],
        ]);

        $this->assertResponseStatusCodeSame(201);
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));
        $this->assertArrayHasKey('id', $data);
        $this->assertSame('My New Account', $data['accountName']);
        $this->assertSame('BE71096123456769', $data['accountNumber']);
    }

    public function testUpdateBankAccount(): void
    {
        $adminUser   = UserFactory::find(['email' => UserFactory::ADMIN_EMAIL]);
        $bankAccount = BankAccountFactory::createOne([
            'owner'         => $adminUser,
            'accountName'   => 'Old Name',
            'accountNumber' => 'BE68539007547034',
        ]);

        $uuid = $bankAccount->getId();
        assert($uuid !== null);
        $token = $this->getToken();

        $client = static::createClient();
        $client->request('PUT', '/api/bank-accounts/' . $uuid->toRfc4122(), [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'json' => [
                'accountName'   => 'Updated Name',
                'accountNumber' => 'BE68539007547034',
            ],
        ]);

        $this->assertResponseIsSuccessful();
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));
        $this->assertSame('Updated Name', $data['accountName']);
    }

    public function testDeleteBankAccount(): void
    {
        $adminUser   = UserFactory::find(['email' => UserFactory::ADMIN_EMAIL]);
        $bankAccount = BankAccountFactory::createOne(['owner' => $adminUser]);
        $uuid        = $bankAccount->getId();
        assert($uuid !== null);
        $token = $this->getToken();

        $client = static::createClient();
        $client->request('DELETE', '/api/bank-accounts/' . $uuid->toRfc4122(), [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Accept'        => 'application/json',
            ],
        ]);

        $this->assertResponseStatusCodeSame(204);
    }

    public function testCannotAccessOtherUsersBankAccount(): void
    {
        $otherUser   = UserFactory::new()->withCredentials('other@example.com', 'pass')->create();
        $bankAccount = BankAccountFactory::createOne(['owner' => $otherUser]);
        $uuid        = $bankAccount->getId();
        assert($uuid !== null);
        $token = $this->getToken(); // Admin token

        $client = static::createClient();
        $client->request('GET', '/api/bank-accounts/' . $uuid->toRfc4122(), [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Accept'        => 'application/json',
            ],
        ]);

        $this->assertResponseStatusCodeSame(403);
    }
}
