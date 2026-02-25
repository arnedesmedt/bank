# Backend Linting Fixes Summary

## Date
February 25, 2026

## Issues Fixed

### 1. Rector Deprecation Warning
**Issue:** Rector was showing deprecation warnings about the `strictBooleans` prepared set.
```
[WARNING] The "strictBooleans" set is deprecated as mostly risky and not practical.
```

**Fix:** Removed `strictBooleans: true` from the `withPreparedSets()` configuration in `backend/rector.php`.

**Changed File:** `backend/rector.php`

### 2. Rector Code Style Issues
**Issue:** Rector identified 2 code style improvements needed:
- `tests/SmokeTest.php`: Variable should be named `$kernelBrowser` instead of `$client`
- `tests/bootstrap.php`: Unnecessary parentheses around `new Dotenv()`

**Fix:** Applied rector's suggested fixes:
- Renamed `$client` to `$kernelBrowser` in SmokeTest.php
- Changed `(new Dotenv())->bootEnv()` to `new Dotenv()->bootEnv()` in bootstrap.php

**Changed Files:**
- `backend/tests/SmokeTest.php` (already auto-fixed by rector)
- `backend/tests/bootstrap.php` (manually applied)

### 3. PHPMD Compatibility with PHP 8.5
**Issue:** PHPMD 2.x is not compatible with PHP 8.5, causing fatal errors:
```
Fatal error: Declaration of PDepend\DependencyInjection\PdependExtension::load() must be compatible with 
Symfony\Component\DependencyInjection\Extension\ExtensionInterface::load(): void
```

**Fix:** Temporarily disabled PHPMD in grumphp.yml with a comment explaining the situation. PHPMD will be re-enabled when version 3.x is released with PHP 8.5 support.

**Changed File:** `backend/grumphp.yml`

### 4. PHPCS Configuration Issues
**Issue:** PHPCS was looking for files in incorrect paths and using PSR12 instead of Doctrine coding standard.

**Fix:** 
- Updated `phpcs.xml.dist` to use Doctrine coding standard
- Configured it to only scan `src/` and `tests/` directories
- Added exclude patterns for vendor, var, public, and migrations directories
- Added `use_grumphp_paths: false` to phpcs configuration in grumphp.yml

**Changed Files:**
- `backend/phpcs.xml.dist`
- `backend/grumphp.yml`

## Files Changed

### 1. `backend/rector.php`
```diff
- strictBooleans: true
```
Removed deprecated strictBooleans from prepared sets.

### 2. `backend/tests/bootstrap.php`
```diff
- (new Dotenv())->bootEnv(dirname(__DIR__).'/.env');
+ new Dotenv()->bootEnv(dirname(__DIR__).'/.env');
```
Removed unnecessary parentheses.

### 3. `backend/grumphp.yml`
```diff
+ # phpmd:
+ #   ruleset: ['phpmd.xml']
+ #   triggered_by: ['php']
+ #   exclude:
+ #     - 'vendor'
+ #     - 'var'
+ #     - 'public'
+ #     - 'migrations'
+ # Note: PHPMD is temporarily disabled due to incompatibility with PHP 8.5
+ # Waiting for PHPMD 3.x release that supports PHP 8.5
```
Disabled PHPMD temporarily.

```diff
  phpcs:
    standard: Doctrine
+   use_grumphp_paths: false
    triggered_by: ['php']
```
Fixed PHPCS configuration.

### 4. `backend/phpcs.xml.dist`
```diff
- <rule ref="PSR12"/>
+ <rule ref="Doctrine"/>

- <file>bin/</file>
- <file>config/</file>
- <file>public/</file>
  <file>src/</file>
  <file>tests/</file>

+ <exclude-pattern>*/vendor/*</exclude-pattern>
+ <exclude-pattern>*/var/*</exclude-pattern>
+ <exclude-pattern>*/public/*</exclude-pattern>
+ <exclude-pattern>*/migrations/*</exclude-pattern>
```
Updated to use Doctrine standard and proper file paths.

## Verification

All linting tools now pass successfully:

✅ **PHPStan** - No errors (level: max)
✅ **PHPCS** - No violations (Doctrine coding standard)
✅ **Rector** - No issues, no deprecation warnings
❌ **PHPMD** - Temporarily disabled (PHP 8.5 incompatibility)

### Commands Run

```bash
# Direct tool execution
docker compose exec php vendor/bin/phpstan analyse  # ✅ Passed
docker compose exec php vendor/bin/phpcs            # ✅ Passed
docker compose exec php vendor/bin/rector --dry-run # ✅ Passed

# Full grumphp suite
docker compose exec php vendor/bin/grumphp run      # ✅ Passed
```

## Next Steps

1. **Monitor PHPMD releases**: Watch for PHPMD 3.x release that supports PHP 8.5
2. **Re-enable PHPMD**: Once compatible version is available, uncomment PHPMD in grumphp.yml and update composer.json
3. **Consider alternatives**: If PHPMD 3.x takes too long, consider alternatives like:
   - PHP_CodeSniffer with additional rulesets
   - PHPStan with stricter rules
   - Psalm as an alternative static analyzer

## Known Deprecation Warnings

The following deprecation warnings from PHPMD dependencies are expected and will be resolved when PHPMD is updated:
- `Non-canonical cast (integer) is deprecated`
- `Implicitly marking parameter as nullable is deprecated`

These are warnings from the PHPMD library itself, not from our code.

