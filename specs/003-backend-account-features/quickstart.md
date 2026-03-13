# Quickstart: Backend Account Features

## Setup
1. Checkout branch `003-backend-account-features`
2. Run database migrations
3. Import/create bank accounts via API

## Usage
- Create/import accounts with name and number; system calculates hash, normalizes number, sets internal flag
- Process transfers; system filters reversed internal transfers, updates balances
- Owner properties are removed from all entities

## Testing
- Run PHPUnit tests for account creation, transfer filtering, balance calculation, and owner property removal

## Migration
- Run migration scripts to update schema and remove owner properties
- Migration is reversible

