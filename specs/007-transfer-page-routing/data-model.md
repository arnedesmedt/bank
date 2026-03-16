# Data Model for 007-transfer-page-routing

## Entities

### BankAccount
- id: UUID
- name: string
- labels: Label[]

### Transaction
- id: UUID
- amount: number
- date: Date
- bankAccount: BankAccount
- labels: Label[]

### Label
- id: UUID
- name: string
- bankAccounts: BankAccount[]
- transactions: Transaction[]

## Relationships
- BankAccount has many Transactions
- BankAccount has many Labels
- Transaction belongs to one BankAccount
- Transaction has many Labels
- Label can be linked to many BankAccounts and Transactions

## Validation Rules
- BankAccount and Transaction IDs must be valid UUIDs
- Amount must be a valid number (non-null)
- Date must be a valid ISO date
- Labels must exist in the system

## State Transitions
- When a Label is added/updated/removed on a BankAccount, all related Transactions must update their labels accordingly (within 1 minute)
- When a Transaction is imported, deduplicate by file and transaction ID

