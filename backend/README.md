# Bank Application — Backend

Symfony 8 REST API backend for the bank application, using API Platform and Doctrine ORM.

## Tech Stack

- **PHP 8.5** + **Symfony 8**
- **API Platform 3** — REST API with `application/json`
- **Doctrine ORM** — PostgreSQL persistence
- **League OAuth2 Server** — Password grant authentication
- **Zenstruck Foundry** — Test fixtures
- **GrumPHP** — Pre-commit linting (PHPStan, PHPCS, PHPMD, Rector)

## API Endpoints

All endpoints require a Bearer token obtained from `POST /token`.

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/token` | Obtain OAuth2 access token (password grant) |
| `GET` | `/me` | Return the currently authenticated user |

### Bank Accounts

Bank accounts are created automatically when a CSV file is imported.
They represent the own account and counterparty accounts seen in the transfers.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/bank-accounts` | List all bank accounts for the authenticated user |
| `GET` | `/api/bank-accounts/{id}` | Get a single bank account |
| `POST` | `/api/bank-accounts` | Create a bank account |
| `PUT` | `/api/bank-accounts/{id}` | Update a bank account |
| `DELETE` | `/api/bank-accounts/{id}` | Delete a bank account |

### Labels

Labels categorise transfers. They support a parent-child hierarchy and can be linked
to bank accounts or regex patterns for automatic assignment during CSV import.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/labels` | List all labels for the authenticated user |
| `GET` | `/api/labels/{id}` | Get a single label |
| `POST` | `/api/labels` | Create a label |
| `PUT` | `/api/labels/{id}` | Update a label (triggers auto-labelling recalculation) |
| `DELETE` | `/api/labels/{id}` | Delete a label |

### Transfers

Transfers are imported from CSV files exported by supported banks (currently: Belfius).
Importing is idempotent — already-imported transfers are skipped based on fingerprint/transaction ID.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/transfers` | List transfers (paginated) for the authenticated user |
| `GET` | `/api/transfers/{id}` | Get a single transfer |
| `POST` | `/api/transfers/import` | Import a CSV file (`multipart/form-data`: `file`, `bankType`) |
| `POST` | `/api/transfers/{id}/labels/{labelId}` | Add a label to a transfer |
| `DELETE` | `/api/transfers/{id}/labels/{labelId}` | Remove a label from a transfer |
| `PATCH` | `/api/transfers/bulk` | Bulk action on selected transfers (`apply_label`, `remove_label`, `mark_refund`) |

#### Bulk Actions

`PATCH /api/transfers/bulk` accepts a JSON body:

```json
{
  "action": "mark_refund",
  "transferIds": ["uuid-of-refund-1", "uuid-of-refund-2"],
  "parentTransferId": "uuid-of-parent"
}
```

| Action | Required fields | Description |
|--------|----------------|-------------|
| `apply_label` | `labelId` | Apply a label to all selected transfers |
| `remove_label` | `labelId` | Remove a label from all selected transfers |
| `mark_refund` | `parentTransferId` | Link selected transfers as refunds of the parent transfer. The parent's `amount` is recalculated (original amount − sum of refunds) and `amount_before_refund` is saved for auditability. |

#### Refund Linking

When a transfer is linked as a refund child of a parent:

- The first link snapshot the parent's current `amount` in `amount_before_refund` for auditability.
- The parent's `amount` is recalculated as `amount_before_refund − Σ(child amounts)` after every link operation.
- Validation prevents self-linking and re-linking already-linked children.
- All operations are logged at `info`/`warning` level.

## Architecture

```
src/
├── ApiResource/      # API Platform DTOs (input/output)
├── Entity/           # Doctrine ORM entities
├── Repository/       # Doctrine repositories
├── Service/          # Business logic
│   ├── CsvImportService.php     # CSV parsing & transfer persistence
│   ├── LabelingService.php      # Auto-labelling transfers
│   ├── LabelService.php         # Label hierarchy management
│   └── EntityMapper.php         # DTO ↔ Entity mapping
├── State/            # API Platform state providers & processors
└── EventListener/    # Kernel event listeners
```

## CSV Import

The primary data input is via CSV files from supported banks.
See `specs/001-csv-import-transfers` for the full feature specification.

- Upload a CSV via `POST /api/transfers/import` with `bankType=belfius`
- The service parses each row, creates/reuses bank account records, and persists each transfer
- Idempotency: duplicates are detected by fingerprint (date + amount + accounts + reference)
- After import, auto-labelling is applied based on linked bank accounts and regex patterns

## Getting Started

```bash
# Start all services via Docker Compose (from project root)
docker compose up -d

# Run database migrations
docker compose exec php php bin/console doctrine:migrations:migrate

# Load development fixtures
docker compose exec php php bin/console doctrine:fixtures:load

# Run tests
docker compose exec php vendor/bin/phpunit

# Run linter (GrumPHP)
docker compose exec php vendor/bin/grumphp run
```

## Environment Variables

Key variables in `.env` / `.env.local`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL DSN |
| `JWT_SECRET_KEY` | Path to OAuth2 private key |
| `JWT_PUBLIC_KEY` | Path to OAuth2 public key |
| `CORS_ALLOW_ORIGIN` | Allowed origins for CORS |

## Tests

Integration tests use API Platform's test client with Zenstruck Foundry for fixtures.
Each test class resets the database via the `ResetDatabase` trait.

```bash
docker compose exec php vendor/bin/phpunit
```

