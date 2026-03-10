# data-model.md

## Entities

### BankAccount (Doctrine Entity)
- account_name: string
- account_number: string (unique)
- linked_labels: [Label] (many-to-many)

### Transfer (Doctrine Entity)
- amount: decimal
- date: date
- from_account: BankAccount (many-to-one)
- to_account: BankAccount (many-to-one)
- labels: [Label] (many-to-many)
- reference: string
- csv_source: string (file name or upload id)
- transaction_id: string (nullable, unique if present)
- fingerprint: string (composite: date+amount+from+to+reference)

### Label (Doctrine Entity)
- name: string
- parent_label: Label (nullable, one-to-many)
- linked_bank_accounts: [BankAccount] (many-to-many)
- linked_regexes: [string]
- max_value: decimal (optional)
- max_percentage: decimal (optional)

---

## DTOs (ApiResource)

### TransferImportDTO
- date: date
- amount: decimal
- currency: string
- from_account: string (account number)
- to_account: string (account number)
- reference: string
- transaction_id: string (nullable)

### TransferOutputDTO
- id: string
- date: date
- amount: decimal
- currency: string
- from_account: string (account number)
- to_account: string (account number)
- reference: string
- labels: [string] (label names)
- transaction_id: string (nullable)

---

## Relationships
- Transfer <-> BankAccount: from_account, to_account
- Transfer <-> Label: many-to-many
- Label <-> Label: parent_label (hierarchy)
- Label <-> BankAccount: many-to-many

## Validation Rules
- Transfers must be unique by transaction_id (if present) or fingerprint.
- Internal transfers (from and to both user-owned) are persisted but excluded from statistics/labeling.

## State Transitions
- TransferImportDTO -> Transfer (via DataTransformer)
- Transfer -> TransferOutputDTO (via DataTransformer)

---

Entities and DTOs are now separated. Mapping is handled by Symfony's object mapper/DataTransformer. API Platform exposes DTOs as resources; entities are internal.
