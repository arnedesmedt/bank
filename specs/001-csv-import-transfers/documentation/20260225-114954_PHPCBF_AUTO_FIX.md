# PHPCBF Auto-Fix Configuration

## Date
February 25, 2026

## Issue
GrumPHP doesn't have a built-in `phpcbf` task, so we cannot automatically run PHP Code Beautifier and Fixer when PHPCS detects violations during git commits.

## Solution
Instead of trying to integrate phpcbf into GrumPHP, we provide a manual command to fix coding standards violations.

## Usage

### Automatic Fixing with Makefile

When you get PHPCS violations, you can automatically fix most of them by running:

```bash
make fix-backend
```

This will run `phpcbf` (PHP Code Beautifier and Fixer) which automatically fixes coding standard violations that can be fixed.

### Manual Fixing

You can also run phpcbf directly:

```bash
# From the project root
docker compose exec -e XDEBUG_MODE=off php vendor/bin/phpcbf

# Or from inside the container
docker compose exec php bash
vendor/bin/phpcbf
```

### Fix Specific File

To fix a specific file:

```bash
docker compose exec -e XDEBUG_MODE=off php vendor/bin/phpcbf src/Kernel.php
```

## Workflow

1. Make your code changes
2. Try to commit: `git commit -m "Your message"`
3. If PHPCS fails with violations:
   - Run `make fix-backend` to auto-fix
   - Review the changes
   - Stage the fixed files: `git add .`
   - Commit again: `git commit -m "Your message"`

## What Can Be Auto-Fixed?

PHPCBF can automatically fix many common issues:
- ✅ Indentation
- ✅ Line length
- ✅ Spacing around operators
- ✅ Missing blank lines
- ✅ Extra blank lines
- ✅ Trailing whitespace
- ✅ Opening/closing brace placement

## What Cannot Be Auto-Fixed?

Some violations require manual intervention:
- ❌ Variable naming conventions
- ❌ Method naming conventions
- ❌ Missing type hints
- ❌ Missing documentation blocks
- ❌ Complex structural issues

For these, you'll need to manually fix them based on the PHPCS error messages.

## Configuration

PHPCBF uses the same configuration as PHPCS (`phpcs.xml.dist`):
- Standard: Doctrine Coding Standard
- Directories: `src/` and `tests/`
- Excludes: `vendor/`, `var/`, `public/`, `migrations/`

## Alternative: Skip Pre-Commit Checks

If you need to commit quickly and fix later:

```bash
git commit -m "WIP" --no-verify
```

**Warning:** Use this sparingly, as it bypasses all quality checks.

## Makefile Targets

```bash
make lint-backend   # Run all linting tools (PHPStan, PHPCS, Rector)
make fix-backend    # Auto-fix PHPCS violations with phpcbf
make test-backend   # Run PHPUnit tests
```

## Why Not Auto-Fix on Commit?

While it would be nice to automatically fix issues on commit, there are good reasons not to:

1. **Review Changes**: Developers should review auto-fixes before committing
2. **Git Staging**: Auto-fixes would modify staged files, requiring re-staging
3. **Transparency**: Manual fixing makes developers aware of coding standard issues
4. **Partial Fixes**: Some fixes might not be what you want, requiring review

## Best Practices

1. **Run linting before committing**: Get into the habit of running `make lint-backend` before committing
2. **Fix as you go**: Address linting issues immediately while the context is fresh
3. **Use IDE integration**: Configure your IDE to show PHPCS violations in real-time
4. **Auto-format on save**: Configure your IDE to run phpcbf when saving files

## IDE Integration

### PhpStorm/IntelliJ IDEA

1. Go to Settings → PHP → Quality Tools → PHP_CodeSniffer
2. Configuration: Point to `/var/www/html/vendor/bin/phpcs` in the container
3. Go to Settings → Editor → Inspections
4. Enable "PHP → Quality Tools → PHP_CodeSniffer validation"
5. Set Coding Standard to "Doctrine"

### VS Code

Install the "PHP Sniffer & Beautifier" extension:

```json
{
  "phpSniffer.standard": "Doctrine",
  "phpSniffer.executablesFolder": "/var/www/html/vendor/bin/",
  "phpcbf.executablePath": "/var/www/html/vendor/bin/phpcbf",
  "phpcbf.onsave": true
}
```

## Summary

- ✅ GrumPHP checks PHPCS on commit
- ✅ `make fix-backend` auto-fixes violations
- ✅ PHPCBF uses same config as PHPCS
- ✅ Developers review fixes before committing
- ✅ Manual workflow ensures code quality awareness

