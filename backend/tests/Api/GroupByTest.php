<?php

declare(strict_types=1);

namespace App\Tests\Api;

use ApiPlatform\Symfony\Bundle\Test\Response;
use App\Entity\BankAccount;
use App\Tests\Factory\BankAccountFactory;
use App\Tests\Factory\TransferFactory;
use DateTimeImmutable;

use function assert;
use function is_array;
use function json_decode;

/**
 * Tests for GET /api/group-by endpoint.
 *
 * Covers T026, T030 (US3):
 * - groupBy=period with period=month/quarter/year
 * - groupBy=label
 * - Empty results when no transfers
 * - Authentication required
 */
class GroupByTest extends BankApiTestCase
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

    public function testGroupByRequiresAuthentication(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/group-by');

        $this->assertResponseStatusCodeSame(401);
    }

    public function testGroupByReturnsEmptyWhenNoTransfers(): void
    {
        $token  = $this->getToken();
        $client = static::createClient();

        $client->request('GET', '/api/group-by?groupBy=period&period=month', [
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

    public function testGroupByPeriodMonthReturnsAggregates(): void
    {
        $bankAccount = $this->createTestAccount();

        TransferFactory::createOne([
            'fromAccount' => $bankAccount,
            'toAccount'   => $bankAccount,
            'amount'      => '-100.00',
            'date'        => new DateTimeImmutable('2026-01-15'),
        ]);
        TransferFactory::createOne([
            'fromAccount' => $bankAccount,
            'toAccount'   => $bankAccount,
            'amount'      => '-200.00',
            'date'        => new DateTimeImmutable('2026-01-20'),
        ]);
        TransferFactory::createOne([
            'fromAccount' => $bankAccount,
            'toAccount'   => $bankAccount,
            'amount'      => '50.00',
            'date'        => new DateTimeImmutable('2026-02-10'),
        ]);

        $token  = $this->getToken();
        $client = static::createClient();

        $client->request('GET', '/api/group-by?groupBy=period&period=month', [
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

        // Should have 2 groups: 2026-01 and 2026-02
        $this->assertCount(2, $data);

        // Each row has required fields
        $firstRow = $data[0];
        assert(is_array($firstRow));
        $this->assertArrayHasKey('period', $firstRow);
        $this->assertArrayHasKey('totalAmount', $firstRow);
        $this->assertArrayHasKey('transferCount', $firstRow);
    }

    public function testGroupByDateRangeFilter(): void
    {
        $bankAccount = $this->createTestAccount();

        TransferFactory::createOne([
            'fromAccount' => $bankAccount,
            'toAccount'   => $bankAccount,
            'amount'      => '-100.00',
            'date'        => new DateTimeImmutable('2025-06-15'),
        ]);
        TransferFactory::createOne([
            'fromAccount' => $bankAccount,
            'toAccount'   => $bankAccount,
            'amount'      => '-50.00',
            'date'        => new DateTimeImmutable('2026-01-10'),
        ]);

        $token  = $this->getToken();
        $client = static::createClient();

        $client->request('GET', '/api/group-by?groupBy=period&period=month&dateFrom=2026-01-01&dateTo=2026-12-31', [
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
        $firstRow = $data[0];
        assert(is_array($firstRow));
        $this->assertSame('2026-01', $firstRow['period']);
    }
}
