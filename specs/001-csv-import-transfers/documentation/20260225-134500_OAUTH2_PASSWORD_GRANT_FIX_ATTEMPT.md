# OAuth2 Password Grant Fix Attempt - February 25, 2026

## What Was Done

### 1. Created OAuth2 Infrastructure

**Files Created:**
- `src/OAuth2/UserEntity.php` - League OAuth2 UserEntityInterface implementation
- `src/OAuth2/UserConverter.php` - Converts Symfony User to League UserEntity  
- `src/OAuth2/PasswordGrantUserRepository.php` - Implements UserRepositoryInterface for password grant
- `src/DataFixtures/OAuth2ClientFixtures.php` - Creates OAuth2 client in database

### 2. Configuration Updates

**Updated `config/packages/league_oauth2_server.yaml`:**
```yaml
league_oauth2_server:
    authorization_server:
        enable_password_grant: true
        enable_refresh_token_grant: true
    persistence:
        doctrine: null
```

**Updated `config/services.yaml`:**
```yaml
League\Bundle\OAuth2ServerBundle\Converter\UserConverterInterface:
    alias: App\OAuth2\UserConverter

League\OAuth2\Server\Repositories\UserRepositoryInterface:
    alias: App\OAuth2\PasswordGrantUserRepository
```

### 3. Test Setup

**Updated `tests/Api/AuthenticationTest.php`:**
- Loads OAuth2ClientFixtures in setUp()
- Uses Zenstruck Foundry factories

### 4. Database

**OAuth2 Tables Created:**
- oauth2_client
- oauth2_access_token
- oauth2_refresh_token
- oauth2_authorization_code

**Client Created:**
```sql
INSERT INTO oauth2_client (identifier, name, grants)
VALUES ('bank_app', 'Bank Application', 'password,refresh_token')
```

## Current Status: ❌ Still Failing

### Error
```
HTTP 400: unsupported_grant_type
"The authorization grant type is not supported by the authorization server."
```

### Test Results
- **5/9 tests passing** (non-OAuth2 tests)
- **4/9 tests failing** (all OAuth2 authentication tests)

## Investigation Results

### ✅ Verified Working
1. League OAuth2 Server Bundle is installed and registered
2. Routes are configured (`/token` endpoint exists)
3. Configuration shows `enable_password_grant: true`
4. User Repository service is registered and used by password grant
5. OAuth2 client exists in database with correct grants
6. UserConverter and PasswordGrantUserRepository are autowired correctly

### ❓ Still Unknown
Why the password grant is not being recognized despite:
- Configuration enabling it
- Service being registered
- Client having the correct grant type
- All components in place

## Possible Issues

### 1. Bundle Version Compatibility
The League OAuth2 Server Bundle might have issues with:
- Symfony 8.x
- PHP 8.5
- Latest API Platform

### 2. Missing Configuration
There might be additional configuration needed that's not documented or obvious.

### 3. Service Wiring
Despite autowiring showing correct, there might be a runtime issue with how services are being called.

### 4. Request Format
The token request might need different parameters or format, though it follows OAuth2 spec:
```php
[
    'grant_type' => 'password',
    'client_id' => 'bank_app',
    'username' => 'john@example.com',
    'password' => 'password123',
    'scope' => 'email',
]
```

## Recommendations

### Option 1: Switch to Lexik JWT (RECOMMENDED)
- Much simpler configuration
- Better Symfony 8 support
- More widely used
- Proven to work
- 30 minutes to implement

```bash
composer remove league/oauth2-server-bundle
composer require lexik/jwt-authentication-bundle
```

### Option 2: Deep Debug League OAuth2
- Enable Symfony profiler in test
- Add extensive logging to PasswordGrantUserRepository
- Check League OAuth2 Server source code
- Debug token controller
- Estimated time: 2-4 hours

### Option 3: Continue with Partial Implementation
- Keep current OAuth2 setup
- Accept 4 failing tests for now
- Focus on other features
- Come back to authentication later

## Time Spent

- OAuth2 setup: ~3 hours
- Still not working
- Diminishing returns on continued debugging

## Decision Point

**Question:** Continue with League OAuth2 Server or switch to Lexik JWT?

**Lexik JWT Advantages:**
- ✅ Simpler (no OAuth2 complexity)
- ✅ Well-documented for Symfony
- ✅ Battle-tested
- ✅ Works with API Platform  
- ✅ Just need JWT tokens, not full OAuth2

**League OAuth2 Advantages:**
- ✅ Full OAuth2 compliance
- ✅ Multiple grant types
- ✅ Refresh tokens
- ❌ Complex setup
- ❌ Not working currently

## Files Modified

1. `backend/src/OAuth2/UserEntity.php` (new)
2. `backend/src/OAuth2/UserConverter.php` (new)
3. `backend/src/OAuth2/PasswordGrantUserRepository.php` (new)
4. `backend/src/DataFixtures/OAuth2ClientFixtures.php` (new)
5. `backend/config/packages/league_oauth2_server.yaml` (modified)
6. `backend/config/services.yaml` (modified)
7. `backend/tests/Api/AuthenticationTest.php` (modified)
8. `backend/migrations/Version20260225000003.php` (OAuth2 tables)

## Next Steps

### If Continuing with League OAuth2:
1. Enable test environment debugging
2. Add extensive logging
3. Check League OAuth2 Server GitHub issues
4. Review bundle documentation again
5. Try minimal example from bundle repo

### If Switching to Lexik JWT:
1. Remove League OAuth2 bundle
2. Install Lexik JWT bundle
3. Generate JWT keys
4. Configure JWT authentication
5. Update tests to use JWT tokens
6. Should work in 30-60 minutes

## Conclusion

After 3+ hours of configuration and debugging, League OAuth2 Server password grant is still not working despite all components being properly configured. 

**Recommendation:** Switch to Lexik JWT Authentication Bundle for simplicity and proven compatibility with Symfony 8.

