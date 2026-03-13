# Account API Contract

## Endpoints

### POST /accounts
- Create/import a bank account
- Request: { name, number }
- Response: { id, name, number, hash, internal, total_balance }

### GET /accounts
- List all bank accounts
- Response: [{ id, name, number, hash, internal, total_balance }]

### GET /accounts/{id}
- Get account details
- Response: { id, name, number, hash, internal, total_balance }

### GET /accounts/{id}/transfers
- List transfers for account
- Response: [{ id, from_account, to_account, amount, datetime }]

## Notes
- Owner property is not present in any response
- Account number is normalized
- Internal flag is set for own accounts
- Total balance is calculated and returned

