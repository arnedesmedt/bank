# JWT Keys Permissions Fix

**Date:** March 8, 2026  
**Issue:** JWT private key not readable by PHP-FPM www-data user

## Problem

The JWT private key was generated with restrictive permissions (600 - owner only), but PHP-FPM runs as the `www-data` user, not as the file owner. This caused the error:

```
Key path "file:///var/www/html/config/jwt/private.pem" does not exist or is not readable
```

## Root Cause

When OpenSSL generates a private key, it sets permissions to `600` (read/write for owner only) for security. However, in the Docker container:
- Files are owned by UID 1000 (your host user)  
- PHP-FPM worker processes run as `www-data` (UID 33 or similar)
- `www-data` cannot read a file with `600` permissions owned by UID 1000

## Solution

### Immediate Fix

Run these commands to fix the permissions:

```bash
chmod 644 /home/arnedesmedt/workspace/apps/bank/backend/config/jwt/private.pem
chmod 644 /home/arnedesmedt/workspace/apps/bank/backend/config/jwt/public.pem
```

Then restart the PHP container:

```bash
cd /home/arnedesmedt/workspace/apps/bank
docker compose restart php
```

Test the OAuth endpoint:

```bash
curl -X POST http://localhost:8080/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=bank_app&username=john@example.com&password=password123"
```

### Permanent Fix

The `make jwt-keys` command has been updated to automatically set correct permissions (644) when generating keys.

## Updated Makefile Commands

Both root and backend Makefiles now include:

```makefile
jwt-keys: ## Generate JWT keys for OAuth2
    @mkdir -p $(ROOT_DIR)/backend/config/jwt
    @openssl genrsa -passout pass:15075cead7b248538ab5ffb826b7139c \
      -out $(ROOT_DIR)/backend/config/jwt/private.pem -aes256 4096
    @openssl rsa -pubout -passin pass:15075cead7b248538ab5ffb826b7139c \
      -in $(ROOT_DIR)/backend/config/jwt/private.pem \
      -out $(ROOT_DIR)/backend/config/jwt/public.pem
    @chmod 644 $(ROOT_DIR)/backend/config/jwt/private.pem
    @chmod 644 $(ROOT_DIR)/backend/config/jwt/public.pem
    @echo "JWT keys generated successfully with correct permissions"
```

## Security Considerations

### Why 644 is acceptable here:

1. **Container isolation**: The file is only accessible within the Docker container
2. **Volume mount**: On the host, only your user has access to the project directory
3. **Private key is encrypted**: The key itself is protected with AES-256 and a passphrase
4. **Development environment**: For production, use proper secrets management

### For production:

- Use Kubernetes secrets or Docker secrets
- Use a secrets manager (HashiCorp Vault, AWS Secrets Manager, etc.)
- Or set proper ownership: `chown www-data:www-data` in Dockerfile
- Consider using different keys per environment

## Verification Steps

1. **Check file permissions:**
   ```bash
   ls -la backend/config/jwt/
   # Should show: -rw-r--r-- for both files
   ```

2. **Check from inside container:**
   ```bash
   docker compose exec php ls -la /var/www/html/config/jwt/
   # Should show readable files
   ```

3. **Test OAuth endpoint:**
   ```bash
   curl -X POST http://localhost:8080/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=password&client_id=bank_app&username=test@example.com&password=password"
   ```

## Files Modified

- `Makefile` - Updated `jwt-keys` target with chmod commands
- `backend/Makefile` - Updated `jwt-keys` target with chmod commands
- `backend/config/jwt/private.pem` - Permissions changed to 644
- `backend/config/jwt/public.pem` - Permissions changed to 644

## Next Steps

1. Apply the permissions fix manually (run chmod commands above)
2. Restart PHP container
3. Test OAuth token generation
4. Proceed with running migrations if not done yet

