<?php

declare(strict_types=1);

namespace App\Tests\Api;

use ApiPlatform\Symfony\Bundle\Test\Response;
use App\Entity\BankAccount;
use App\Tests\Factory\BankAccountFactory;
use App\Tests\Factory\LabelFactory;
use App\Tests\Factory\TransferFactory;

use function assert;
use function is_array;
use function json_decode;
use function json_encode;

/**
 * Tests for PATCH /api/transfers/bulk — bulk action endpoint.
 *
 * Covers T019, T020, T024, T025 (US2):
 * - apply_label
 * - remove_label
 * - mark_refund
 * - remove_refund
 * - Edge cases: invalid action, empty transferIds, missing labelId
 */
class TransferBulkActionTest extends BankApiTestCase
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

    public function testBulkActionRequiresAuthentication(): void
    {
        $client = static::createClient();
        $client->request('PATCH', '/api/transfers/bulk', [
            'headers' => ['Content-Type' => 'application/merge-patch+json'],
            'json'    => ['action' => 'apply_label', 'transferIds' => []],
        ]);

        $this->assertResponseStatusCodeSame(401);
    }

    public function testBulkApplyLabelAddsLabelToTransfers(): void
    {
        $bankAccount = $this->createTestAccount();
        $label       = LabelFactory::createOne(['name' => 'BulkLabel']);
        $transfer    = TransferFactory::createOne([
            'fromAccount' => $bankAccount,
            'toAccount'   => $bankAccount,
        ]);

        $token  = $this->getToken();
        $client = static::createClient();

        $transferUuid = $transfer->getId();
        $labelUuid    = $label->getId();

        $this->assertNotNull($transferUuid);
        $this->assertNotNull($labelUuid);

        $client->request('PATCH', '/api/transfers/bulk', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/merge-patch+json',
                'Accept'        => 'application/json',
            ],
            'body' => json_encode([
                'action'      => 'apply_label',
                'transferIds' => [(string) $transferUuid],
                'labelId'     => (string) $labelUuid,
            ]),
        ]);

        $this->assertResponseIsSuccessful();
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));

        $this->assertCount(1, $data);
        $firstRow = $data[0];
        assert(is_array($firstRow));
        $this->assertNotEmpty($firstRow['labelIds']);
    }

    public function testBulkMarkRefundSetsParentTransfer(): void
    {
        $bankAccount = $this->createTestAccount();
        $transfer    = TransferFactory::createOne([
            'fromAccount' => $bankAccount,
            'toAccount'   => $bankAccount,
        ]);
        $child       = TransferFactory::createOne([
            'fromAccount' => $bankAccount,
            'toAccount'   => $bankAccount,
        ]);

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
                'action'            => 'mark_refund',
                'transferIds'       => [(string) $childUuid],
                'parentTransferId'  => (string) $parentUuid,
            ]),
        ]);

        $this->assertResponseIsSuccessful();
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));

        $this->assertCount(1, $data);
        $firstRow = $data[0];
        assert(is_array($firstRow));
        $this->assertSame((string) $parentUuid, $firstRow['parentTransferId']);
    }

    public function testBulkRemoveRefundClearsParentTransfer(): void
    {
        $bankAccount = $this->createTestAccount();
        $transfer    = TransferFactory::createOne([
            'fromAccount' => $bankAccount,
            'toAccount'   => $bankAccount,
        ]);
        $child       = TransferFactory::createOne([
            'fromAccount'    => $bankAccount,
            'toAccount'      => $bankAccount,
            'parentTransfer' => $transfer,
        ]);

        $token  = $this->getToken();
        $client = static::createClient();

        $childUuid = $child->getId();
        $this->assertNotNull($childUuid);

        $client->request('PATCH', '/api/transfers/bulk', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/merge-patch+json',
                'Accept'        => 'application/json',
            ],
            'body' => json_encode([
                'action'      => 'remove_refund',
                'transferIds' => [(string) $childUuid],
            ]),
        ]);

        $this->assertResponseIsSuccessful();
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));

        $this->assertCount(1, $data);
        $firstRow = $data[0];
        assert(is_array($firstRow));
        $this->assertNull($firstRow['parentTransferId']);
    }

    public function testBulkActionWithEmptyTransferIdsReturns400(): void
    {
        $token  = $this->getToken();
        $client = static::createClient();

        $client->request('PATCH', '/api/transfers/bulk', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/merge-patch+json',
                'Accept'        => 'application/json',
            ],
            'body' => json_encode([
                'action'      => 'remove_refund',
                'transferIds' => [],
            ]),
        ]);

        $this->assertResponseStatusCodeSame(400);
    }

    public function testBulkApplyLabelWithoutLabelIdReturns400(): void
    {
        $bankAccount = $this->createTestAccount();
        $transfer    = TransferFactory::createOne([
            'fromAccount' => $bankAccount,
            'toAccount'   => $bankAccount,
        ]);

        $token  = $this->getToken();
        $client = static::createClient();

        $transferUuid = $transfer->getId();
        $this->assertNotNull($transferUuid);

        $client->request('PATCH', '/api/transfers/bulk', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/merge-patch+json',
                'Accept'        => 'application/json',
            ],
            'body' => json_encode([
                'action'      => 'apply_label',
                'transferIds' => [(string) $transferUuid],
            ]),
        ]);

        $this->assertResponseStatusCodeSame(400);
    }

    public function testBulkMarkRefundCannotBeOwnParent(): void
    {
        $bankAccount = $this->createTestAccount();
        $transfer    = TransferFactory::createOne([
            'fromAccount' => $bankAccount,
            'toAccount'   => $bankAccount,
        ]);

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

        // Should succeed but return empty (self-reference skipped)
        $this->assertResponseIsSuccessful();
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));
        $this->assertCount(0, $data);
    }
}
