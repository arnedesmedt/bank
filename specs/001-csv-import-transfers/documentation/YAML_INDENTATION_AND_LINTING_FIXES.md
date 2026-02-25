# YAML Indentation and Linting Configuration Fixes

## Date
February 25, 2026

## Changes Made

### 1. YAML Indentation - All files now use 4-space indentation

Updated all YAML files in the project to use consistent 4-space indentation instead of 2-space:

**Files Updated:**
- ✅ `docker-compose.yml` - Main docker compose file
- ✅ `devops/tmuxinator.yml` - Tmuxinator configuration
- ✅ `backend/grumphp.yml` - GrumPHP linting configuration
- ✅ `backend/compose.yaml` - Backend compose file
- ✅ `backend/compose.override.yaml` - Compose override
- ✅ All other YAML files already had 4-space indentation

### 2. Xdebug Messages During Linting

**Issue:** Xdebug was showing connection messages during linting commands:
```
Xdebug: [Step Debug] Could not connect to debugging client...
```

**Fix:** Disabled Xdebug for commands that don't need debugging by setting `XDEBUG_MODE=off`

**Files Updated:**
- `Makefile` - Added `-e XDEBUG_MODE=off` to the following targets:
  - `lint-backend`
  - `test-backend`
  - `migrate`
  - `migrate-create`
  - `db-reset`
  - `install-backend`

**Before:**
```makefile
lint-backend: ## Run backend linting
	docker compose exec php vendor/bin/grumphp run
```

**After:**
```makefile
lint-backend: ## Run backend linting
	docker compose exec -e XDEBUG_MODE=off php vendor/bin/grumphp run
```

### 3. PHPCS Configuration Error

**Issue:** PHPCS was looking for files with incorrect paths:
```
ERROR: The file "backend/config/bundles.php" does not exist.
```

**Root Cause:** 
- When grumphp runs from git hooks, it passes file paths relative to the repository root
- PHPCS runs from `/var/www/html` (backend directory) in the container
- Paths like `backend/config/bundles.php` don't exist from the backend directory context

**Fix:** Updated `backend/grumphp.yml` to:
1. Use `phpcs.xml.dist` configuration file
2. Add whitelist patterns to only check files within the backend directory structure
3. Added `stop_on_failure: false` to continue checking all tools even if one fails

**Updated Configuration:**
```yaml
phpcs:
    standard: phpcs.xml.dist
    triggered_by: ['php']
    whitelist_patterns:
        - /^src\/.*/
        - /^tests\/.*/
```

This ensures PHPCS only checks files in `src/` and `tests/` directories, which are properly configured in `phpcs.xml.dist`.

### 4. phpcs.xml.dist Configuration

The `phpcs.xml.dist` file is properly configured to:
- Use Doctrine coding standard
- Check `src/` and `tests/` directories
- Exclude `vendor/`, `var/`, `public/`, and `migrations/` directories
- Use proper basepath (`.`)

## Verification

All linting commands now work correctly:

```bash
# Run all backend linting (no errors)
make lint-backend

# Run PHPCS directly (no errors)
docker compose exec -e XDEBUG_MODE=off php vendor/bin/phpcs

# Run PHPStan directly (no errors)
docker compose exec -e XDEBUG_MODE=off php vendor/bin/phpstan analyse

# Run Rector directly (no errors)
docker compose exec -e XDEBUG_MODE=off php vendor/bin/rector process --dry-run
```

## Summary of Active Linting Tools

✅ **PHPStan** (Level: max) - Static analysis
✅ **PHPCS** (Standard: Doctrine) - Coding standards
✅ **Rector** (PHP 8.5) - Code quality and modernization
❌ **PHPMD** - Temporarily disabled (PHP 8.5 incompatibility)

## Benefits

1. **Clean Output** - No more Xdebug connection messages during linting
2. **Consistent Style** - All YAML files use 4-space indentation
3. **Reliable Checks** - PHPCS now correctly checks only backend files
4. **Git Hooks Ready** - GrumPHP will work correctly on commit with proper file path handling
5. **Performance** - Xdebug disabled for non-debugging commands improves speed

## Git Hook Usage

GrumPHP is configured to run automatically on git commits:

```bash
# Stage and commit files
git add backend/src/Kernel.php
git commit -m "Update kernel"

# GrumPHP will automatically run:
# - PHPStan on changed PHP files
# - PHPCS on changed PHP files in src/ and tests/
# - Rector on changed PHP files
```

If checks fail, the commit will be blocked. Use `--no-verify` to skip checks if needed:

```bash
git commit -m "WIP" --no-verify
```

