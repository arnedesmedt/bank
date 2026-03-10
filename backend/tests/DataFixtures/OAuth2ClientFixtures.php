<?php

declare(strict_types=1);

namespace App\Tests\DataFixtures;

use App\DataFixtures\OAuth2ClientFixtures as BaseOAuth2ClientFixtures;

/**
 * Re-exposes the DEFAULT_CLIENT_IDENTIFIER constant for tests
 * and delegates loading to the src-level fixture.
 */
class OAuth2ClientFixtures extends BaseOAuth2ClientFixtures
{
}
