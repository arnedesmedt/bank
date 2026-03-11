# Contract: Bank Accounts List Page

## Interface
- **Route**: `/bank-accounts`
- **Method**: GET (page load)
- **API Endpoint**: `/api/bank-accounts` (GET)
- **Response Shape**:
  ```json
  [
    { "id": 1, "name": "Main Account", "accountNumber": "BE123456789", "balance": 1000.00 },
    ...
  ]
  ```
- **UI Contract**:
  - Display each account as a row: name, account number, balance
  - Show "No bank accounts found" if empty
  - Show "Failed to load data" if error

## Reference
- See csv import transfers for provenance

