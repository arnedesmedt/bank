<?php

declare(strict_types=1);

namespace App\Tests\Api;

use ApiPlatform\Symfony\Bundle\Test\Response;
use App\Entity\BankAccount;
use App\Tests\Factory\BankAccountFactory;
use App\Tests\Factory\TransferFactory;

use function assert;
use function is_array;
use function json_decode;
use function json_encode;

/**
 * Contract + integration tests for refund linking (spec 010).
 *
 * Covers:
 * - T013: PATCH /api/transfers/bulk contract for mark_refund
 * - T014: amountBeforeRefund snapshot, amount recalculation, edge cases
 */
class RefundLinkingTest extends BankApiTestCase
{
    private function createAccount(): BankAccount
    {
        $number = BankAccount::normalizeAccountNumber('BE68539007547034') ?? 'BE68539007547034';

        return BankAccountFactory::createOne([
            'accountNumber' => $number,
            'accountName'   => 'Test Account',
            'hash'          => BankAccount::calculateHash('Test Account', $number),
            'isInternal'    => true,
        ]);
    }

    // ── T013: API contract ────────────────────────────────────────────────────

    /** @test */
    public function testMarkRefundReturnsChildWithParentTransferId(): void
    {
        $bankAccount = $this->createAccount();
        $def         = ['fromAccount' => $bankAccount, 'toAccount' => $bankAccount];
        $transfer    = TransferFactory::createOne($def + ['amount' => '100.00']);
        $child       = TransferFactory::createOne($def + ['amount' => '-15.00']);

        $token  = $this->getToken();
        $client = static::createClient();

        $parentUuid = $transfer->getId();
        $childUuid  = $child->getId();
        $this->assertNotNull($parentUuid);
        $this->assertNotNull($childUuid);

        $client->request('PATCH', '/api/transfers/bulk', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/merge-patch+json',
                'Accept'        => 'application/json',
            ],
            'body' => json_encode([
                'action'           => 'mark_refund',
                'transferIds'      => [(string) $childUuid],
                'parentTransferId' => (string) $parentUuid,
            ]),
        ]);

        $this->assertResponseIsSuccessful();
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));

        $this->assertCount(1, $data);
        $row = $data[0];
        assert(is_array($row));
        $this->assertSame((string) $parentUuid, $row['parentTransferId']);
    }

    public function testMarkRefundRequiresParentTransferId(): void
    {
        $bankAccount = $this->createAccount();
        $transfer    = TransferFactory::createOne(['fromAccount' => $bankAccount, 'toAccount' => $bankAccount]);

        $token  = $this->getToken();
        $client = static::createClient();

        $uuid = $transfer->getId();
        $this->assertNotNull($uuid);

        $client->request('PATCH', '/api/transfers/bulk', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/merge-patch+json',
                'Accept'        => 'application/json',
            ],
            'body' => json_encode([
                'action'      => 'mark_refund',
                'transferIds' => [(string) $uuid],
                // parentTransferId intentionally omitted
            ]),
        ]);

        $this->assertResponseStatusCodeSame(400);
    }

    public function testResponseIncludesAmountBeforeRefundAndChildRefundIds(): void
    {
        $bankAccount = $this->createAccount();
        $def         = ['fromAccount' => $bankAccount, 'toAccount' => $bankAccount];
        $transfer    = TransferFactory::createOne($def + ['amount' => '100.00']);
        $child       = TransferFactory::createOne($def + ['amount' => '-20.00']);

        $token  = $this->getToken();
        $client = static::createClient();

        $parentUuid = $transfer->getId();
        $childUuid  = $child->getId();
        $this->assertNotNull($parentUuid);
        $this->assertNotNull($childUuid);

        $client->request('PATCH', '/api/transfers/bulk', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/merge-patch+json',
                'Accept'        => 'application/json',
            ],
            'body' => json_encode([
                'action'           => 'mark_refund',
                'transferIds'      => [(string) $childUuid],
                'parentTransferId' => (string) $parentUuid,
            ]),
        ]);

        $this->assertResponseIsSuccessful();

        // Fetch parent directly to verify new fields
        $client->request('GET', '/api/transfers/' . $parentUuid, [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Accept'        => 'application/json',
            ],
        ]);

        $this->assertResponseIsSuccessful();
        $response = $client->getResponse();
        assert($response instanceof Response);
        $parentData = json_decode($response->getContent(), true);
        assert(is_array($parentData));

        $this->assertArrayHasKey('amountBeforeRefund', $parentData);
        $this->assertArrayHasKey('childRefundIds', $parentData);
        $this->assertSame('100.00', $parentData['amountBeforeRefund']);
        $childRefundIds = (array) $parentData['childRefundIds'];
        $this->assertContains((string) $childUuid, $childRefundIds);
    }

    // ── T014: integration — amount recalculation ──────────────────────────────

    /** @test */
    public function testMarkRefundRecalculatesParentAmount(): void
    {
        $bankAccount = $this->createAccount();
        $def         = ['fromAccount' => $bankAccount, 'toAccount' => $bankAccount];
        $transfer    = TransferFactory::createOne($def + ['amount' => '100.00']);
        $child       = TransferFactory::createOne($def + ['amount' => '-25.00']);

        $token  = $this->getToken();
        $client = static::createClient();

        $parentUuid = $transfer->getId();
        $childUuid  = $child->getId();
        $this->assertNotNull($parentUuid);
        $this->assertNotNull($childUuid);

        $client->request('PATCH', '/api/transfers/bulk', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/merge-patch+json',
                'Accept'        => 'application/json',
            ],
            'body' => json_encode([
                'action'           => 'mark_refund',
                'transferIds'      => [(string) $childUuid],
                'parentTransferId' => (string) $parentUuid,
            ]),
        ]);

        $this->assertResponseIsSuccessful();

        // amount = originalAmount − refundAmount = 100.00 − (−25.00) ... wait, bcsub(100.00, -25.00) = 125.00
        // The service does: newAmount = bcsub(originalAmount, childAmount)
        // bcsub('100.00', '-25.00') = '125.00' — refund is negative so subtracting it adds back
        $client->request('GET', '/api/transfers/' . $parentUuid, [
            'headers' => ['Authorization' => 'Bearer ' . $token, 'Accept' => 'application/json'],
        ]);

        $this->assertResponseIsSuccessful();
        $response = $client->getResponse();
        assert($response instanceof Response);
        $parentData = json_decode($response->getContent(), true);
        assert(is_array($parentData));

        // amountBeforeRefund holds the original
        $this->assertSame('100.00', $parentData['amountBeforeRefund']);
        // amount is recalculated: 100.00 - (-25.00) = 125.00
        $this->assertSame('125.00', $parentData['amount']);
    }

    public function testAmountBeforeRefundIsSnapshotOnFirstLinkOnly(): void
    {
        $bankAccount = $this->createAccount();
        $transfer    = TransferFactory::createOne(
            [
                'fromAccount' => $bankAccount,
                'toAccount' => $bankAccount,
                'amount' => '200.00',
            ],
        );
        $child1      = TransferFactory::createOne(
            [
                'fromAccount' => $bankAccount,
                'toAccount' => $bankAccount,
                'amount' => '-10.00',
            ],
        );
        $child2      = TransferFactory::createOne(
            [
                'fromAccount' => $bankAccount,
                'toAccount' => $bankAccount,
                'amount' => '-30.00',
            ],
        );

        $token  = $this->getToken();
        $client = static::createClient();

        $parentUuid = $transfer->getId();
        $c1Uuid     = $child1->getId();
        $c2Uuid     = $child2->getId();
        $this->assertNotNull($parentUuid);
        $this->assertNotNull($c1Uuid);
        $this->assertNotNull($c2Uuid);

        // Link first child
        $client->request('PATCH', '/api/transfers/bulk', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/merge-patch+json',
                'Accept'        => 'application/json',
            ],
            'body' => json_encode([
                'action'           => 'mark_refund',
                'transferIds'      => [(string) $c1Uuid],
                'parentTransferId' => (string) $parentUuid,
            ]),
        ]);
        $this->assertResponseIsSuccessful();

        // Link second child
        $client->request('PATCH', '/api/transfers/bulk', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/merge-patch+json',
                'Accept'        => 'application/json',
            ],
            'body' => json_encode([
                'action'           => 'mark_refund',
                'transferIds'      => [(string) $c2Uuid],
                'parentTransferId' => (string) $parentUuid,
            ]),
        ]);
        $this->assertResponseIsSuccessful();

        $client->request('GET', '/api/transfers/' . $parentUuid, [
            'headers' => ['Authorization' => 'Bearer ' . $token, 'Accept' => 'application/json'],
        ]);
        $this->assertResponseIsSuccessful();
        $response = $client->getResponse();
        assert($response instanceof Response);
        $parentData = json_decode($response->getContent(), true);
        assert(is_array($parentData));

        // Original amount snapshot must remain 200.00 (not overwritten on second link)
        $this->assertSame('200.00', $parentData['amountBeforeRefund']);
        // Final amount = 200.00 − (−10.00) − (−30.00) = 240.00
        $this->assertSame('240.00', $parentData['amount']);
    }

    public function testSelfLinkIsSkippedAndReturnsEmpty(): void
    {
        $bankAccount = $this->createAccount();
        $transfer    = TransferFactory::createOne(['fromAccount' => $bankAccount, 'toAccount' => $bankAccount]);

        $token  = $this->getToken();
        $client = static::createClient();

        $uuid = $transfer->getId();
        $this->assertNotNull($uuid);

        $client->request('PATCH', '/api/transfers/bulk', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/merge-patch+json',
                'Accept'        => 'application/json',
            ],
            'body' => json_encode([
                'action'           => 'mark_refund',
                'transferIds'      => [(string) $uuid],
                'parentTransferId' => (string) $uuid,
            ]),
        ]);

        $this->assertResponseIsSuccessful();
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));
        $this->assertCount(0, $data);
    }

    public function testAlreadyLinkedChildIsSkipped(): void
    {
        $bankAccount = $this->createAccount();
        $transfer    = TransferFactory::createOne([
            'fromAccount' => $bankAccount,
            'toAccount' => $bankAccount,
            'amount' => '100.00',
        ]);
        $parent2     = TransferFactory::createOne([
            'fromAccount' => $bankAccount,
            'toAccount' => $bankAccount,
            'amount' => '200.00',
        ]);
        $child       = TransferFactory::createOne([
            'fromAccount'    => $bankAccount,
            'toAccount'      => $bankAccount,
            'amount'         => '-10.00',
            'parentTransfer' => $transfer,
        ]);

        $token  = $this->getToken();
        $client = static::createClient();

        $parent2Uuid = $parent2->getId();
        $childUuid   = $child->getId();
        $this->assertNotNull($parent2Uuid);
        $this->assertNotNull($childUuid);

        // Try to re-link to a different parent — should be silently skipped
        $client->request('PATCH', '/api/transfers/bulk', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/merge-patch+json',
                'Accept'        => 'application/json',
            ],
            'body' => json_encode([
                'action'           => 'mark_refund',
                'transferIds'      => [(string) $childUuid],
                'parentTransferId' => (string) $parent2Uuid,
            ]),
        ]);

        $this->assertResponseIsSuccessful();
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));
        // Already-linked child is skipped → result is empty
        $this->assertCount(0, $data);
    }
}
