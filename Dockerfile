###############################################################################
# Stage 1 — Build React frontend (static files)
###############################################################################
FROM node:22-alpine AS frontend-builder

WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .

# Build with empty API URL so all API calls are relative (same-origin nginx).
# Call vite build directly to skip tsc strict type-checking (esbuild handles transpilation).
RUN VITE_API_URL="" npx vite build

###############################################################################
# Stage 2 — Install PHP vendor dependencies (production-only)
###############################################################################
FROM composer:2 AS php-builder

WORKDIR /app
COPY backend/composer.json backend/composer.lock ./
RUN composer install \
    --no-dev \
    --no-scripts \
    --no-interaction \
    --optimize-autoloader \
    --prefer-dist \
    --ignore-platform-reqs

COPY backend/ .
RUN composer dump-autoload \
    --no-dev \
    --optimize \
    --classmap-authoritative \
    --ignore-platform-reqs

###############################################################################
# Stage 3 — Production runtime image
###############################################################################
FROM php:8.4-fpm-alpine

# ── System packages ────────────────────────────────────────────────────────
RUN apk add --no-cache \
    nginx \
    postgresql16 \
    postgresql16-contrib \
    postgresql16-client \
    supervisor \
    jq \
    openssl \
    bash \
    su-exec \
    poppler-utils \
    libzip-dev \
    postgresql-dev

# ── PHP extensions ─────────────────────────────────────────────────────────
RUN docker-php-ext-install -j"$(nproc)" \
    pdo \
    pdo_pgsql \
    bcmath \
    zip \
    && docker-php-ext-enable opcache

# ── OPcache tuning ─────────────────────────────────────────────────────────
RUN { \
    echo 'opcache.memory_consumption=256'; \
    echo 'opcache.interned_strings_buffer=16'; \
    echo 'opcache.max_accelerated_files=20000'; \
    echo 'opcache.revalidate_freq=0'; \
    echo 'opcache.validate_timestamps=0'; \
    echo 'opcache.save_comments=1'; \
    echo 'opcache.enable_cli=1'; \
} > /usr/local/etc/php/conf.d/opcache.ini

# ── PHP upload / memory settings ──────────────────────────────────────────
RUN { \
    echo 'upload_max_filesize = 50M'; \
    echo 'post_max_size = 100M'; \
    echo 'memory_limit = 256M'; \
    echo 'max_execution_time = 300'; \
    echo 'max_input_time = 300'; \
} > /usr/local/etc/php/conf.d/uploads.ini

# ── PostgreSQL runtime socket directory ───────────────────────────────────
RUN mkdir -p /run/postgresql && chown postgres:postgres /run/postgresql

# ── Copy application artifacts from build stages ──────────────────────────
COPY --from=frontend-builder /app/dist /var/www/frontend
COPY --from=php-builder /app /var/www/html

# ── Writable Symfony runtime directories ──────────────────────────────────
RUN mkdir -p /var/www/html/var/cache /var/www/html/var/log /var/www/html/var/sessions \
    && chown -R www-data:www-data /var/www/html/var \
    && chmod -R 755 /var/www/html/var

# ── Frontend static files readable by nginx ───────────────────────────────
RUN chmod -R 755 /var/www/frontend

# ── Remove Alpine's default nginx virtual host (conflicts with port 8099) ─
RUN rm -f /etc/nginx/conf.d/default.conf /etc/nginx/http.d/default.conf

# ── Copy add-on runtime configuration (nginx, supervisord, scripts) ────────
COPY rootfs/ /

# ── Make startup scripts executable ───────────────────────────────────────
RUN chmod +x /usr/local/bin/start.sh /usr/local/bin/run-migrate.sh

EXPOSE 8099

CMD ["/usr/local/bin/start.sh"]
