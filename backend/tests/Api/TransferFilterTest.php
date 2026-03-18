<?php

declare(strict_types=1);

namespace App\Tests\Api;

use ApiPlatform\Symfony\Bundle\Test\Response;
use App\Entity\BankAccount;
use App\Tests\Factory\BankAccountFactory;
use App\Tests\Factory\LabelFactory;
use App\Tests\Factory\TransferFactory;
use DateTimeImmutable;

use function assert;
use function is_array;
use function json_decode;

/**
 * Tests for the advanced filtering on GET /api/transfers.
 *
 * Covers T012, T017 (US1):
 * - search parameter (full-text on reference)
 * - dateFrom/dateTo range filtering
 * - labelIds filtering
 * - page parameter
 */
class TransferFilterTest extends BankApiTestCase
{
    private function createTestAccount(): BankAccount
    {
        $number = BankAccount::normalizeAccountNumber('BE68539007547034') ?? 'BE68539007547034';

        return BankAccountFactory::createOne([
            'accountNumber' => $number,
            'accountName'   => 'Test Account',
            'hash'          => BankAccount::calculateHash('Test Account', $number),
            'isInternal'    => true,
        ]);
    }

    public function testGetTransfersRequiresAuthentication(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/transfers');

        $this->assertResponseStatusCodeSame(401);
    }

    public function testGetTransfersWithNoFiltersReturnsAll(): void
    {
        $bankAccount = $this->createTestAccount();

        TransferFactory::createMany(5, [
            'fromAccount' => $bankAccount,
            'toAccount'   => $bankAccount,
        ]);

        $token  = $this->getToken();
        $client = static::createClient();

        $client->request('GET', '/api/transfers', [
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

        $this->assertCount(5, $data);
    }

    public function testGetTransfersWithSearchFilter(): void
    {
        $bankAccount = $this->createTestAccount();

        TransferFactory::createOne([
            'fromAccount' => $bankAccount,
            'toAccount'   => $bankAccount,
            'reference'   => 'UNIQUE_GROCERY_REFERENCE_XYZ',
        ]);
        TransferFactory::createMany(3, [
            'fromAccount' => $bankAccount,
            'toAccount'   => $bankAccount,
            'reference'   => 'Other reference',
        ]);

        $token  = $this->getToken();
        $client = static::createClient();

        $client->request('GET', '/api/transfers?search=UNIQUE_GROCERY', [
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

        $this->assertCount(1, $data);
    }

    public function testGetTransfersWithDateRangeFilter(): void
    {
        $bankAccount = $this->createTestAccount();

        TransferFactory::createOne([
            'fromAccount' => $bankAccount,
            'toAccount'   => $bankAccount,
            'date'        => new DateTimeImmutable('2025-06-15'),
        ]);
        TransferFactory::createOne([
            'fromAccount' => $bankAccount,
            'toAccount'   => $bankAccount,
            'date'        => new DateTimeImmutable('2025-12-20'),
        ]);
        TransferFactory::createOne([
            'fromAccount' => $bankAccount,
            'toAccount'   => $bankAccount,
            'date'        => new DateTimeImmutable('2024-01-10'),
        ]);

        $token  = $this->getToken();
        $client = static::createClient();

        $client->request('GET', '/api/transfers?dateFrom=2025-01-01&dateTo=2025-12-31', [
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

        $this->assertCount(2, $data);
    }

    public function testGetTransfersWithLabelFilter(): void
    {
        $bankAccount = $this->createTestAccount();
        $label       = LabelFactory::createOne(['name' => 'Groceries']);

        $transferWithLabel = TransferFactory::createOne([
            'fromAccount' => $bankAccount,
            'toAccount'   => $bankAccount,
        ]);

        TransferFactory::createMany(2, [
            'fromAccount' => $bankAccount,
            'toAccount'   => $bankAccount,
        ]);

        // Manually assign label via the API
        $token  = $this->getToken();
        $client = static::createClient();

        $labelId      = $label->getId();
        $transferUuid = $transferWithLabel->getId();

        $this->assertNotNull($labelId);
        $this->assertNotNull($transferUuid);

        // Assign label
        $client->request('POST', '/api/transfers/' . $transferUuid . '/labels/' . $labelId, [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Accept'        => 'application/json',
            ],
        ]);
        $this->assertResponseIsSuccessful();

        // Filter by label
        $client->request('GET', '/api/transfers?labelIds[]=' . $labelId, [
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

        $this->assertCount(1, $data);
    }

    public function testGetTransfersEmptyWhenNoMatchingFilters(): void
    {
        $bankAccount = $this->createTestAccount();

        TransferFactory::createMany(3, [
            'fromAccount' => $bankAccount,
            'toAccount'   => $bankAccount,
            'reference'   => 'Regular transfer',
        ]);

        $token  = $this->getToken();
        $client = static::createClient();

        $client->request('GET', '/api/transfers?search=NONEXISTENT_TEXT_999', [
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

        $this->assertCount(0, $data);
    }

    public function testTransferHasParentTransferIdField(): void
    {
        $bankAccount = $this->createTestAccount();

        $transfer = TransferFactory::createOne([
            'fromAccount' => $bankAccount,
            'toAccount'   => $bankAccount,
        ]);

        $child = TransferFactory::createOne([
            'fromAccount'     => $bankAccount,
            'toAccount'       => $bankAccount,
            'parentTransfer'  => $transfer,
        ]);

        $token  = $this->getToken();
        $client = static::createClient();

        $childUuid = $child->getId();
        $this->assertNotNull($childUuid);

        $client->request('GET', '/api/transfers/' . $childUuid, [
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

        $this->assertArrayHasKey('parentTransferId', $data);
        $this->assertNotNull($data['parentTransferId']);
    }
}
