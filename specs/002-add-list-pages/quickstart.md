# Quickstart: Add List Pages

## Overview
This feature adds two new pages to the React frontend:
- Bank Accounts List (`/bank-accounts`)
- Labels List (`/labels`)

Both pages fetch data from the Symfony API backend, display a simple list, and handle empty/error states with minimal UI.

## Steps
1. Checkout branch `002-add-list-pages`.
2. Add routes for `/bank-accounts` and `/labels` in React Router.
3. Create `BankAccountsListPage` and `LabelsListPage` components in `frontend/src/pages/`.
4. Use Fetch API to call `/api/bank-accounts` and `/api/labels`.
5. Display lists, empty state, and error state as specified.
6. Reference csv import transfers for provenance.
7. Add tests for rendering, empty/error states, and API integration.

## Reference
- See `spec.md`, `data-model.md`, and `contracts/` for details.

