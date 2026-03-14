# Contract: Sidebar & Navigation (Frontend)

## Sidebar Component
- **Props**: `expanded: boolean`, `onToggle: () => void`, `pages: Array<{id: string, label: string, icon: React.ReactNode}>`, `currentPage: string`, `onNavigate: (id: string) => void`
- **Behavior**:
  - Always visible on desktop, collapsible to icons only
  - Hamburger menu for expand/collapse (mobile/desktop)
  - Keyboard and screen reader accessible (ARIA roles, tab order)
  - Does not scroll with main content

## Top Bar Component
- **Props**: `title: string`, `onBack?: () => void`, `quickActions: React.ReactNode[]`
- **Behavior**:
  - Back button (if not on root page)
  - Page title (left)
  - Quick actions (right: search, user menu)
  - Accessible (ARIA labels, focus states)

---

# Contract: Bank Account Management (API)

## Endpoints
- `GET /api/bank-accounts` — List all bank accounts
- `GET /api/bank-accounts/{id}` — Get details for a bank account
- `POST /api/bank-accounts` — Add a new bank account
- `PUT /api/bank-accounts/{id}` — Edit a bank account (name, number)
- `DELETE /api/bank-accounts/{id}` — Delete a bank account
- `GET /api/bank-accounts/{id}/transfers` — List all transfers for a bank account

## Data Contract: BankAccount
```json
{
  "id": "string",
  "accountName": "string|null",
  "accountNumber": "string|null",
  "isInternal": true,
  "totalBalance": "string",
  "linkedLabelIds": ["string"]
}
```

## Data Contract: Transfer
```json
{
  "id": "string",
  "amount": "string",
  "date": "string",
  "fromAccountNumber": "string|null",
  "fromAccountName": "string|null",
  "toAccountNumber": "string|null",
  "toAccountName": "string|null",
  "reference": "string",
  "isInternal": true,
  "labelIds": ["string"],
  "labelLinks": [{"id": "string", "name": "string", "isManual": true}]
}
```

## Error Handling
- All endpoints return standard API Platform error format on failure
- Validation errors return 400 with details
- Not found returns 404
- Permission denied returns 403

---

# Contract: Label-Transfer Sync (Backend)

- When a bank account is unlinked from a label, all related transfers must update their label associations within 1 minute.
- Sync is atomic and consistent (no partial updates)
- Manual label links are preserved; only automatic links are updated/removed

