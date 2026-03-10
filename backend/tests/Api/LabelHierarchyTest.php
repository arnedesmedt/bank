<?php

declare(strict_types=1);

namespace App\Tests\Api;

use ApiPlatform\Symfony\Bundle\Test\Response;
use App\Tests\Factory\BankAccountFactory;
use App\Tests\Factory\LabelFactory;
use App\Tests\Factory\UserFactory;

use function assert;
use function is_array;
use function json_decode;

/**
 * Tests for label hierarchy (parent-child), auto-linking via bank accounts and regexes.
 * Covers Phase 4 / User Story 2 requirements.
 */
class LabelHierarchyTest extends BankApiTestCase
{
    // phpcs:ignore
    // Parent-child hierarchy
    // phpcs:ignore

    public function testCreateLabelWithParentSetsHierarchy(): void
    {
        $adminUser   = UserFactory::find(['email' => UserFactory::ADMIN_EMAIL]);
        $parentLabel = LabelFactory::createOne([
            'owner' => $adminUser,
            'name'  => 'Groceries',
        ]);

        $parentUuid = $parentLabel->getId();
        assert($parentUuid !== null);

        $token  = $this->getToken();
        $client = static::createClient();

        $client->request('POST', '/api/labels', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'json' => [
                'name'          => 'Bread',
                'parentLabelId' => $parentUuid->toRfc4122(),
                'linkedRegexes' => [],
            ],
        ]);

        $this->assertResponseStatusCodeSame(201);
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));
        $this->assertSame('Bread', $data['name']);
        $this->assertSame($parentUuid->toRfc4122(), $data['parentLabelId']);
        $this->assertSame('Groceries', $data['parentLabelName']);
    }

    public function testUpdateLabelCanChangeParent(): void
    {
        $adminUser    = UserFactory::find(['email' => UserFactory::ADMIN_EMAIL]);
        $label        = LabelFactory::createOne(['owner' => $adminUser, 'name' => 'Food']);
        $parentLabel2 = LabelFactory::createOne(['owner' => $adminUser, 'name' => 'Household']);
        $childLabel   = LabelFactory::createOne([
            'owner'       => $adminUser,
            'name'        => 'Supermarket',
            'parentLabel' => $label,
        ]);

        $childUuid   = $childLabel->getId();
        $parent2Uuid = $parentLabel2->getId();
        assert($childUuid !== null);
        assert($parent2Uuid !== null);

        $token  = $this->getToken();
        $client = static::createClient();

        $client->request('PUT', '/api/labels/' . $childUuid->toRfc4122(), [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'json' => [
                'name'          => 'Supermarket',
                'parentLabelId' => $parent2Uuid->toRfc4122(),
                'linkedRegexes' => [],
            ],
        ]);

        $this->assertResponseIsSuccessful();
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));
        $this->assertSame($parent2Uuid->toRfc4122(), $data['parentLabelId']);
        $this->assertSame('Household', $data['parentLabelName']);
    }

    public function testUpdateLabelCanRemoveParent(): void
    {
        $adminUser   = UserFactory::find(['email' => UserFactory::ADMIN_EMAIL]);
        $parentLabel = LabelFactory::createOne(['owner' => $adminUser, 'name' => 'Food']);
        $childLabel  = LabelFactory::createOne([
            'owner'       => $adminUser,
            'name'        => 'Bread',
            'parentLabel' => $parentLabel,
        ]);

        $childUuid = $childLabel->getId();
        assert($childUuid !== null);

        $token  = $this->getToken();
        $client = static::createClient();

        $client->request('PUT', '/api/labels/' . $childUuid->toRfc4122(), [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'json' => [
                'name'          => 'Bread',
                'parentLabelId' => null,
                'linkedRegexes' => [],
            ],
        ]);

        $this->assertResponseIsSuccessful();
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));
        $this->assertNull($data['parentLabelId']);
        $this->assertNull($data['parentLabelName']);
    }

    public function testGetLabelReturnsParentInfo(): void
    {
        $adminUser   = UserFactory::find(['email' => UserFactory::ADMIN_EMAIL]);
        $parentLabel = LabelFactory::createOne(['owner' => $adminUser, 'name' => 'Food']);
        $childLabel  = LabelFactory::createOne([
            'owner'       => $adminUser,
            'name'        => 'Milk',
            'parentLabel' => $parentLabel,
        ]);

        $childUuid  = $childLabel->getId();
        $parentUuid = $parentLabel->getId();
        assert($childUuid !== null);
        assert($parentUuid !== null);

        $token  = $this->getToken();
        $client = static::createClient();

        $client->request('GET', '/api/labels/' . $childUuid->toRfc4122(), [
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
        $this->assertSame('Milk', $data['name']);
        $this->assertSame($parentUuid->toRfc4122(), $data['parentLabelId']);
        $this->assertSame('Food', $data['parentLabelName']);
    }

    // phpcs:ignore
    // Linking labels to bank accounts
    // phpcs:ignore

    public function testCreateLabelWithLinkedBankAccounts(): void
    {
        $adminUser   = UserFactory::find(['email' => UserFactory::ADMIN_EMAIL]);
        $bankAccount = BankAccountFactory::createOne([
            'owner'         => $adminUser,
            'accountNumber' => 'BE68539007547034',
            'accountName'   => 'My Account',
        ]);

        $bankAccountUuid = $bankAccount->getId();
        assert($bankAccountUuid !== null);

        $token  = $this->getToken();
        $client = static::createClient();

        $client->request('POST', '/api/labels', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'json' => [
                'name'                 => 'Salary',
                'linkedBankAccountIds' => [$bankAccountUuid->toRfc4122()],
                'linkedRegexes'        => [],
            ],
        ]);

        $this->assertResponseStatusCodeSame(201);
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));
        $this->assertSame('Salary', $data['name']);
        $linkedBankAccountIds = $data['linkedBankAccountIds'];
        assert(is_array($linkedBankAccountIds));
        $this->assertContains($bankAccountUuid->toRfc4122(), $linkedBankAccountIds);
    }

    public function testUpdateLabelCanAddAndRemoveBankAccounts(): void
    {
        $adminUser = UserFactory::find(['email' => UserFactory::ADMIN_EMAIL]);
        BankAccountFactory::createOne([
            'owner'         => $adminUser,
            'accountNumber' => 'BE68539007547034',
        ]);
        $bankAccount2 = BankAccountFactory::createOne([
            'owner'         => $adminUser,
            'accountNumber' => 'BE71096400007055',
        ]);
        $label        = LabelFactory::createOne(['owner' => $adminUser, 'name' => 'Bills']);

        $labelUuid        = $label->getId();
        $bankAccount2Uuid = $bankAccount2->getId();
        assert($labelUuid !== null);
        assert($bankAccount2Uuid !== null);

        $token  = $this->getToken();
        $client = static::createClient();

        // Update: link bank account 2 only
        $client->request('PUT', '/api/labels/' . $labelUuid->toRfc4122(), [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'json' => [
                'name'                 => 'Bills',
                'linkedBankAccountIds' => [$bankAccount2Uuid->toRfc4122()],
                'linkedRegexes'        => [],
            ],
        ]);

        $this->assertResponseIsSuccessful();
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));
        $linkedBankAccountIds = $data['linkedBankAccountIds'];
        assert(is_array($linkedBankAccountIds));
        $this->assertCount(1, $linkedBankAccountIds);
        $this->assertContains($bankAccount2Uuid->toRfc4122(), $linkedBankAccountIds);
    }

    public function testCannotLinkBankAccountOwnedByAnotherUser(): void
    {
        $otherUser   = UserFactory::new()->withCredentials('other@example.com', 'pass')->create();
        $bankAccount = BankAccountFactory::createOne([
            'owner'         => $otherUser,
            'accountNumber' => 'BE68539007547034',
        ]);

        $bankAccountUuid = $bankAccount->getId();
        assert($bankAccountUuid !== null);

        $token  = $this->getToken(); // Admin token
        $client = static::createClient();

        $client->request('POST', '/api/labels', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'json' => [
                'name'                 => 'Test',
                'linkedBankAccountIds' => [$bankAccountUuid->toRfc4122()],
                'linkedRegexes'        => [],
            ],
        ]);

        // Should succeed but NOT link the bank account (security check)
        $this->assertResponseStatusCodeSame(201);
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));
        $linkedBankAccountIds = $data['linkedBankAccountIds'];
        assert(is_array($linkedBankAccountIds));
        $this->assertEmpty($linkedBankAccountIds);
    }

    // phpcs:ignore
    // Linking labels to regexes
    // phpcs:ignore

    public function testCreateLabelWithRegexes(): void
    {
        $token  = $this->getToken();
        $client = static::createClient();

        $client->request('POST', '/api/labels', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'json' => [
                'name'          => 'Netflix',
                'linkedRegexes' => ['/NETFLIX/i', '/streaming/i'],
            ],
        ]);

        $this->assertResponseStatusCodeSame(201);
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));
        $this->assertSame('Netflix', $data['name']);
        $linkedRegexes = $data['linkedRegexes'];
        assert(is_array($linkedRegexes));
        $this->assertContains('/NETFLIX/i', $linkedRegexes);
        $this->assertContains('/streaming/i', $linkedRegexes);
    }

    public function testUpdateLabelRegexes(): void
    {
        $adminUser = UserFactory::find(['email' => UserFactory::ADMIN_EMAIL]);
        $label     = LabelFactory::createOne([
            'owner'         => $adminUser,
            'name'          => 'Utilities',
            'linkedRegexes' => ['/ELECTRICITY/i'],
        ]);

        $labelUuid = $label->getId();
        assert($labelUuid !== null);

        $token  = $this->getToken();
        $client = static::createClient();

        $client->request('PUT', '/api/labels/' . $labelUuid->toRfc4122(), [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'json' => [
                'name'          => 'Utilities',
                'linkedRegexes' => ['/ELECTRICITY/i', '/GAS/i', '/WATER/i'],
            ],
        ]);

        $this->assertResponseIsSuccessful();
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));
        $linkedRegexes = $data['linkedRegexes'];
        assert(is_array($linkedRegexes));
        $this->assertCount(3, $linkedRegexes);
    }

    // phpcs:ignore
    // Max value and max percentage
    // phpcs:ignore

    public function testCreateLabelWithMaxValueAndPercentage(): void
    {
        $token  = $this->getToken();
        $client = static::createClient();

        $client->request('POST', '/api/labels', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'json' => [
                'name'          => 'Entertainment',
                'linkedRegexes' => [],
                'maxValue'      => '200.00',
                'maxPercentage' => '10.00',
            ],
        ]);

        $this->assertResponseStatusCodeSame(201);
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));
        $this->assertSame('200.00', $data['maxValue']);
        $this->assertSame('10.00', $data['maxPercentage']);
    }

    // phpcs:ignore
    // Collection returns linkedBankAccountIds
    // phpcs:ignore

    public function testGetCollectionIncludesLinkedBankAccountIds(): void
    {
        $adminUser   = UserFactory::find(['email' => UserFactory::ADMIN_EMAIL]);
        $bankAccount = BankAccountFactory::createOne([
            'owner'         => $adminUser,
            'accountNumber' => 'BE68539007547034',
        ]);

        $bankAccountUuid = $bankAccount->getId();
        assert($bankAccountUuid !== null);

        $token  = $this->getToken();
        $client = static::createClient();

        // Create label with linked bank account
        $client->request('POST', '/api/labels', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'json' => [
                'name'                 => 'MySalary',
                'linkedBankAccountIds' => [$bankAccountUuid->toRfc4122()],
                'linkedRegexes'        => [],
            ],
        ]);

        $this->assertResponseStatusCodeSame(201);

        // Fetch collection
        $client->request('GET', '/api/labels', [
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
        $firstItem = $data[0];
        assert(is_array($firstItem));
        $linkedBankAccountIds = $firstItem['linkedBankAccountIds'];
        assert(is_array($linkedBankAccountIds));
        $this->assertContains($bankAccountUuid->toRfc4122(), $linkedBankAccountIds);
    }
}
