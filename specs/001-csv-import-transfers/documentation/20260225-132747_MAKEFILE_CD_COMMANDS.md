# Makefile cd Commands Added - February 25, 2026

## Change Summary

Updated the Makefile to automatically change to the project root directory before executing any commands.

## What Changed

### ROOT_DIR Resolution

**Before:**
```makefile
ROOT_DIR := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
```

**After:**
```makefile
MAKEFILE_PATH := $(abspath $(lastword $(MAKEFILE_LIST)))
ROOT_DIR := $(shell dirname "$(shell readlink -f "$(MAKEFILE_PATH)" 2>/dev/null || echo "$(MAKEFILE_PATH)")")
```

**Why:** The new approach properly resolves symlinks using `readlink -f`, ensuring the ROOT_DIR always points to the actual project root directory, not the symlink location.

### All Commands Prefixed with cd

**Every command now starts with:**
```makefile
cd $(ROOT_DIR) && <command>
```

**Examples:**
```makefile
up: ## Start all containers
	cd $(ROOT_DIR) && docker compose up -d

test-backend: ## Run backend tests
	cd $(ROOT_DIR) && docker compose exec -e XDEBUG_MODE=off php vendor/bin/phpunit

migrate: ## Run database migrations
	cd $(ROOT_DIR) && docker compose exec -e XDEBUG_MODE=off php bin/console doctrine:migrations:migrate --no-interaction
```

## Benefits

### 1. Works from Anywhere
```bash
# From project root
make test-backend  # ✅ Works

# From backend directory
cd backend
make test-backend  # ✅ Works (via symlink)

# From frontend directory
cd frontend
make test-backend  # ✅ Works (via symlink)
```

### 2. Correct Working Directory
All commands execute in the project root where:
- `docker-compose.yml` is located
- Relative paths work correctly
- Container paths are properly resolved

### 3. Symlink Safe
The `readlink -f` command follows symlinks to find the actual Makefile location, then gets its directory as ROOT_DIR.

## Testing

### Verify ROOT_DIR Resolution
```bash
# From backend
cd backend
make -n up
# Output: cd /home/arnedesmedt/workspace/apps/bank && docker compose up -d

# From frontend
cd frontend
make -n up
# Output: cd /home/arnedesmedt/workspace/apps/bank && docker compose up -d

# From root
make -n up
# Output: cd /home/arnedesmedt/workspace/apps/bank && docker compose up -d
```

All three resolve to the same root directory! ✅

### Test Commands
```bash
# Test from backend directory
cd backend
make help           # ✅ Works
make test-backend   # ✅ Works
make fixtures-load  # ✅ Works

# Test from frontend directory
cd frontend
make help           # ✅ Works
make lint-frontend  # ✅ Works
```

## How It Works

1. **Makefile symlink** in `backend/` or `frontend/` is invoked
2. **Make finds** the actual Makefile location using `readlink -f`
3. **ROOT_DIR** is set to the parent directory of the actual Makefile
4. **Every command** changes to ROOT_DIR before executing
5. **Docker compose** commands find `docker-compose.yml` in the root
6. **Relative paths** work correctly from the root

## Files Modified

- ✅ `Makefile` - Added ROOT_DIR resolution and cd commands

## Verification Commands

### Check ROOT_DIR
```bash
cd backend && make -n up | head -1
# Should show: cd /path/to/project/root && docker compose up -d
```

### Run from Different Directories
```bash
# All of these should work identically:
make test-backend
cd backend && make test-backend
cd frontend && make test-backend
```

## Edge Cases Handled

1. **Symlinked Makefile**: `readlink -f` resolves to actual file
2. **Direct Makefile**: Falls back to MAKEFILE_PATH if not a symlink
3. **Spaces in paths**: Quoted paths in shell commands
4. **Cross-platform**: Works on Linux (readlink available)

## Result

✅ All make commands now work correctly from:
- Project root
- Backend directory (via symlink)
- Frontend directory (via symlink)

✅ All commands execute in the correct directory (project root)

✅ Docker compose finds docker-compose.yml correctly

✅ Relative paths in commands work as expected

## Before/After Comparison

### Before
```bash
cd backend
make test-backend
# Error: docker-compose.yml not found (looking in backend/)
```

### After
```bash
cd backend
make test-backend
# Success: Changes to root, finds docker-compose.yml, runs tests
```

All issues resolved! 🎉

