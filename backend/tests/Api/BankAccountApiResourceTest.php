<?php
declare(strict_types=1);
namespace App\Tests\Api;
use ApiPlatform\Symfony\Bundle\Test\Response;
use App\Entity\BankAccount;
use App\Tests\Factory\BankAccountFactory;
use function assert;
use function is_array;
use function json_decode;
/**
 * US1: Tests for account creation, hash uniqueness, normalization, and internal flag.
 *
 * @see specs/003-backend-account-features/spec.md
 */
class BankAccountApiResourceTest extends BankApiTestCase
{
    // -------------------------------------------------------------------------
    // Authentication
    // -------------------------------------------------------------------------
    public function testGetCollectionRequiresAuthentication(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/bank-accounts');
        $this->assertResponseStatusCodeSame(401);
    }
    public function testCreateBankAccountRequiresAuthentication(): void
    {
        $client = static::createClient();
        $client->request('POST', '/api/bank-accounts', [
            'headers' => ['Content-Type' => 'application/json'],
            'json'    => ['accountName' => 'Test', 'accountNumber' => 'BE68539007547034'],
        ]);
        $this->assertResponseStatusCodeSame(401);
    }
    // -------------------------------------------------------------------------
    // GET collection & item
    // -------------------------------------------------------------------------
    public function testGetCollectionReturnsBankAccounts(): void
    {
        BankAccountFactory::createMany(3);
        $token  = $this->getToken();
        $client = static::createClient();
        $client->request('GET', '/api/bank-accounts', [
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
        $this->assertCount(3, $data);
    }
    public function testGetCollectionExposesHashInternalAndTotalBalance(): void
    {
        $normalizedNumber = BankAccount::normalizeAccountNumber('BE68539007547034');
        BankAccountFactory::createOne([
            'accountName'   => 'Savings',
            'accountNumber' => $normalizedNumber,
            'hash'          => BankAccount::calculateHash('Savings', $normalizedNumber),
            'isInternal'    => true,
            'totalBalance'  => '100.00',
        ]);
        $token  = $this->getToken();
        $client = static::createClient();
        $client->request('GET', '/api/bank-accounts', [
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
        $this->assertArrayHasKey('hash', $data[0]);
        $this->assertArrayHasKey('isInternal', $data[0]);
        $this->assertArrayHasKey('totalBalance', $data[0]);
    }
    public function testGetSingleBankAccount(): void
    {
        $normalizedNumber = BankAccount::normalizeAccountNumber('BE68539007547034');
        $bankAccount = BankAccountFactory::createOne([
            'accountName'   => 'My Savings',
            'accountNumber' => $normalizedNumber,
            'hash'          => BankAccount::calculateHash('My Savings', $normalizedNumber),
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
        $this->assertSame('BE68 5390 0754 7034', $data['accountNumber']);
        $this->assertArrayHasKey('hash', $data);
        $this->assertNotEmpty($data['hash']);
    }
    // -------------------------------------------------------------------------
    // T009: Hash calculation
    // -------------------------------------------------------------------------
    public function testCreateBankAccountHashIsCalculated(): void
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
                'accountName'   => 'Hash Test Account',
                'accountNumber' => 'BE68539007547034',
            ],
        ]);
        $this->assertResponseStatusCodeSame(201);
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));
        $this->assertArrayHasKey('hash', $data);
        $this->assertNotEmpty($data['hash']);
        // Hash must equal SHA-256 of 'normalized_number|name' (lowercased)
        $expectedHash = BankAccount::calculateHash('Hash Test Account', 'BE68 5390 0754 7034');
        $this->assertSame($expectedHash, $data['hash']);
    }
    public function testHashIsCalculatedWithNullNameAndNumber(): void
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
                'accountName'   => null,
                'accountNumber' => null,
            ],
        ]);
        $this->assertResponseStatusCodeSame(201);
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));
        $this->assertArrayHasKey('hash', $data);
        $this->assertNotEmpty($data['hash']);
        $expectedHash = BankAccount::calculateHash(null, null);
        $this->assertSame($expectedHash, $data['hash']);
    }
    // -------------------------------------------------------------------------
    // T014: Duplicate hash rejection
    // -------------------------------------------------------------------------
    public function testCreateDuplicateAccountIsRejected(): void
    {
        $token  = $this->getToken();
        $client = static::createClient();
        $payload = [
            'accountName'   => 'Duplicate Account',
            'accountNumber' => 'BE68539007547034',
        ];
        // First creation — should succeed
        $client->request('POST', '/api/bank-accounts', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'json' => $payload,
        ]);
        $this->assertResponseStatusCodeSame(201);
        // Second creation with same name+number — should be rejected (409 Conflict)
        $client->request('POST', '/api/bank-accounts', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'json' => $payload,
        ]);
        $this->assertResponseStatusCodeSame(409);
    }
    public function testCreateDuplicateWithSpacesInNumberIsRejected(): void
    {
        $token  = $this->getToken();
        $client = static::createClient();
        // First creation with raw number (no spaces)
        $client->request('POST', '/api/bank-accounts', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'json' => ['accountName' => 'Spaced Test', 'accountNumber' => 'BE68539007547034'],
        ]);
        $this->assertResponseStatusCodeSame(201);
        // Second creation with spaces — normalizes to the same hash => 409
        $client->request('POST', '/api/bank-accounts', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'json' => ['accountName' => 'Spaced Test', 'accountNumber' => 'BE68 5390 0754 7034'],
        ]);
        $this->assertResponseStatusCodeSame(409);
    }
    // -------------------------------------------------------------------------
    // T011: Account number normalization
    // -------------------------------------------------------------------------
    public function testAccountNumberIsNormalizedOnCreate(): void
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
                'accountName'   => 'Normalize Test',
                'accountNumber' => 'BE68539007547034',
            ],
        ]);
        $this->assertResponseStatusCodeSame(201);
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));
        $this->assertSame('BE68 5390 0754 7034', $data['accountNumber']);
    }
    public function testAlreadyFormattedAccountNumberIsPreserved(): void
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
                'accountName'   => 'Formatted Number',
                'accountNumber' => 'BE68 5390 0754 7034',
            ],
        ]);
        $this->assertResponseStatusCodeSame(201);
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));
        $this->assertSame('BE68 5390 0754 7034', $data['accountNumber']);
    }
    public function testInvalidAccountNumberIsStoredAsNull(): void
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
                'accountName'   => 'Invalid Number Account',
                'accountNumber' => 'INVALID-123',
            ],
        ]);
        $this->assertResponseStatusCodeSame(201);
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));
        // accountNumber is null or absent when cannot normalize
        $this->assertNull($data['accountNumber'] ?? null);
    }
    // -------------------------------------------------------------------------
    // T010: Strict property handling (nulls)
    // -------------------------------------------------------------------------
    public function testEmptyAccountNameIsStoredAsNull(): void
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
                'accountName'   => '   ',
                'accountNumber' => 'BE71096123456769',
            ],
        ]);
        $this->assertResponseStatusCodeSame(201);
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));
        // accountName is null or absent when empty/whitespace
        $this->assertNull($data['accountName'] ?? null);
    }
    // -------------------------------------------------------------------------
    // T012: Internal flag for first account
    // -------------------------------------------------------------------------
    public function testFirstCreatedAccountIsInternal(): void
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
                'accountName'   => 'First Account',
                'accountNumber' => 'BE68539007547034',
            ],
        ]);
        $this->assertResponseStatusCodeSame(201);
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));
        $this->assertTrue($data['isInternal'], 'First account should be marked as internal');
    }
    public function testSecondCreatedAccountIsNotInternal(): void
    {
        $token  = $this->getToken();
        $client = static::createClient();
        // Create first account
        $client->request('POST', '/api/bank-accounts', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'json' => [
                'accountName'   => 'First Account',
                'accountNumber' => 'BE68539007547034',
            ],
        ]);
        $this->assertResponseStatusCodeSame(201);
        // Create second account
        $client->request('POST', '/api/bank-accounts', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'json' => [
                'accountName'   => 'Second Account',
                'accountNumber' => 'BE71096123456769',
            ],
        ]);
        $this->assertResponseStatusCodeSame(201);
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));
        $this->assertFalse($data['isInternal'], 'Second account should not be marked as internal');
    }
    public function testFactoryCreatedAccountExposesIsInternalField(): void
    {
        $bankAccount = BankAccountFactory::createOne();
        $uuid        = $bankAccount->getId();
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
        $this->assertArrayHasKey('isInternal', $data);
        $this->assertArrayHasKey('totalBalance', $data);
        $this->assertArrayHasKey('hash', $data);
    }
    // -------------------------------------------------------------------------
    // CRUD
    // -------------------------------------------------------------------------
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
        // Number should be normalized
        $this->assertSame('BE71 0961 2345 6769', $data['accountNumber']);
    }
    public function testUpdateBankAccount(): void
    {
        $normalizedNumber = BankAccount::normalizeAccountNumber('BE68539007547034');
        $bankAccount = BankAccountFactory::createOne([
            'accountName'   => 'Old Name',
            'accountNumber' => $normalizedNumber,
            'hash'          => BankAccount::calculateHash('Old Name', $normalizedNumber),
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
        // Hash should NOT change on update (set only on creation/import)
        $this->assertSame(BankAccount::calculateHash('Old Name', $normalizedNumber), $data['hash']);
    }
    public function testDeleteBankAccount(): void
    {
        $bankAccount = BankAccountFactory::createOne();
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
}
