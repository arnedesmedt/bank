# Password Hashing Fix Summary

**Date:** March 10, 2026  
**Issue:** Passwords were not being hashed in the test database  
**Status:** ✅ RESOLVED

## Problem

When running tests, passwords were being stored in plain text instead of being hashed. This caused authentication tests to fail because the OAuth2 server couldn't validate credentials properly.

The root cause was that the `GlobalFixtures` story was configured in Foundry's `global_state`, which loads fixtures **before** the test's `setUp()` method runs. This meant the password hasher wasn't set when user fixtures were being created.

## Solution

### 1. Removed GlobalFixtures from global_state

**File:** `backend/config/packages/test/zenstruck_foundry.yaml`

Removed the automatic loading of `GlobalFixtures`:
```yaml
when@test:
    zenstruck_foundry:
        auto_refresh_proxies: false
        # Removed: global_state: [App\Tests\Story\GlobalFixtures]
```

### 2. Updated GlobalFixtures Story

**File:** `backend/tests/Story/GlobalFixtures.php`

- Removed the `#[AsFixture('global')]` attribute
- Removed constructor dependency injection (which required the Foundry bundle to be fully initialized)
- Kept it simple - just creates the admin user when loaded

```php
class GlobalFixtures extends Story
{
    public function build(): void
    {
        // Password hasher must be set before loading this story
        UserFactory::createOne([
            'email' => UserFactory::ADMIN_EMAIL,
        ]);
    }
}
```

### 3. Updated AuthenticationTest

**File:** `backend/tests/Api/AuthenticationTest.php`

Modified `setUp()` to:
1. Set the password hasher for UserFactory
2. Manually load GlobalFixtures story (after password hasher is set)
3. Load OAuth2 client fixtures

```php
protected function setUp(): void
{
    parent::setUp();

    // Set password hasher for factories
    $passwordHasher = static::getContainer()->get(UserPasswordHasherInterface::class);
    UserFactory::setPasswordHasher($passwordHasher);

    // Load global fixtures (admin user)
    GlobalFixtures::load();

    // Load OAuth2 client fixture
    $container = static::getContainer();
    $manager = $container->get('doctrine')->getManager();
    $fixture = new OAuth2ClientFixtures();
    $fixture->load($manager);
}
```

### 4. Fixed OAuth2 Token Request Format

Updated all tests to use JSON format instead of form-encoded data:

**Before:**
```php
$client->request('POST', '/token', [
    'headers' => ['Content-Type' => 'application/x-www-form-urlencoded'],
    'body' => http_build_query([...])
]);
```

**After:**
```php
$client->request('POST', '/token', [
    'headers' => [
        'Accept' => 'application/json',
        'Content-Type' => 'application/json',
    ],
    'json' => [
        'grant_type' => 'password',
        'username' => 'john@example.com',
        'password' => 'password123',
        'client_id' => OAuth2ClientFixtures::DEFAULT_CLIENT_IDENTIFIER,
    ],
]);
```

### 5. Fixed Test Assertions

Updated tests to expect 400 (Bad Request) instead of 401 for invalid credentials, as per OAuth2 spec:

```php
$this->assertResponseStatusCodeSame(400);
$response = $client->getResponse();
$data = json_decode($response->getContent(false), true);
$this->assertArrayHasKey('error', $data);
$this->assertSame('invalid_grant', $data['error']);
```

## Test Results

### Before Fix
- 8 errors: "Stories with dependencies cannot be used without the foundry bundle"
- Password hashing not working at all

### After Fix
- ✅ 7 out of 9 tests passing
- ✅ Password hashing working correctly
- ✅ User login tests passing
- ✅ Invalid credential tests passing
- ✅ Token generation working

### Remaining Issues (Unrelated to Password Hashing)
- 2 tests failing for `/api/me` endpoint with Bearer token authentication
- This is a separate OAuth2 token validation issue, not a password hashing issue

## Key Takeaways

1. **Foundry global_state loads before setUp()** - Don't use it for fixtures that need services from the container
2. **Password hasher must be set before creating users** - Always call `UserFactory::setPasswordHasher()` before creating user fixtures
3. **OAuth2 endpoints may require JSON format** - Check what format your OAuth2 server expects
4. **Use `getContent(false)` for error responses** - Prevents exceptions when reading 4xx/5xx response bodies

## Files Modified

1. `backend/config/packages/test/zenstruck_foundry.yaml` - Removed global_state
2. `backend/tests/Story/GlobalFixtures.php` - Simplified to remove dependencies
3. `backend/tests/Api/AuthenticationTest.php` - Fixed setUp, request format, and assertions

## Verification

Run the tests:
```bash
make test-backend
```

Expected output:
- Tests: 9, Assertions: 20+
- Failures: 2 (unrelated to password hashing)
- All password-related tests pass ✅

