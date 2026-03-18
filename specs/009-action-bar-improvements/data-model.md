# Data Model: Action Bar Improvements & Advanced Filtering

## Entities

### Transfer
- **id**: UUID
- **amount**: decimal(10,2)
- **date**: datetime
- **reference**: string
- **csvSource**: string
- **fromAccount**: BankAccount (many-to-one)
- **toAccount**: BankAccount (many-to-one)
- **labels**: Label[] (many-to-many via LabelTransferLink)
- **parentTransfer**: Transfer (nullable, for refunds)
- **childRefunds**: Transfer[] (inverse, for refunds)

#### Validation & State
- Amount must be nonzero
- Date must be valid and not in the future
- parentTransfer must be in the same account (unless clarified otherwise)
- Deleting a parent with children: must orphan children or remove link

### Label
- **id**: UUID
- **name**: string
- **color**: string
- **parentLabel**: Label (nullable)
- **childLabels**: Label[]
- **linkedBankAccounts**: BankAccount[] (many-to-many)
- **linkedRegexes**: string[]

### BankAccount
- **id**: UUID
- **accountName**: string
- **accountNumber**: string
- **hash**: string
- **isInternal**: boolean
- **totalBalance**: decimal(15,2)
- **linkedLabels**: Label[] (many-to-many)
- **outgoingTransfers**: Transfer[]
- **incomingTransfers**: Transfer[]

### GroupByResult (virtual, API only)
- **period**: string (e.g., '2026-03', 'Q1-2026')
- **label**: Label | null
- **totalAmount**: decimal
- **transferCount**: int

## Relationships
- Transfer:Label is many-to-many via LabelTransferLink
- Transfer:Transfer (refunds) is parent-child (self-referencing, nullable)
- Label:Label is parent-child (nullable)
- BankAccount:Label is many-to-many

## State Transitions
- Transfer can be marked as refund (parent set)
- Refund link can be removed (parent set to null)
- Bulk actions: apply/remove label, mark as refund

## Notes
- All filtering, grouping, and bulk actions must be supported efficiently in the data model and API.
- Orphaned refunds must be handled gracefully in both data and UI.

