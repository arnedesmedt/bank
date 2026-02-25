# Backend Scripts

This directory contains utility scripts for the backend application.

## Available Scripts

### fix-jwt-permissions.sh

**Purpose:** Fixes file permissions on JWT keys to make them readable by the PHP-FPM www-data user.

**When to use:**
- After generating JWT keys for the first time
- When getting "Key path does not exist or is not readable" errors
- After regenerating keys with `make jwt-keys`

**Usage:**
```bash
# From project root
chmod +x backend/scripts/fix-jwt-permissions.sh
./backend/scripts/fix-jwt-permissions.sh
```

**What it does:**
1. Changes permissions on `backend/config/jwt/private.pem` to 644
2. Changes permissions on `backend/config/jwt/public.pem` to 644
3. Restarts the PHP container
4. Tests the OAuth2 endpoint to verify it works

**Note:** The script navigates to the project root automatically, so it works regardless of where it's called from.

## Adding New Scripts

When adding new utility scripts:

1. Place them in this directory
2. Make them executable: `chmod +x script-name.sh`
3. Add documentation to this README
4. Use proper error handling (`set -e`)
5. Add clear echo statements for user feedback
6. Navigate to project root if needed: `cd "$(dirname "$0")/../.."`

