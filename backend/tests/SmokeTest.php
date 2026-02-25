<?php

declare(strict_types=1);

namespace App\Tests;

use ApiPlatform\Symfony\Bundle\Test\ApiTestCase;
use ApiPlatform\Symfony\Bundle\Test\Response;

use function assert;

class SmokeTest extends ApiTestCase
{
    public function testApiIsAccessible(): void
    {
        $client = static::createClient();
        $client->request('GET', '/');

        // We expect a 404 since we haven't defined a root route yet
        // This test just verifies the application boots correctly
        $response = $client->getResponse();
        assert($response instanceof Response);
        $statusCode = $response->getStatusCode();
        $this->assertTrue(
            $statusCode === 404 || $statusCode === 200,
            'Expected 404 or 200, got ' . $statusCode,
        );
    }
}
