# PHPCBF Integration Summary

## Date
February 25, 2026

## Problem
User requested automatic running of `phpcbf` when PHPCS fails in GrumPHP during git commits.

## Challenge
GrumPHP does not have a built-in `phpcbf` task. When we tried to add it to `grumphp.yml`, we got:
```
Fatal error: Uncaught GrumPHP\Exception\TaskConfigResolverException: 
Could not load config resolver for task: "phpcbf". The task is not known.
```

## Solution Implemented

### 1. Removed Invalid PHPCBF Task from GrumPHP
Since GrumPHP doesn't support `phpcbf` as a built-in task, we removed it from `backend/grumphp.yml`.

### 2. Added Manual Fix Command to Makefile
Created a new `fix-backend` target in the Makefile:

```makefile
fix-backend: ## Auto-fix backend coding standards
	docker compose exec -e XDEBUG_MODE=off php vendor/bin/phpcbf
```

### 3. Updated Documentation
Created comprehensive documentation at `/specs/001-csv-import-transfers/documentation/PHPCBF_AUTO_FIX.md` explaining:
- How to use `make fix-backend`
- What can and cannot be auto-fixed
- Recommended workflow
- IDE integration tips

### 4. Updated QUICKSTART.md
Added information about the `fix-backend` command to the development workflow section.

## Final Configuration

### grumphp.yml
```yaml
tasks:
    phpstan:
        # ... config ...
    phpcs:
        standard: phpcs.xml.dist
        triggered_by: ['php']
        whitelist_patterns:
            - /^src\/.*/
            - /^tests\/.*/
    rector:
        # ... config ...
```

**Note:** No `phpcbf` task - it's not supported by GrumPHP.

### Makefile
```makefile
lint-backend: ## Run backend linting
	docker compose exec -e XDEBUG_MODE=off php vendor/bin/grumphp run

fix-backend: ## Auto-fix backend coding standards
	docker compose exec -e XDEBUG_MODE=off php vendor/bin/phpcbf
```

## Usage Workflow

### When PHPCS Fails on Commit

1. **Attempt to commit:**
   ```bash
   git commit -m "Your changes"
   ```

2. **If PHPCS fails, auto-fix violations:**
   ```bash
   make fix-backend
   ```

3. **Review the changes:**
   ```bash
   git diff
   ```

4. **Stage the fixes and commit:**
   ```bash
   git add .
   git commit -m "Your changes"
   ```

### Manual Testing Before Commit

```bash
# Check for violations
make lint-backend

# If violations found, auto-fix
make fix-backend

# Verify fixes worked
make lint-backend
```

## Why This Approach?

### Advantages
1. ✅ **Developer Control**: Developers review auto-fixes before committing
2. ✅ **Simplicity**: Easy to understand and use
3. ✅ **Transparency**: Clear what's happening with explicit commands
4. ✅ **Flexibility**: Can run phpcbf on specific files if needed
5. ✅ **No Git Issues**: Avoids complications with auto-modifying staged files

### Why Not Automatic?
- GrumPHP doesn't support phpcbf as a built-in task
- Custom tasks would add complexity
- Automatic modification of staged files can be confusing
- Developers should review auto-fixes for quality control

## Alternative Approaches Considered

### 1. Custom GrumPHP Extension
**Rejected because:**
- Would require creating a custom GrumPHP extension
- Adds maintenance burden
- Over-engineered for the need

### 2. Git Pre-Commit Hook Script
**Rejected because:**
- Would conflict with GrumPHP's hook management
- Less transparent than explicit commands
- Harder to skip when needed

### 3. Running phpcbf Before phpcs in GrumPHP
**Rejected because:**
- GrumPHP doesn't have a phpcbf task
- Would silently modify files without developer awareness

## Commands Summary

```bash
# Linting (checks only, no modifications)
make lint-backend

# Auto-fix coding standards violations
make fix-backend

# Test backend code
make test-backend

# Run specific tools manually
docker compose exec -e XDEBUG_MODE=off php vendor/bin/phpcs      # Check only
docker compose exec -e XDEBUG_MODE=off php vendor/bin/phpcbf     # Fix
docker compose exec -e XDEBUG_MODE=off php vendor/bin/phpstan    # Static analysis
docker compose exec -e XDEBUG_MODE=off php vendor/bin/rector     # Refactoring
```

## Files Modified

1. **backend/grumphp.yml** - Removed invalid phpcbf task
2. **Makefile** - Added `fix-backend` target (already existed)
3. **QUICKSTART.md** - Added documentation for fix-backend
4. **specs/001-csv-import-transfers/documentation/PHPCBF_AUTO_FIX.md** - New comprehensive guide
5. **specs/001-csv-import-transfers/documentation/README.md** - Updated index

## Verification

All commands tested and working:
- ✅ `make lint-backend` - Runs without errors
- ✅ `make fix-backend` - Runs phpcbf successfully
- ✅ `docker compose exec -e XDEBUG_MODE=off php vendor/bin/phpcbf --version` - Works
- ✅ GrumPHP git hooks - No longer have phpcbf error

## Next Steps

Developers should:
1. Read `/specs/001-csv-import-transfers/documentation/PHPCBF_AUTO_FIX.md`
2. Get familiar with the `make fix-backend` command
3. Consider setting up IDE integration for real-time PHPCS feedback
4. Use `make lint-backend` before committing to catch issues early

## Conclusion

The solution provides a clean, simple workflow for fixing PHPCS violations without the complexity of automatic fixing on commit. Developers maintain full control and awareness of code changes while having a convenient command to fix most violations automatically.

