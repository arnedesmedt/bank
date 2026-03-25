# Data Model: Refund Linking Improvements

## Entity: Transfer
- **id**: UUID (primary key)
- **amount**: decimal(10,2) — current amount (after refunds)
- **amount_before_refund**: decimal(10,2) — original amount (before refunds)
- **date**: datetime
- **fromAccount**: BankAccount (many-to-one)
- **toAccount**: BankAccount (many-to-one)
- **reference**: string
- **csvSource**: string
- **transactionId**: string|null
- **fingerprint**: string
- **isInternal**: boolean
- **isReversed**: boolean
- **parentTransfer**: Transfer|null (many-to-one, for refunds)
- **childRefunds**: Transfer[] (one-to-many, refunds linked to this transfer)

## Relationships
- **Refunds**: A transfer can have many child refunds (other transfers), and a refund can have one parent transfer.
- **amount_before_refund**: Set to the original amount on creation/import. Not updated by refund actions.
- **amount**: Updated to `amount_before_refund - sum(childRefunds.amount)` whenever refunds are linked/unlinked.

## Validation Rules
- Cannot link a refund if it is already linked to another parent.
- Cannot link refunds if sum(refunds) > amount_before_refund.
- Cannot link a transfer as a refund to itself.
- Orphaned refunds (parent deleted) are allowed and shown as unlinked.

## State Transitions
- **Link refund**: Set `parentTransfer` on refund, update parent `amount`.
- **Unlink refund**: Set `parentTransfer` to null, update parent `amount`.
- **Delete parent**: Set `parentTransfer` to null for all children.

## Migration
- Add `amount_before_refund` column to `transfers` table, default to current `amount` for all existing records.
- No destructive changes to existing parent/child links.

---

This data model supports all requirements and edge cases from the feature spec.

