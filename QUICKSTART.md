# Quick Start Guide

## Prerequisites

- Docker and Docker Compose installed
- Git

## Getting Started

### 1. Generate JWT Keys for OAuth2

Before starting the services, you need to generate JWT keys for OAuth2 authentication:

```bash
# From the project root
make jwt-keys
```

This will create:
- `backend/config/jwt/private.pem` - Encrypted private key (644 permissions)
- `backend/config/jwt/public.pem` - Public key (644 permissions)

**Important:** The keys are automatically set with `644` permissions so PHP-FPM's `www-data` user can read them. If you generate keys manually with `openssl`, make sure to run `chmod 644` on both files.

**Note:** These keys are git-ignored and should never be committed. You'll need to regenerate them on each new environment.

### 2. Start the Services

```bash
# From the project root
docker compose up -d
```

This will start:
- PostgreSQL database on port 5432
- PHP-FPM backend service
- Nginx web server on port 8080
- React frontend on port 3000

### 3. Check Service Status

```bash
docker compose ps
```

You should see 4 services running:
- bank_db
- bank_php
- bank_nginx
- bank_frontend

### 4. View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f php
docker compose logs -f frontend
```

Or use the Makefile:
```bash
make logs
make logs-php
make logs-frontend
```

### 5. Run Database Migrations

```bash
docker compose exec php bin/console doctrine:migrations:migrate --no-interaction
```

Or use the Makefile:
```bash
make migrate
```

### 6. Access the Application

- Frontend: http://0.0.0.0:3000
- Backend API: http://0.0.0.0:8080
- Database: `postgresql://bank_user:bank_password@localhost:5432/bank_app`

## Development Workflow

### Make Commands

You can run `make` commands from:
- **Project root:** `/`
- **Backend directory:** `/backend` (symlink)
- **Frontend directory:** `/frontend` (symlink)

```bash
# From any directory
make help           # Show all available commands
make up            # Start all containers
make down          # Stop all containers
make test-backend  # Run backend tests
```

### 6. Development Workflow

#### Backend Development

```bash
# Access PHP container
docker compose exec php sh

# Run tests
docker compose exec php vendor/bin/phpunit

# Run linting
docker compose exec php vendor/bin/grumphp run

# Create a new migration
docker compose exec php bin/console doctrine:migrations:generate

# Clear cache
docker compose exec php bin/console cache:clear
```

Or use the Makefile:
```bash
make shell-php
make test-backend
make lint-backend      # Run all linting tools
make fix-backend       # Auto-fix PHPCS violations
make fixtures-load     # Load test data (dev environment)
make migrate-create
```

**Note:** If linting fails with PHPCS violations, run `make fix-backend` to automatically fix most issues.

#### Load Test Data

To populate your development database with test users:

```bash
make fixtures-load
```

This creates test users:
- `john@example.com` / `password123`
- `jane@example.com` / `password456`
- `admin@example.com` / `admin123` (admin role)

#### Frontend Development

```bash
# Access frontend container
docker compose exec frontend sh

# Run tests
docker compose exec frontend npm test

# Run linting
docker compose exec frontend npm run lint

# Format code
docker compose exec frontend npm run format
```

Or use the Makefile:
```bash
make shell-frontend
make test-frontend
make lint-frontend
make format-frontend
```

#### Database Access

```bash
# Access PostgreSQL shell
docker compose exec db psql -U bank_user -d bank_app
```

Or use the Makefile:
```bash
make shell-db
```

### 7. Debugging with Xdebug

Xdebug is configured and enabled in the PHP container.

**Configuration:**
- Port: 9003
- IDE Key: PHPSTORM
- Mode: debug, develop, coverage
- Client Host: host.docker.internal
- Log File: Disabled (to avoid permission issues)

**Note:** You may see a message "Could not connect to debugging client" in the logs when no IDE is listening - this is normal and expected.

**Verify Xdebug is working:**
```bash
docker exec bank_php php -m | grep xdebug
# Should output: xdebug
```

**For PhpStorm/IntelliJ:**
1. Go to Settings → PHP → Debug
2. Set Xdebug port to 9003
3. Enable "Start listening for PHP Debug Connections"
4. Configure Server (Settings → PHP → Servers):
   - Name: bank-app
   - Host: localhost
   - Port: 8080
   - Path mapping: `/home/arnedesmedt/workspace/apps/bank/backend` → `/var/www/html`
5. Set a breakpoint in your code
6. Make a request to the backend

**For VS Code:**
Add this to `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Listen for Xdebug",
      "type": "php",
      "request": "launch",
      "port": 9003,
      "pathMappings": {
        "/var/www/html": "${workspaceFolder}/backend"
      }
    }
  ]
}
```

**Complete documentation**: See `/specs/001-csv-import-transfers/documentation/XDEBUG_SETUP.md`

### 8. Stop the Services

```bash
docker compose down
```

Or use the Makefile:
```bash
make down
```

### 9. Reset Everything

```bash
# Stop and remove containers, networks, volumes
docker compose down -v

# Clean up Docker system
docker system prune -f
```

Or use the Makefile:
```bash
make clean
```

## Using Tmuxinator (Advanced)

If you have tmuxinator installed:

```bash
tmuxinator start -p devops/tmuxinator.yml
```

This will open a tmux session with multiple panes:
- Docker Compose logs
- PHP shell and logs
- Frontend shell and logs
- Database shell and logs
- Nginx logs
- Editor pane

## Troubleshooting

### Tailwind CSS PostCSS Error

If you see an error like:
```
[postcss] It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin
```

This means the Tailwind CSS v4 PostCSS plugin needs to be properly configured. The fix is already applied, but if you need to reinstall:

```bash
docker compose exec frontend npm install -D @tailwindcss/postcss
docker compose exec frontend rm -rf node_modules/.vite
docker compose restart frontend
```

See `/specs/001-csv-import-transfers/documentation/ISSUE_TAILWIND_POSTCSS.md` for details.

### Frontend Container Exits Immediately

If the frontend container exits, check the logs:
```bash
docker compose logs frontend
```

The frontend requires Node 20.19+ or 22.12+. The Docker container uses Node 22, so this should work automatically.

### Database Connection Errors

Make sure the database container is healthy:
```bash
docker compose ps
```

If the PHP container can't connect, restart it:
```bash
docker compose restart php
```

### Permission Issues

If you encounter permission issues with files:
```bash
# Fix backend permissions
docker compose exec php chown -R www-data:www-data var/

# Fix frontend permissions (if needed)
docker compose exec frontend chown -R node:node /app/node_modules
```

### Clear All Caches

```bash
# Backend
docker compose exec php bin/console cache:clear

# Frontend
docker compose exec frontend rm -rf node_modules/.vite
docker compose restart frontend
```

## Helpful Commands

```bash
# View all available make commands
make help

# Install dependencies
make install

# Build Docker images
make build

# Run all tests
make test-backend
make test-frontend

# Reset database
make db-reset
```

## Next Steps

After completing Phase 1 setup, you're ready to implement Phase 2:
- User entity and authentication
- Database schema and migrations
- Error handling middleware
- API endpoints for the first user story

See `/specs/001-csv-import-transfers/tasks.md` for the complete task list.

