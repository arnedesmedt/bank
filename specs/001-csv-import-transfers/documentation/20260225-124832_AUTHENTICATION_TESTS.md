# Authentication Integration Tests

## Date
February 25, 2026

## Overview

Comprehensive integration tests for user authentication using League OAuth2 Server and the password grant flow.

## Test File

**Location:** `backend/tests/Api/AuthenticationTest.php`

## Test Coverage

### 1. Successful Authentication Tests

#### `testUserCanLoginWithValidCredentials()`
- **Given:** A registered user exists with valid credentials
- **When:** User attempts to login with correct email and password
- **Then:** User receives an access token with `Bearer` type
- **Validates:** OAuth2 token endpoint, password grant flow

#### `testAuthenticatedUserCanAccessProtectedEndpoint()`
- **Given:** A user has obtained a valid access token
- **When:** User accesses `/api/me` with the token
- **Then:** User data (id, email, roles) is returned
- **Validates:** OAuth2 resource server, token validation

### 2. Authentication Failure Tests

#### `testUserCannotLoginWithInvalidPassword()`
- **Given:** A registered user exists
- **When:** User attempts to login with wrong password
- **Then:** Login fails with 401 Unauthorized
- **Validates:** Password verification

#### `testUserCannotLoginWithNonexistentEmail()`
- **Given:** No user with the email exists
- **When:** User attempts to login
- **Then:** Login fails with 401 Unauthorized
- **Validates:** User existence check

### 3. Authorization Tests

#### `testUnauthenticatedUserCannotAccessProtectedEndpoint()`
- **Given:** No authentication token provided
- **When:** User accesses `/api/me` without token
- **Then:** Access denied with 401 Unauthorized
- **Validates:** Protected endpoint security

#### `testUserCannotAccessProtectedEndpointWithInvalidToken()`
- **Given:** An invalid/malformed token
- **When:** User accesses protected endpoint
- **Then:** Access denied with 401 Unauthorized
- **Validates:** Token validation

### 4. Parameter Validation Tests

#### `testTokenEndpointRequiresAllRequiredParameters()`
- **Given:** Missing required parameters (e.g., password)
- **When:** User requests token
- **Then:** Request fails with 400 Bad Request
- **Validates:** OAuth2 parameter validation

### 5. Multi-User Tests

#### `testMultipleUsersCanLoginIndependently()`
- **Given:** Multiple users exist
- **When:** Each user logs in
- **Then:** Each receives unique tokens and can access their own data
- **Validates:** User isolation, token uniqueness

## Test Infrastructure

### Setup
- Uses `ApiPlatform\Symfony\Bundle\Test\ApiTestCase`
- Cleans database before/after each test
- Creates test users with hashed passwords
- Uses real Doctrine EntityManager

### Helper Methods

```php
protected function setUp(): void
protected function tearDown(): void
private function cleanDatabase(): void
private function createTestUser(string $email, string $password): User
```

### Test Database
- Configured in `.env.test`
- Uses separate `bank_app_test` database
- Automatically cleaned between tests

## OAuth2 Flow Tested

### Password Grant Request
```
POST /token
Content-Type: application/x-www-form-urlencoded

grant_type=password
client_id=bank_app
username=user@example.com
password=secretpassword
scope=email
```

### Token Response
```json
{
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "token_type": "Bearer",
    "expires_in": 3600
}
```

### Protected Endpoint Access
```
GET /api/me
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

### User Data Response
```json
{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "roles": ["ROLE_USER"]
}
```

## Running the Tests

### Run All Authentication Tests
```bash
make test-backend
```

### Run Specific Test Class
```bash
docker compose exec -e XDEBUG_MODE=off php vendor/bin/phpunit tests/Api/AuthenticationTest.php
```

### Run Single Test Method
```bash
docker compose exec -e XDEBUG_MODE=off php vendor/bin/phpunit --filter testUserCanLoginWithValidCredentials
```

### Run with Coverage
```bash
docker compose exec -e XDEBUG_MODE=coverage php vendor/bin/phpunit --coverage-html coverage/
```

## Dependencies

### Required Packages
- `api-platform/core` - API testing framework
- `symfony/test-pack` - Testing utilities
- `phpunit/phpunit` - Test framework
- `doctrine/doctrine-fixtures-bundle` - Optional for fixtures

### Required Configuration
- `phpunit.xml` - PHPUnit configuration
- `.env.test` - Test environment variables
- `config/packages/test/` - Test-specific config

## Test Scenarios Covered

### ✅ Happy Path
- User registration → Login → Access protected resources
- Multiple users with independent sessions
- Token-based authentication flow

### ✅ Error Cases
- Invalid credentials (wrong password)
- Nonexistent user
- Missing authentication
- Invalid token
- Missing required parameters

### ✅ Security
- Password hashing
- Token validation
- Protected endpoint security
- User isolation

## Known Limitations

### Token Expiry Testing
Currently, the `testUserCannotAccessProtectedEndpointWithExpiredToken()` test doesn't fully test expiration. To implement:
1. Configure shorter token TTL in test environment
2. Use time manipulation or sleep
3. Or manually revoke tokens in database

### Refresh Token Testing
Not yet implemented. To add:
- Test refresh token grant
- Test token refresh flow
- Test refresh token revocation

### OAuth2 Client Testing
Currently uses hardcoded `bank_app` client. To enhance:
- Create OAuth2 client in fixtures
- Test multiple clients
- Test client authentication

## Integration with Frontend

The frontend `AuthContext.tsx` uses these same endpoints:

```typescript
// Login
POST /token with OAuth2 password grant

// Get user info
GET /api/me with Bearer token

// Logout
Remove token from localStorage
```

## Files Created/Modified

### Created
- `backend/tests/Api/AuthenticationTest.php` - Integration tests
- `backend/src/Controller/UserController.php` - `/api/me` endpoint
- `backend/phpunit.xml` - PHPUnit configuration

### Modified
- `backend/.env.test` - Test database configuration
- `frontend/src/contexts/AuthContext.tsx` - UUID support (id: string)

## Next Steps

1. **Run Tests:** Verify all tests pass
2. **Add Fixtures:** Create reusable test fixtures
3. **Refresh Tokens:** Implement refresh token tests
4. **Token Expiry:** Add proper expiry testing
5. **Rate Limiting:** Test authentication rate limits
6. **2FA:** Add two-factor authentication tests (future)

## Success Criteria

All 9 test methods should pass:
- ✅ testUserCanLoginWithValidCredentials
- ✅ testUserCannotLoginWithInvalidPassword
- ✅ testUserCannotLoginWithNonexistentEmail
- ✅ testAuthenticatedUserCanAccessProtectedEndpoint
- ✅ testUnauthenticatedUserCannotAccessProtectedEndpoint
- ✅ testUserCannotAccessProtectedEndpointWithInvalidToken
- ✅ testUserCannotAccessProtectedEndpointWithExpiredToken (placeholder)
- ✅ testTokenEndpointRequiresAllRequiredParameters
- ✅ testMultipleUsersCanLoginIndependently

## References

- [API Platform Testing](https://api-platform.com/docs/symfony/testing/)
- [Symfony Testing](https://symfony.com/doc/current/testing.html)
- [League OAuth2 Server](https://oauth2.thephpleague.com/)
- [PHPUnit Documentation](https://phpunit.de/documentation.html)

