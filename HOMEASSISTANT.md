# Home Assistant Add-on

This repository is a valid Home Assistant add-on repository. The application runs as a single Docker container containing:

- **PostgreSQL 16** — embedded database (data persisted to HA `/data` volume)
- **PHP 8.4-FPM** — Symfony backend API
- **nginx** — serves both the React frontend and the API on port 8099
- **Symfony Messenger worker** — processes async import jobs
- **supervisord** — manages all processes inside the container

The web interface is accessible directly from the Home Assistant sidebar via **Ingress** (no extra port needed).

---

## Installation

### Step 1 — Add the repository to Home Assistant

1. In Home Assistant, go to **Settings → Add-ons → Add-on Store**
2. Click the **⋮ menu** (top-right) → **Repositories**
3. Add this URL:
   ```
   https://github.com/<your-user>/bank
   ```
4. Click **Add**, then close the dialog

### Step 2 — Install the add-on

1. Find **Bank** in the add-on store (refresh the page if it doesn't appear)
2. Click **Install** — the first build takes several minutes as it compiles the frontend and installs PHP packages

### Step 3 — Configure secrets

Before starting, open the **Configuration** tab and set:

| Option | Description | Default |
|---|---|---|
| `app_secret` | Symfony app secret (leave empty to auto-generate) | auto |
| `oauth_passphrase` | JWT key passphrase (leave empty to auto-generate) | auto |
| `db_password` | Internal PostgreSQL password | `bankpassword` |

> **Important:** Change `db_password` before the first start. Once set, do not change it — the database will already be initialized with the original password.

### Step 4 — Start the add-on

Click **Start**. The first start performs:
1. PostgreSQL data directory initialization
2. JWT RSA key pair generation
3. Database user and schema creation
4. Symfony database migrations

This takes ~30 seconds on first boot. Subsequent starts are faster (~5 seconds).

### Step 5 — Open the interface

Click **Open Web UI** or find **Bank** in the Home Assistant sidebar.

---

## Data persistence

All persistent data is stored in HA's `/data/bank/` volume:

| Path | Contents |
|---|---|
| `/data/postgresql/` | PostgreSQL database files |
| `/data/jwt/` | RSA private/public key pair for JWT tokens |
| `/data/app_secret` | Auto-generated Symfony app secret |
| `/data/oauth_passphrase` | Auto-generated JWT passphrase |
| `/data/oauth_encryption_key` | OAuth token encryption key |

Import files are stored in `/share/bank/`.

---

## First-time setup

After opening the interface:
1. Register a user account on the login screen
2. Go to **Settings** to configure label rules
3. Import bank transactions via **Settings → Import**

---

## Building locally (development)

To build and test the add-on image locally before pushing to GitHub:

```bash
# From the project root
docker build -t bank-addon:local .

# Run locally (simulates HA add-on environment)
docker run -it --rm \
  -p 8099:8099 \
  -v $(pwd)/data:/data \
  -v $(pwd)/share:/share \
  bank-addon:local
```

Then open `http://localhost:8099`.

> **Note:** For day-to-day development, use `docker compose up` which mounts source files for hot reload. The `Dockerfile` at the root is the production HA add-on build only.

---

## Architecture

```
HA Ingress (port 443/80)
       │
       ▼
  nginx :8099
  ├── /api/*   → PHP-FPM :9000 (Symfony API Platform)
  ├── /token   → PHP-FPM :9000 (OAuth2 token endpoint)
  └── /*       → React SPA (static files from /var/www/frontend)
                      │
                      └── API calls use relative URLs (same origin)
```

All processes inside the container:

```
supervisord (PID 1)
├── postgresql   (priority 100) — PostgreSQL 16 server
├── migrate      (priority 200) — Runs doctrine:migrations on start, exits
├── php-fpm      (priority 300) — PHP 8.4-FPM worker pool
├── nginx        (priority 400) — Serves frontend + proxies API
└── worker       (priority 300) — Symfony Messenger async consumer
```
