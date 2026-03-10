# Data Model: Add List Pages

## Entities

### Bank Account
- **Fields**:
  - `id`: string | number
  - `name`: string
  - `accountNumber`: string
  - `balance`: number
- **Relationships**:
  - None for list page (linked transfers/labels out of scope)
- **Validation**:
  - All fields required for display

### Label
- **Fields**:
  - `id`: string | number
  - `name`: string
- **Relationships**:
  - None for list page (parent/child, linked accounts out of scope)
- **Validation**:
  - All fields required for display

## State Transitions
- N/A (list pages only, no editing or interaction)

## Reference
- See csv import transfers spec for provenance and entity creation.

