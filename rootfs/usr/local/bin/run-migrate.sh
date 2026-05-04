#!/usr/bin/env bash
set -euo pipefail

echo "[bank] Waiting for PostgreSQL to accept connections..."
until pg_isready -h 127.0.0.1 -p 5432 -U bank_user -d bank_app >/dev/null 2>&1; do
    sleep 2
done

echo "[bank] Running database migrations..."
su-exec www-data php /var/www/html/bin/console \
    doctrine:migrations:migrate \
    --no-interaction \
    --allow-no-migration \
    --env=prod

echo "[bank] Migrations complete."
