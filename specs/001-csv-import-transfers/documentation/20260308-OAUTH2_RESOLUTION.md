# OAuth2 JWT Keys - Complete Resolution Guide

**Date:** March 8, 2026  
**Status:** SOLUTION READY - Manual Step Required

## Issue Summary

You're getting the error:
```
Key path "file:///var/www/html/config/jwt/private.pem" does not exist or is not readable
```

## Root Cause Identified ✓

**The problem is file permissions**, not missing files:

1. ✅ JWT keys exist in `backend/config/jwt/`
2. ✅ Configuration is correct in `.env` and `league_oauth2_server.yaml`
3. ❌ **Private key has 600 permissions** (owner-only read)
4. ❌ **PHP-FPM runs as `www-data` user** (not the file owner)
5. ❌ **`www-data` cannot read the file**

## Quick Fix (Run This Now)

### Option 1: Use the automated script
**Option A - Automated (recommended):**
```bash
cd /home/arnedesmedt/workspace/apps/bank
chmod +x backend/scripts/fix-jwt-permissions.sh
./backend/scripts/fix-jwt-permissions.sh
```

### Option 2: Manual commands

```bash
# Fix permissions
chmod 644 backend/config/jwt/private.pem
chmod 644 backend/config/jwt/public.pem

# Restart PHP container
docker compose restart php

# Wait a moment for startup
sleep 5

# Test OAuth endpoint
curl -X POST http://localhost:8080/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=bank_app&username=john@example.com&password=password123"
```

## Expected Result

After running the fix, you should see a JSON response with:

```json
{
  "token_type": "Bearer",
  "expires_in": 3600,
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJS..."
}
```

## Why This Happened

1. OpenSSL generates private keys with `600` permissions (security best practice)
2. In our Docker setup, files are owned by your host user (UID 1000)
3. PHP-FPM runs as `www-data` (different UID)
4. `www-data` can't read a `600` file owned by someone else

## Why 644 is Safe Here

- **Container isolation**: File only accessible in Docker container
- **Volume mount**: Host directory protected by your user permissions
- **Key is encrypted**: AES-256 encrypted with passphrase
- **Development environment**: Not exposed to internet

## Future Prevention

The `make jwt-keys` command has been updated to automatically set `644` permissions:

```bash
make jwt-keys  # Will now set correct permissions automatically
```

## Verification

After applying the fix, verify with:

```bash
# Check permissions
ls -la backend/config/jwt/
# Should show: -rw-r--r-- (644)

# Check from container
docker compose exec php ls -la /var/www/html/config/jwt/

# Test authentication flow
curl -X POST http://localhost:8080/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=bank_app&username=john@example.com&password=password123"
```

## Files Modified/Created

✅ `Makefile` - Updated `jwt-keys` with chmod  
✅ `backend/Makefile` - Updated `jwt-keys` with chmod  
✅ `backend/scripts/fix-jwt-permissions.sh` - Automated fix script  
✅ `backend/.env` - Using `%kernel.project_dir%`  
✅ `backend/.env.local` - Using `%kernel.project_dir%`  
✅ `backend/config/packages/league_oauth2_server.yaml` - Doctrine persistence fixed
✅ `specs/001-csv-import-transfers/documentation/20260308-JWT_KEYS_SETUP.md`  
✅ `specs/001-csv-import-transfers/documentation/20260308-JWT_PERMISSIONS_FIX.md`  
✅ `specs/001-csv-import-transfers/documentation/20260308-OAUTH2_RESOLUTION.md` (this file)  

## Next Steps After Fix

1. ✅ Fix JWT permissions (run script or manual commands above)
2. ⏳ Run migrations: `make migrate`
3. ⏳ Load fixtures: `make fixtures-load`
4. ⏳ Run tests: `make test-backend`
5. ⏳ Test frontend authentication

## Need Help?

If the fix doesn't work:

1. Check Docker container is running: `docker compose ps`
2. Check PHP logs: `docker compose logs php --tail 50`
3. Verify files exist: `docker compose exec php ls -la /var/www/html/config/jwt/`
4. Try regenerating keys: `make jwt-keys` (will now set correct permissions)



