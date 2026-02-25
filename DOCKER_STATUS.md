# Docker Compose Status - Bank Application

**Date**: February 25, 2026  
**Status**: ✅ ALL SERVICES RUNNING

## Services Overview

### ✅ Database (PostgreSQL 16)
- **Container**: `bank_db`
- **Image**: `postgres:16-alpine`
- **Port**: 5432 → 5432
- **Status**: Healthy
- **Health Check**: Passing
- **Connection String**: `postgresql://bank_user:bank_password@localhost:5432/bank_app`

### ✅ PHP Backend
- **Container**: `bank_php`
- **Image**: `bank-php` (custom, PHP 8.5-FPM Alpine)
- **Port**: 9000 (internal)
- **Status**: Running
- **Extensions**: pdo, pdo_pgsql, zip
- **Composer**: Installed
- **Volume**: `./backend:/var/www/html` (development mode)

### ✅ Nginx Web Server
- **Container**: `bank_nginx`
- **Image**: `bank-nginx` (custom, Nginx Alpine)
- **Port**: 8080 → 80
- **Status**: Running
- **Backend Proxy**: ✅ Configured to PHP-FPM on port 9000
- **Test URL**: http://localhost:8080 (returns 404 - expected)

### ✅ Frontend (React + Vite)
- **Container**: `bank_frontend`
- **Image**: `bank-frontend` (custom, Node 22 Alpine)
- **Port**: 3000 → 3000
- **Status**: Running
- **Dev Server**: Vite 7.3.1
- **Hot Reload**: Enabled
- **Volume**: `./frontend:/app` (development mode)
- **Test URL**: http://localhost:3000

## Quick Commands

```bash
# View all container status
docker compose ps

# View logs
docker compose logs -f                    # All services
docker compose logs -f php                # Backend only
docker compose logs -f frontend           # Frontend only
docker compose logs -f db                 # Database only

# Access containers
docker compose exec php sh                # PHP container
docker compose exec frontend sh           # Frontend container
docker compose exec db psql -U bank_user -d bank_app  # Database

# Restart services
docker compose restart                    # All services
docker compose restart php                # Specific service

# Stop services
docker compose down                       # Stop, keep volumes
docker compose down -v                    # Stop, remove volumes

# Rebuild and restart
docker compose build                      # Rebuild images
docker compose up -d                      # Start in background
```

## Verification Checklist

- [x] Database container running and healthy
- [x] PHP container running
- [x] Nginx container running and proxying to PHP
- [x] Frontend container running with Vite dev server
- [x] Backend responding to HTTP requests (404 expected)
- [x] Frontend Vite server accessible
- [x] All dependencies installed (backend and frontend)
- [x] Volume mounts working for development
- [x] Network connectivity between containers

## Container Details

### PHP Container
```
PHP Version: 8.5.3
FPM: Yes
Extensions: pdo, pdo_pgsql, zip
Composer: Latest
Working Directory: /var/www/html
```

### Frontend Container
```
Node Version: 22.x
Package Manager: npm
Build Tool: Vite 7.3.1
Dev Server: Running on 0.0.0.0:3000
```

### Database Container
```
PostgreSQL Version: 16.11
Database: bank_app
User: bank_user
Port: 5432
Volume: bank_db_data
```

## Network Configuration

**Network Name**: `bank_bank_network`  
**Driver**: bridge

All containers are on the same network and can communicate:
- PHP → DB (hostname: `db`)
- Nginx → PHP (hostname: `php`)
- Frontend → Nginx (via host: `http://localhost:8080`)

## Known Limitations

1. **Xdebug Not Installed**: Removed from Docker build for speed. Can be installed later in running container if needed.
2. **Opcache Not Enabled**: Not needed for development. Can be enabled in production build.
3. **No SSL/TLS**: Development setup uses HTTP. HTTPS should be configured for production.

## Troubleshooting

### Frontend Container Exits
```bash
docker compose logs frontend
# Usually npm install issues - check package.json syntax
```

### Backend 502 Error
```bash
docker compose logs php
# Check if PHP-FPM is running
docker compose exec php php -v
```

### Database Connection Refused
```bash
docker compose logs db
# Check if database is healthy
docker compose exec db psql -U bank_user -d bank_app -c "SELECT 1;"
```

### Port Already in Use
```bash
# Change ports in .env file:
BACKEND_PORT=8081
FRONTEND_PORT=3001
POSTGRES_PORT=5433
```

## Next Steps

With all services running, you can now proceed with Phase 2 implementation:
- Run database migrations: `docker compose exec php bin/console doctrine:migrations:migrate`
- Create entities and API resources
- Implement authentication
- Build frontend components

---

**All systems operational!** 🚀

