# JWT Keys Setup for OAuth2

**Date:** March 8, 2026  
**Issue:** Missing JWT private/public keys causing OAuth2 server initialization failure

## Problem

When requesting an OAuth2 token, the following error occurred:

```
Key path "file:///var/www/html/config/jwt/private.pem" does not exist or is not readable
```

## Root Cause

The JWT keys required by the `league/oauth2-server-bundle` were not generated during initial setup. These keys are used to sign and verify OAuth2 access tokens (JWT format).

## Solution

### 1. Generated JWT Keys

Created RSA key pair using OpenSSL:

```bash
# Create directory
mkdir -p backend/config/jwt

# Generate private key (encrypted with passphrase from .env)
openssl genrsa -passout pass:15075cead7b248538ab5ffb826b7139c \
  -out backend/config/jwt/private.pem -aes256 4096

# Generate public key from private key
openssl rsa -pubout -passin pass:15075cead7b248538ab5ffb826b7139c \
  -in backend/config/jwt/private.pem \
  -out backend/config/jwt/public.pem
```

### 2. Added Make Commands

Added convenience commands to both root and backend Makefiles:

```makefile
jwt-keys: ## Generate JWT keys for OAuth2
    @mkdir -p $(ROOT_DIR)/backend/config/jwt
    @openssl genrsa -passout pass:15075cead7b248538ab5ffb826b7139c \
      -out $(ROOT_DIR)/backend/config/jwt/private.pem -aes256 4096
    @openssl rsa -pubout -passin pass:15075cead7b248538ab5ffb826b7139c \
      -in $(ROOT_DIR)/backend/config/jwt/private.pem \
      -out $(ROOT_DIR)/backend/config/jwt/public.pem
    @echo "JWT keys generated successfully"
```

Usage:
```bash
make jwt-keys
```

### 3. Updated Documentation

Updated `QUICKSTART.md` to include JWT keys generation as the first setup step.

## Configuration Files

### .env
```dotenv
OAUTH_PRIVATE_KEY=%kernel.project_dir%/config/jwt/private.pem
OAUTH_PUBLIC_KEY=%kernel.project_dir%/config/jwt/public.pem
OAUTH_PASSPHRASE=15075cead7b248538ab5ffb826b7139c
OAUTH_ENCRYPTION_KEY=d25d6732599cb79a3c6eb083262ffb5c
```

### league_oauth2_server.yaml
```yaml
league_oauth2_server:
    authorization_server:
        private_key: '%env(resolve:OAUTH_PRIVATE_KEY)%'
        private_key_passphrase: '%env(resolve:OAUTH_PASSPHRASE)%'
        encryption_key: '%env(resolve:OAUTH_ENCRYPTION_KEY)%'
    resource_server:
        public_key: '%env(resolve:OAUTH_PUBLIC_KEY)%'
```

### .gitignore
```
/config/jwt/*.pem
```

Keys are properly excluded from version control.

## Security Notes

1. **Never commit** these keys to git - they're already in `.gitignore`
2. **Different keys per environment** - production should have different keys
3. **Passphrase security** - in production, use environment variables or secrets manager
4. **Key rotation** - periodically rotate keys (requires token invalidation strategy)

## Verification

```bash
# Check keys exist in container
docker compose exec php ls -la /var/www/html/config/jwt/

# Should show:
# -rw-------  private.pem (3434 bytes)
# -rw-rw-r--  public.pem (800 bytes)

# Test OAuth2 endpoint
curl -X POST http://localhost:8080/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=bank_app&username=user@example.com&password=password123"
```

## Next Steps

- Verify migrations have been run (`make migrate`)
- Test OAuth2 token generation
- Verify protected endpoints work with Bearer tokens

## Files Modified

- `backend/Makefile` - Added `jwt-keys` target
- `Makefile` - Added `jwt-keys` target
- `QUICKSTART.md` - Added JWT keys generation step
- `backend/config/packages/league_oauth2_server.yaml` - Fixed persistence configuration

## Files Created

- `backend/config/jwt/private.pem` (git-ignored)
- `backend/config/jwt/public.pem` (git-ignored)
- `specs/001-csv-import-transfers/documentation/20260308-JWT_KEYS_SETUP.md` (this file)

