# Data Model: Sidebar Layout & Bank Account Management Improvements

## Entities

### Sidebar
- **Attributes**: expanded (bool), collapsed (bool), list of pages (array), icons (array), responsive (bool)
- **Relationships**: N/A (UI only)

### Top Bar
- **Attributes**: backButton (bool), pageTitle (string), quickActions (array: search, user menu)
- **Relationships**: N/A (UI only)

### BankAccount
- **Attributes**:
  - id: string (UUID)
  - accountName: string | null
  - accountNumber: string | null
  - isInternal: bool
  - totalBalance: string
  - linkedLabelIds: string[]
- **Relationships**:
  - labels: Label[] (many-to-many)
  - transfers: Transfer[] (one-to-many, incoming/outgoing)
- **Validation**:
  - accountName: required for add/edit, max length 255
  - accountNumber: optional, must be unique if present

### Transfer
- **Attributes**:
  - id: string (UUID)
  - amount: string
  - date: string (ISO)
  - fromAccountNumber: string | null
  - fromAccountName: string | null
  - toAccountNumber: string | null
  - toAccountName: string | null
  - reference: string
  - isInternal: bool
  - labelIds: string[]
  - labelLinks: {id: string, name: string, isManual: bool}[]
- **Relationships**:
  - fromAccount: BankAccount
  - toAccount: BankAccount
  - labels: Label[] (many-to-many via LabelTransferLink)
- **Validation**:
  - amount: required, numeric
  - date: required, ISO format

### Label
- **Attributes**:
  - id: string (UUID)
  - name: string
  - parentLabelId: string | null
  - linkedBankAccountIds: string[]
- **Relationships**:
  - parentLabel: Label | null
  - childLabels: Label[]
  - linkedBankAccounts: BankAccount[]
  - transfers: Transfer[] (via LabelTransferLink)
- **Validation**:
  - name: required, unique

### LabelTransferLink
- **Attributes**:
  - id: string (UUID)
  - labelId: string
  - transferId: string
  - isManual: bool
- **Relationships**:
  - label: Label
  - transfer: Transfer

## State Transitions

- **Sidebar**: expanded <-> collapsed (toggle via hamburger/menu)
- **BankAccount**: add -> (edit | delete) -> list updates; edit/delete errors show message, do not apply changes
- **Label-Transfer Sync**: when a bank account is unlinked from a label, all related transfers update their labels accordingly (automatic, atomic)

## Edge Cases
- Sidebar collapsed on small screens: icons remain visible, navigation possible
- No linked bank accounts: show empty state with add option
- Transfer with multiple labels: only removed label is unlinked
- Edit/delete failure: show error, do not apply changes
- Add with invalid data: show validation errors

