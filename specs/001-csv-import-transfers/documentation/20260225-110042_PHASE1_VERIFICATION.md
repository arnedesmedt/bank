# Phase 1 Verification Checklist

Use this checklist to verify that Phase 1 setup is complete and working correctly.

## ✅ Project Structure

- [x] `/backend/` directory exists with Symfony structure
- [x] `/frontend/` directory exists with React/Vite structure
- [x] `/devops/` directory exists with tmuxinator config
- [x] `/docker-compose.yml` exists at root
- [x] `.env` files configured in root, backend, and frontend

## ✅ Backend Configuration

### Dependencies
- [x] PHP 8.5 or compatible version specified
- [x] Symfony 8.x installed
- [x] API Platform installed
- [x] Doctrine ORM installed
- [x] PostgreSQL driver installed
- [x] OAuth2 server bundle installed
- [x] Xdebug configured
- [x] grumphp installed
- [x] phpstan installed
- [x] phpmd installed
- [x] phpcs installed (Doctrine coding standard)
- [x] rector installed
- [x] PHPUnit and test-pack installed

### Configuration Files
- [x] `/backend/grumphp.yml` - All tasks configured
- [x] `/backend/phpstan.dist.neon` - Level max
- [x] `/backend/rector.php` - PHP 8.5 rules
- [x] `/backend/phpmd.xml` - Custom ruleset
- [x] `/backend/phpcs.xml.dist` - Doctrine standard
- [x] `/backend/phpunit.dist.xml` - Test configuration
- [x] `/backend/config/packages/api_platform.yaml` - JSON only, docs disabled
- [x] `/backend/config/jwt/private.pem` - OAuth2 private key
- [x] `/backend/config/jwt/public.pem` - OAuth2 public key
- [x] `/backend/.env` - Database and OAuth2 configured

### Docker
- [x] `/backend/docker/Dockerfile` - PHP 8.5 with Xdebug
- [x] `/backend/docker/Dockerfile.nginx` - Nginx configuration
- [x] `/backend/docker/xdebug.ini` - Xdebug settings
- [x] `/backend/docker/default.conf` - Nginx server config
- [x] `/backend/docker/nginx.conf` - Nginx main config

## ✅ Frontend Configuration

### Dependencies
- [x] React 19+ installed
- [x] TypeScript installed
- [x] Vite 7+ installed
- [x] TailwindCSS 4+ installed
- [x] PostCSS and Autoprefixer installed
- [x] ESLint installed
- [x] Prettier installed
- [x] Vitest installed
- [x] @testing-library/react installed
- [x] jsdom installed

### Configuration Files
- [x] `/frontend/package.json` - All scripts configured
- [x] `/frontend/vite.config.ts` - Docker-compatible server config
- [x] `/frontend/vitest.config.ts` - Test configuration
- [x] `/frontend/tailwind.config.js` - TailwindCSS config
- [x] `/frontend/postcss.config.js` - PostCSS config
- [x] `/frontend/.prettierrc` - Prettier config
- [x] `/frontend/.prettierignore` - Prettier ignore patterns
- [x] `/frontend/eslint.config.js` - ESLint config
- [x] `/frontend/src/index.css` - Tailwind directives
- [x] `/frontend/src/test/setup.ts` - Test setup
- [x] `/frontend/.env` - API URL configured

### Docker
- [x] `/frontend/Dockerfile` - Node 22 configuration

## ✅ Docker Compose

### Services Defined
- [x] `db` - PostgreSQL 16 Alpine
- [x] `php` - PHP 8.5 FPM with Xdebug
- [x] `nginx` - Web server for backend
- [x] `frontend` - Node 22 for React app

### Configuration
- [x] Network `bank_network` created
- [x] Volume `db_data` for PostgreSQL persistence
- [x] Health check for database
- [x] Proper service dependencies
- [x] Environment variables configured
- [x] Ports mapped correctly (5432, 8080, 3000)

## ✅ DevOps

- [x] `/devops/tmuxinator.yml` - Multi-pane configuration
- [x] `/Makefile` - Common development commands
- [x] `/.gitignore` - Ignore patterns configured

## ✅ Documentation

- [x] `/README.md` - Project overview and setup
- [x] `/QUICKSTART.md` - Quick start guide
- [x] `/specs/001-csv-import-transfers/documentation/PHASE1_SUMMARY.md` - Implementation summary
- [x] `/specs/001-csv-import-transfers/tasks.md` - Phase 1 tasks marked complete

## ✅ Quality Tools Verification

### Backend
Run these commands to verify backend quality tools:

```bash
# Check PHPStan
docker compose exec php vendor/bin/phpstan --version

# Check PHPCS
docker compose exec php vendor/bin/phpcs --version

# Check PHPMD
docker compose exec php vendor/bin/phpmd --version

# Check Rector
docker compose exec php vendor/bin/rector --version

# Check PHPUnit
docker compose exec php vendor/bin/phpunit --version

# Check GrumPHP
docker compose exec php vendor/bin/grumphp --version
```

### Frontend
Run these commands to verify frontend quality tools:

```bash
# Check ESLint
docker compose exec frontend npx eslint --version

# Check Prettier
docker compose exec frontend npx prettier --version

# Check Vitest
docker compose exec frontend npx vitest --version

# Check TypeScript
docker compose exec frontend npx tsc --version
```

## 🧪 Functional Verification

### 1. Start Services
```bash
docker compose up -d
```

**Expected Result:** All 4 services start successfully

### 2. Check Service Health
```bash
docker compose ps
```

**Expected Result:** All services show "Up" status, database shows "healthy"

### 3. Check Backend Logs
```bash
docker compose logs php | head -20
```

**Expected Result:** No critical errors, Symfony boots successfully

### 4. Check Frontend Logs
```bash
docker compose logs frontend | head -20
```

**Expected Result:** Vite dev server starts on port 3000

### 5. Test Backend API
```bash
curl -I http://localhost:8080
```

**Expected Result:** HTTP response (404 or 200 is fine, just verifying it responds)

### 6. Test Frontend
Open browser to http://localhost:3000

**Expected Result:** React app loads (even if showing default Vite + React page)

### 7. Test Database Connection
```bash
docker compose exec db psql -U bank_user -d bank_app -c "SELECT version();"
```

**Expected Result:** PostgreSQL version information displayed

### 8. Test PHP Container
```bash
docker compose exec php php -v
```

**Expected Result:** PHP 8.5.x version displayed

### 9. Test Xdebug
```bash
docker compose exec php php -m | grep xdebug
```

**Expected Result:** "xdebug" appears in the list

### 10. Run Backend Test
```bash
docker compose exec php vendor/bin/phpunit
```

**Expected Result:** Tests run (even if 0 tests, no errors should occur)

### 11. Run Frontend Test
```bash
docker compose exec frontend npm test -- --run
```

**Expected Result:** Vitest runs (even if 0 tests)

### 12. Test Backend Linting
```bash
docker compose exec php vendor/bin/phpstan analyse --memory-limit=1G
```

**Expected Result:** PHPStan completes analysis (may find issues in src/ but shouldn't crash)

### 13. Test Frontend Linting
```bash
docker compose exec frontend npm run lint
```

**Expected Result:** ESLint runs successfully

## 📋 Configuration Verification

### Backend .env
```bash
cat backend/.env | grep -E "APP_ENV|DATABASE_URL|OAUTH"
```

**Expected Values:**
- APP_ENV=dev
- DATABASE_URL with correct credentials
- OAUTH keys configured

### Frontend .env
```bash
cat frontend/.env
```

**Expected Values:**
- VITE_API_URL=http://localhost:8080
- VITE_OAUTH_CLIENT_ID configured

### Docker Compose .env
```bash
cat .env
```

**Expected Values:**
- POSTGRES_DB=bank_app
- POSTGRES_USER=bank_user
- POSTGRES_PASSWORD configured
- BACKEND_PORT=8080
- FRONTEND_PORT=3000

## ✅ All Phase 1 Tasks Complete

When all items above are checked, Phase 1 is complete and you can proceed to Phase 2:
- T009: Implement base User entity and OAuth2 authentication
- T010: Implement authentication flow in frontend
- T011: Set up PostgreSQL schema and migrations
- T012: Implement error handling middleware
- T013: Finalize API Platform configuration
- T014: Verify Xdebug configuration

## 🎉 Success Criteria

Phase 1 is considered complete when:
1. ✅ All Docker containers start successfully
2. ✅ Backend responds to HTTP requests
3. ✅ Frontend loads in browser
4. ✅ Database accepts connections
5. ✅ All quality tools are installed and functional
6. ✅ Test frameworks execute without errors
7. ✅ All configuration files are in place
8. ✅ Documentation is complete
9. ✅ Tasks.md shows Phase 1 tasks as complete

---

**Status:** ✅ COMPLETE

**Date Completed:** February 25, 2026

**Next Phase:** Phase 2 - Foundational (Blocking Prerequisites)

