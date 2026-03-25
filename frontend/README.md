# Bank Application — Frontend

React + TypeScript SPA for the bank application, built with Vite and TailwindCSS.

## Tech Stack

- **React 19** with TypeScript
- **Vite** for bundling and dev server
- **TailwindCSS** for styling
- **Vitest** + **React Testing Library** for tests

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Transfers | *(default)* | Import CSV files, manage labels, and view the transfer list with refund linking |
| Bank Accounts | `/bank-accounts` | Read-only list of all bank accounts (populated via CSV import) |
| Labels | `/labels` | Read-only list of all labels with parent hierarchy and linked accounts |

Navigation between pages is available via the tab bar at the top of the authenticated layout.

## Architecture

```
src/
├── contexts/         # AuthContext — OAuth2 token management
├── pages/            # Full-page components (one per route/tab)
│   ├── BankAccountsListPage.tsx
│   └── LabelsListPage.tsx
├── components/       # Reusable UI components
│   ├── ActionBar.tsx         # Filter bar + bulk action panel (Label/Refund)
│   ├── Amount.tsx            # Formatted amount display
│   ├── BankAccountRow.tsx
│   ├── EmptyOrErrorState.tsx
│   ├── LabelRow.tsx
│   ├── LabelManager.tsx
│   ├── TransferImport.tsx
│   └── TransferList.tsx      # Transfer table with accordion refund children
├── services/         # API client layer
│   ├── apiClient.ts          # Shared authenticated fetch helper
│   ├── bankAccountsService.ts
│   ├── labelsService.ts
│   └── transfersService.ts   # Transfer CRUD, bulk actions, group-by
tests/                        # Vitest unit/component tests
```

## Refund Linking

Transfers can be linked as refunds of a parent transfer. The workflow:

1. Select **exactly one** transfer in the list — the "Link Refunds" button appears in the floating action panel.
2. Click **Link Refunds** — a modal opens listing all eligible transfers (not yet linked, not the parent itself).
3. Select one or more refund transfers. The modal preview shows the refund sum and the new parent amount.
4. Click **Link _N_ refunds** — the backend records the relationship, updates the parent amount, and the list refreshes.

In the transfer list:
- Parent transfers show their current (post-refund) amount; the original amount is shown in strikethrough below it.
- Refund children are displayed indented under their parent (accordion-style, collapsible).
- Each child row carries a **Refund** badge.

## API Integration

All API calls go to the Symfony backend (configured via `VITE_API_URL`, default `http://localhost:8080`).
Every request is authenticated with the Bearer token from `AuthContext`.

| Endpoint | Used by |
|----------|---------|
| `GET /api/bank-accounts` | BankAccountsListPage |
| `GET /api/labels` | LabelsListPage |
| `GET /api/transfers` | TransferList |
| `POST /api/transfers/import` | TransferImport |
| `PATCH /api/transfers/bulk` | TransferList (label bulk, refund linking) |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server (or use docker compose from project root)
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8080` | Base URL of the Symfony API backend |

## Tests

Tests live in `tests/` and use Vitest with `happy-dom` as the test environment.

```bash
npm run test               # watch mode
npx vitest run             # single run
npx vitest run --coverage  # with coverage report
```
