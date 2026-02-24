# data-model.md

## Entities

### BankAccount
- account_name: string
- account_number: string (unique)
- linked_labels: [Label] (many-to-many)

### Transfer
- amount: decimal
- date: date
- from_account: BankAccount (many-to-one)
- to_account: BankAccount (many-to-one)
- labels: [Label] (many-to-many)
- reference: string
- csv_source: string (file name or upload id)
- transaction_id: string (nullable, unique if present)
- fingerprint: string (composite: date+amount+from+to+reference)

### Label
- name: string
- parent_label: Label (nullable, one-to-many)
- linked_bank_accounts: [BankAccount] (many-to-many)
- linked_regexes: [string]
- max_value: decimal (optional)
- max_percentage: decimal (optional)

## Relationships
- Transfer <-> BankAccount: from_account, to_account
- Transfer <-> Label: many-to-many
- Label <-> Label: parent_label (hierarchy)
- Label <-> BankAccount: many-to-many

## Validation Rules
- Transfers must be unique by transaction_id (if present) or fingerprint.
- Internal transfers (from and to both user-owned) are persisted but excluded from statistics/labeling.
- CSV files must match supported format (delimiter, encoding, date format).
- Labels auto-applied if regex or bank account matches.
- Parent label auto-linked if child label applied.

## State Transitions
- Transfer: imported -> labeled -> included/excluded from statistics
- Label: created -> linked -> max value/percentage set
- BankAccount: created -> linked to labels

