#!/usr/bin/env bash
set -euo pipefail

export PGDATA=/data/postgresql

echo "[bank] Starting Bank add-on initialization..."

# ── Read Home Assistant add-on options ────────────────────────────────────
OPTIONS_FILE=/data/options.json

APP_SECRET=""
OAUTH_PASSPHRASE=""
DB_PASSWORD="bankpassword"

if [ -f "$OPTIONS_FILE" ]; then
    APP_SECRET=$(jq -r '.app_secret // empty' "$OPTIONS_FILE" 2>/dev/null || echo "")
    OAUTH_PASSPHRASE=$(jq -r '.oauth_passphrase // empty' "$OPTIONS_FILE" 2>/dev/null || echo "")
    DB_PASSWORD=$(jq -r '.db_password // "bankpassword"' "$OPTIONS_FILE" 2>/dev/null || echo "bankpassword")
fi

# ── Generate and persist APP_SECRET if not provided ───────────────────────
if [ -z "$APP_SECRET" ]; then
    if [ ! -f /data/app_secret ]; then
        echo "[bank] Generating APP_SECRET..."
        openssl rand -hex 32 > /data/app_secret
    fi
    APP_SECRET=$(cat /data/app_secret)
fi

# ── Generate and persist OAUTH_PASSPHRASE if not provided ─────────────────
if [ -z "$OAUTH_PASSPHRASE" ]; then
    if [ ! -f /data/oauth_passphrase ]; then
        echo "[bank] Generating OAUTH_PASSPHRASE..."
        openssl rand -hex 32 > /data/oauth_passphrase
    fi
    OAUTH_PASSPHRASE=$(cat /data/oauth_passphrase)
fi

# ── Generate and persist OAUTH_ENCRYPTION_KEY (must survive restarts) ─────
if [ ! -f /data/oauth_encryption_key ]; then
    echo "[bank] Generating OAUTH_ENCRYPTION_KEY..."
    openssl rand -hex 16 > /data/oauth_encryption_key
fi
OAUTH_ENCRYPTION_KEY=$(cat /data/oauth_encryption_key)

# ── Ensure PostgreSQL socket directory ────────────────────────────────────
mkdir -p /run/postgresql
chown postgres:postgres /run/postgresql

# ── Initialize PostgreSQL data directory (first boot only) ────────────────
if [ ! -f "$PGDATA/PG_VERSION" ]; then
    echo "[bank] Initializing PostgreSQL data directory..."
    mkdir -p "$PGDATA"
    chown postgres:postgres "$PGDATA"
    chmod 700 "$PGDATA"
    su-exec postgres initdb -D "$PGDATA" --auth-host=md5 --auth-local=trust -U postgres

    # Listen only on loopback
    cat >> "$PGDATA/postgresql.conf" << PGCONF
listen_addresses = '127.0.0.1'
port = 5432
log_destination = 'stderr'
logging_collector = off
PGCONF

    cat > "$PGDATA/pg_hba.conf" << PGHBA
local   all   postgres                  trust
local   all   all                       trust
host    all   all   127.0.0.1/32        md5
host    all   all   ::1/128             md5
PGHBA
fi

# ── Start PostgreSQL temporarily for initial DB / user setup ──────────────
echo "[bank] Starting PostgreSQL for initial setup..."
su-exec postgres pg_ctl -D "$PGDATA" -l /tmp/pg-init.log start -w -t 30

# ── Create DB role and database (idempotent) ──────────────────────────────
if ! su-exec postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='bank_user'" | grep -q 1; then
    echo "[bank] Creating database user 'bank_user'..."
    su-exec postgres psql -c "CREATE ROLE bank_user WITH LOGIN PASSWORD '${DB_PASSWORD}';"
fi

if ! su-exec postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='bank_app'" | grep -q 1; then
    echo "[bank] Creating database 'bank_app'..."
    su-exec postgres createdb -O bank_user bank_app
fi

# ── Stop temporary PostgreSQL (supervisord will manage the real instance) ─
echo "[bank] Stopping temporary PostgreSQL..."
su-exec postgres pg_ctl -D "$PGDATA" stop -m fast -w

# ── Generate JWT RSA keys (first boot only) ───────────────────────────────
if [ ! -f /data/jwt/private.pem ]; then
    echo "[bank] Generating JWT RSA keys (this may take a moment)..."
    mkdir -p /data/jwt
    openssl genrsa -passout "pass:${OAUTH_PASSPHRASE}" -out /data/jwt/private.pem 4096
    openssl rsa -passin "pass:${OAUTH_PASSPHRASE}" -in /data/jwt/private.pem -pubout -out /data/jwt/public.pem
    chmod 600 /data/jwt/private.pem
fi
chown -R www-data:www-data /data/jwt

# ── Write Symfony environment configuration ───────────────────────────────
echo "[bank] Writing backend configuration..."
cat > /var/www/html/.env.local << EOF
APP_ENV=prod
APP_SECRET=${APP_SECRET}
DATABASE_URL=postgresql://bank_user:${DB_PASSWORD}@127.0.0.1:5432/bank_app?serverVersion=16&charset=utf8
OAUTH_PRIVATE_KEY=/data/jwt/private.pem
OAUTH_PUBLIC_KEY=/data/jwt/public.pem
OAUTH_PASSPHRASE=${OAUTH_PASSPHRASE}
OAUTH_ENCRYPTION_KEY=${OAUTH_ENCRYPTION_KEY}
CORS_ALLOW_ORIGIN='^.*$'
MESSENGER_TRANSPORT_DSN=doctrine://default?auto_setup=0
EOF
chown www-data:www-data /var/www/html/.env.local

# ── Clear Symfony cache (no warmup; will build on first request) ──────────
echo "[bank] Clearing Symfony cache..."
su-exec www-data php /var/www/html/bin/console cache:clear \
    --env=prod --no-debug --no-warmup 2>/dev/null || true

# ── Create share directory for import files ───────────────────────────────
mkdir -p /share/bank

echo "[bank] Initialization complete. Starting services..."

# ── Hand off to supervisord as PID 1 ─────────────────────────────────────
exec /usr/bin/supervisord -c /etc/supervisord.conf
