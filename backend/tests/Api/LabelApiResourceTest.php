<?php

declare(strict_types=1);

namespace App\Tests\Api;

use ApiPlatform\Symfony\Bundle\Test\Response;
use App\Tests\Factory\LabelFactory;
use App\Tests\Factory\UserFactory;

use function assert;
use function is_array;
use function json_decode;

class LabelApiResourceTest extends BankApiTestCase
{
    public function testGetCollectionRequiresAuthentication(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/labels');

        $this->assertResponseStatusCodeSame(401);
    }

    public function testGetCollectionReturnsOwnedLabels(): void
    {
        $adminUser = UserFactory::find(['email' => UserFactory::ADMIN_EMAIL]);
        LabelFactory::createMany(3, ['owner' => $adminUser]);

        $otherUser = UserFactory::new()->withCredentials('other@example.com', 'pass')->create();
        LabelFactory::createMany(2, ['owner' => $otherUser]);

        $token  = $this->getToken();
        $client = static::createClient();

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
        $this->assertCount(3, $data);
    }

    public function testGetSingleLabel(): void
    {
        $adminUser = UserFactory::find(['email' => UserFactory::ADMIN_EMAIL]);
        $label     = LabelFactory::createOne([
            'owner' => $adminUser,
            'name'  => 'Grocery',
        ]);

        $uuid = $label->getId();
        assert($uuid !== null);
        $token = $this->getToken();

        $client = static::createClient();
        $client->request('GET', '/api/labels/' . $uuid->toRfc4122(), [
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
        $this->assertSame('Grocery', $data['name']);
    }

    public function testCreateLabel(): void
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
                'name'           => 'Transport',
                'linkedRegexes'  => [],
                'maxValue'       => null,
                'maxPercentage'  => null,
            ],
        ]);

        $this->assertResponseStatusCodeSame(201);
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));
        $this->assertArrayHasKey('id', $data);
        $this->assertSame('Transport', $data['name']);
    }

    public function testCreateLabelWithParent(): void
    {
        $adminUser   = UserFactory::find(['email' => UserFactory::ADMIN_EMAIL]);
        $parentLabel = LabelFactory::createOne([
            'owner' => $adminUser,
            'name'  => 'Food',
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
        $this->assertSame('Food', $data['parentLabelName']);
    }

    public function testUpdateLabel(): void
    {
        $adminUser = UserFactory::find(['email' => UserFactory::ADMIN_EMAIL]);
        $label     = LabelFactory::createOne([
            'owner' => $adminUser,
            'name'  => 'OldName',
        ]);

        $uuid = $label->getId();
        assert($uuid !== null);
        $token = $this->getToken();

        $client = static::createClient();
        $client->request('PUT', '/api/labels/' . $uuid->toRfc4122(), [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'json' => [
                'name'          => 'UpdatedName',
                'linkedRegexes' => [],
            ],
        ]);

        $this->assertResponseIsSuccessful();
        $response = $client->getResponse();
        assert($response instanceof Response);
        $data = json_decode($response->getContent(), true);
        assert(is_array($data));
        $this->assertSame('UpdatedName', $data['name']);
    }

    public function testDeleteLabel(): void
    {
        $adminUser = UserFactory::find(['email' => UserFactory::ADMIN_EMAIL]);
        $label     = LabelFactory::createOne(['owner' => $adminUser]);
        $uuid      = $label->getId();
        assert($uuid !== null);
        $token = $this->getToken();

        $client = static::createClient();
        $client->request('DELETE', '/api/labels/' . $uuid->toRfc4122(), [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Accept'        => 'application/json',
            ],
        ]);

        $this->assertResponseStatusCodeSame(204);
    }

    public function testCannotAccessOtherUsersLabel(): void
    {
        $otherUser = UserFactory::new()->withCredentials('other@example.com', 'pass')->create();
        $label     = LabelFactory::createOne(['owner' => $otherUser]);
        $uuid      = $label->getId();
        assert($uuid !== null);
        $token = $this->getToken(); // Admin token

        $client = static::createClient();
        $client->request('GET', '/api/labels/' . $uuid->toRfc4122(), [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Accept'        => 'application/json',
            ],
        ]);

        $this->assertResponseStatusCodeSame(403);
    }
}
