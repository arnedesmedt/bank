<?php

declare(strict_types=1);

namespace App\Tests;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class SmokeTest extends WebTestCase
{
    public function testApiIsAccessible(): void
    {
        $kernelBrowser = static::createClient();
        $kernelBrowser->request('GET', '/');

        // We expect a 404 since we haven't defined a root route yet
        // This test just verifies the application boots correctly
        $this->assertTrue(
            $kernelBrowser->getResponse()->isNotFound() || $kernelBrowser->getResponse()->isSuccessful(),
        );
    }
}
