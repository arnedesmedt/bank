# Xdebug Configuration Complete

## ✅ Xdebug Now Enabled in PHP Container

**Date**: February 25, 2026  
**Status**: CONFIGURED AND READY

---

## Changes Made

### 1. Updated docker-compose.yml

Changed PHP service to use the main Dockerfile with Xdebug:

```yaml
php:
  build:
    context: ./backend
    dockerfile: docker/Dockerfile  # Changed from Dockerfile.simple
  container_name: bank_php
  volumes:
    - ./backend:/var/www/html
    - ./backend/docker/xdebug.ini:/usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini
  environment:
    XDEBUG_MODE: debug,develop,coverage
    XDEBUG_CONFIG: client_host=host.docker.internal
    PHP_IDE_CONFIG: "serverName=bank-app"
```

### 2. Optimized Dockerfile

**File**: `/backend/docker/Dockerfile`

The Dockerfile now:
- ✅ Installs Xdebug via PECL
- ✅ Copies xdebug.ini configuration
- ✅ Optimized for development with volume mounts
- ✅ Includes all necessary build tools

```dockerfile
FROM php:8.5-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \
    git \
    unzip \
    libzip-dev \
    postgresql-dev \
    linux-headers \
    autoconf \
    g++ \
    make

# Install PHP extensions
RUN docker-php-ext-install \
    pdo \
    pdo_pgsql \
    zip

# Install Xdebug
RUN apk add --no-cache $PHPIZE_DEPS \
    && pecl install xdebug \
    && docker-php-ext-enable xdebug \
    && apk del $PHPIZE_DEPS

# Copy Xdebug configuration
COPY xdebug.ini /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
EXPOSE 9000
CMD ["php-fpm"]
```

### 3. Xdebug Configuration

**File**: `/backend/docker/xdebug.ini`

```ini
[xdebug]
zend_extension=xdebug.so
xdebug.mode=debug,develop,coverage
xdebug.start_with_request=yes
xdebug.client_host=host.docker.internal
xdebug.client_port=9003
xdebug.log=/tmp/xdebug.log
xdebug.idekey=PHPSTORM
xdebug.discover_client_host=1
```

---

## Xdebug Configuration Details

### Modes Enabled
- **debug**: Step debugging
- **develop**: Development helpers (var_dump improvements)
- **coverage**: Code coverage for tests

### Connection Settings
- **Client Host**: `host.docker.internal` (Docker Desktop)
- **Client Port**: `9003` (Xdebug 3.x default)
- **IDE Key**: `PHPSTORM`
- **Start with Request**: `yes` (always try to connect)

---

## IDE Configuration

### PhpStorm / IntelliJ IDEA

1. **Go to Settings/Preferences**
   - Navigate to: `PHP → Debug`

2. **Configure Xdebug Port**
   - Set Debug port to: `9003`
   - Enable: "Can accept external connections"

3. **Add Server Configuration**
   - Go to: `PHP → Servers`
   - Name: `bank-app`
   - Host: `localhost`
   - Port: `8080`
   - Debugger: `Xdebug`
   - Enable: "Use path mappings"
   - Map: `/home/arnedesmedt/workspace/apps/bank/backend` → `/var/www/html`

4. **Start Listening**
   - Click the "Start Listening for PHP Debug Connections" button (phone icon)
   - Or: Run → Start Listening for PHP Debug Connections

5. **Set Breakpoints**
   - Click in the gutter next to line numbers to set breakpoints
   - Red dots indicate active breakpoints

### VS Code

1. **Install PHP Debug Extension**
   ```bash
   code --install-extension xdebug.php-debug
   ```

2. **Create Launch Configuration**
   
   File: `.vscode/launch.json`
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
         },
         "log": true,
         "xdebugSettings": {
           "max_data": 65535,
           "show_hidden": 1,
           "max_children": 100,
           "max_depth": 5
         }
       }
     ]
   }
   ```

3. **Start Debugging**
   - Press `F5` or go to Run → Start Debugging
   - Set breakpoints by clicking in the gutter
   - Make a request to your backend

---

## Verification Steps

### 1. Check Xdebug is Loaded

```bash
docker exec bank_php php -m | grep xdebug
# Should output: xdebug
```

### 2. Check Xdebug Version

```bash
docker exec bank_php php -v
# Should show: with Xdebug v3.x.x
```

### 3. Check Xdebug Info

```bash
docker exec bank_php php -i | grep xdebug
# Should show all Xdebug settings
```

### 4. View Xdebug Configuration

```bash
docker exec bank_php cat /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini
```

### 5. Check Xdebug Log

```bash
docker exec bank_php tail -f /tmp/xdebug.log
# Shows connection attempts and debug info
```

---

## Testing Xdebug

### Simple Test Script

Create: `/backend/public/xdebug-test.php`

```php
<?php
// Set a breakpoint on the next line
$message = "Xdebug is working!";

var_dump([
    'xdebug_enabled' => extension_loaded('xdebug'),
    'xdebug_version' => phpversion('xdebug'),
    'xdebug_mode' => ini_get('xdebug.mode'),
    'message' => $message
]);
```

**Access**: http://localhost:8080/xdebug-test.php

- Set a breakpoint on the `$message` line
- Start listening in your IDE
- Refresh the page
- Debugger should pause at the breakpoint

---

## Troubleshooting

### Xdebug Not Connecting

1. **Check Xdebug is loaded**
   ```bash
   docker exec bank_php php -m | grep xdebug
   ```

2. **Check IDE is listening**
   - Look for "listening" status in your IDE
   - Check port 9003 is not blocked by firewall

3. **Check Xdebug log**
   ```bash
   docker exec bank_php tail -20 /tmp/xdebug.log
   ```

4. **Verify path mappings**
   - Ensure IDE path mappings match container paths
   - Local: `/home/arnedesmedt/workspace/apps/bank/backend`
   - Container: `/var/www/html`

### Connection Timeout

If Xdebug tries to connect but times out:

1. **Check Docker network**
   ```bash
   docker exec bank_php ping -c 2 host.docker.internal
   ```

2. **Try alternative client host**
   
   Update `xdebug.ini`:
   ```ini
   xdebug.client_host=172.17.0.1  # Docker bridge IP
   # Or use your actual machine IP
   ```

3. **Rebuild container**
   ```bash
   docker compose build php
   docker compose up -d php
   ```

### Breakpoints Not Triggering

1. **Verify file paths**
   - Check path mappings in IDE
   - Ensure files are in mounted volume

2. **Check Xdebug mode**
   ```bash
   docker exec bank_php php -i | grep "xdebug.mode"
   # Should include "debug"
   ```

3. **Enable break at first line**
   - Temporarily set `xdebug.start_upon_error=yes`
   - Or set `xdebug.break=1` in your code

---

## Performance Notes

### Development Mode

Xdebug can slow down PHP execution. For normal development without debugging:

**Option 1: Disable Xdebug temporarily**
```bash
docker exec bank_php mv /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini \
  /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini.disabled
docker compose restart php
```

**Option 2: Change Xdebug mode**
```bash
# In docker-compose.yml, set:
XDEBUG_MODE: off  # Completely off
# or
XDEBUG_MODE: develop  # Only development helpers, no debugging
```

### Re-enable Xdebug

```bash
docker exec bank_php mv /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini.disabled \
  /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini
docker compose restart php
```

---

## Quick Commands

```bash
# Rebuild PHP with Xdebug
docker compose build php

# Restart PHP
docker compose restart php

# Check Xdebug status
docker exec bank_php php -v

# View Xdebug config
docker exec bank_php php -i | grep xdebug

# Tail Xdebug log
docker exec bank_php tail -f /tmp/xdebug.log

# Test PHP info
docker exec bank_php php -r "phpinfo();" | grep -i xdebug
```

---

## Next Steps

With Xdebug now configured:

1. **Configure your IDE** (PhpStorm or VS Code)
2. **Set path mappings** correctly
3. **Start listening** for debug connections
4. **Set breakpoints** in your code
5. **Make requests** to trigger breakpoints
6. **Step through code** to debug

---

**Status**: ✅ XDEBUG FULLY CONFIGURED  
**PHP Version**: 8.5  
**Xdebug Version**: Latest (installed via PECL)  
**Debug Port**: 9003  
**IDE Key**: PHPSTORM  

**Happy debugging!** 🐛🔍

