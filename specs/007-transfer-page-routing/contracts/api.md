# API Contract: Transfer Page Routing (Feature 007)

## Account Detail Endpoint
- **GET /api/accounts/{id}**
  - Returns: BankAccount (id, name, labels, transactions)
  - Errors: 404 (not found), 403 (unauthorized)

## Transaction Detail Endpoint
- **GET /api/transactions/{id}**
  - Returns: Transaction (id, amount, date, bankAccount, labels)
  - Errors: 404, 403

## Label Update Endpoint
- **PATCH /api/labels/{id}**
  - Body: { name: string, linkedAccounts: UUID[] }
  - Effect: Updates label and triggers async update for all related transactions
  - Returns: Updated Label
  - Errors: 400 (validation), 404, 403

## CSV Import Endpoint
- **POST /api/import/csv**
  - Body: multipart/form-data (file)
  - Returns: Import result (success, errors, deduplication info)
  - Errors: 400 (malformed), 409 (duplicate), 413 (too large)

## Error Response Format
- { code: int, message: string, details?: object }

## Notes
- All endpoints require authentication
- All error messages must be user-friendly and actionable

