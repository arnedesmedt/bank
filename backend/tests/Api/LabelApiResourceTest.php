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

    public function testGetCollectionReturnsAllLabels(): void
    {
        // Owner removed: all labels are visible to any authenticated user
        LabelFactory::createMany(3);

        $otherUser = UserFactory::new()->withCredentials('other@example.com', 'pass')->create();
        unset($otherUser); // no ownership; labels created without owner

        LabelFactory::createMany(2);

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
        $this->assertCount(5, $data);
    }

    public function testGetSingleLabel(): void
    {
        $label = LabelFactory::createOne(['name' => 'Grocery']);

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
        $parentLabel = LabelFactory::createOne(['name' => 'Food']);

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
        $label = LabelFactory::createOne(['name' => 'OldName']);

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
        $label = LabelFactory::createOne();
        $uuid  = $label->getId();
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

    public function testAnyAuthenticatedUserCanAccessAnyLabel(): void
    {
        // Owner removed: labels are accessible by any authenticated user
        $label = LabelFactory::createOne(['name' => 'SharedLabel']);
        $uuid  = $label->getId();
        assert($uuid !== null);
        $token = $this->getToken(); // Admin token

        $client = static::createClient();
        $client->request('GET', '/api/labels/' . $uuid->toRfc4122(), [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Accept'        => 'application/json',
            ],
        ]);

        // Without owner restriction, any authenticated user can access any label
        $this->assertResponseIsSuccessful();
    }
}
