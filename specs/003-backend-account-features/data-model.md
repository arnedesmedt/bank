# Data Model: Backend Account Features

## Entities

### BankAccount
- uuid: UUID
- name: string | null
- number: string | null (normalized to 'BEXX XXXX XXXX XXXX')
- hash: string (base64encode(crc32), unique)|null => if name and number are null,
- internal: boolean
- total_balance: float

#### Validation Rules
- name and number can be null if missing/invalid
- hash is calculated from name and number (concatenated, nulls handled)
- number is normalized; if invalid, store null
- internal is true for first imported account
- total_balance is calculated from transfers

### Transfer
- uuid: UUID
- from_account: BankAccount
- to_account: BankAccount
- amount: float
- datetime: datetime

#### Validation Rules
- Filter reversed internal transfers (amount * -1, same datetime, switched accounts)
- Update total_balance for involved accounts

### Label
- uuid: UUID
- name: string

## Relationships
- BankAccount has many Transfers (as from/to)
- Transfer references two BankAccounts
- Label can be associated with BankAccount or Transfer (owner property removed)

## State Transitions
- On account creation/import: hash calculated, uniqueness enforced, number normalized, internal flag set
- On transfer processing: filter reversed internal transfers, update balances
- On migration: remove owner properties from entities

