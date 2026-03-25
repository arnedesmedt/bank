# Contract: Refund Linking API

## PATCH /api/transfers/bulk
- **Description**: Perform bulk actions on transfers (apply/remove label, mark/remove refund).
- **Request Body** (application/merge-patch+json):
  - `action`: 'apply_label' | 'remove_label' | 'mark_refund' | 'remove_refund'
  - `transferIds`: string[]
  - `labelId?`: string (for label actions)
  - `parentTransferId?`: string (for mark_refund)
- **Response**: Array of updated Transfer objects
- **Validation**:
  - For 'mark_refund':
    - Each transfer must not already be linked to a parent
    - Cannot link to self
    - Sum of refund amounts must not exceed parent's `amount_before_refund`
  - For 'remove_refund':
    - Unlinks refund(s) from parent

## Transfer Resource (API Platform)
- **Fields**:
  - `id`: string
  - `amount`: string
  - `amount_before_refund`: string
  - `parentTransferId`: string|null
  - `childRefunds`: Transfer[]

## UI Contract
- **Action Panel**: "Link Refunds" button opens modal/side panel to select eligible refunds
- **Accordion UI**: Parent transfer row expands to show child refunds
- **Edge Cases**: Orphaned refunds shown as unlinked; invalid actions blocked in UI

---

This contract documents the API and UI interfaces for refund linking improvements.

