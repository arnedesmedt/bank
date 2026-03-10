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
| Transfers | *(default)* | Import CSV files, manage labels, and view the transfer list |
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
│   ├── BankAccountRow.tsx
│   ├── EmptyOrErrorState.tsx
│   ├── LabelRow.tsx
│   ├── LabelManager.tsx
│   ├── TransferImport.tsx
│   └── TransferList.tsx
├── services/         # API client layer
│   ├── apiClient.ts          # Shared authenticated fetch helper
│   ├── bankAccountsService.ts
│   └── labelsService.ts
tests/                    # Vitest unit/component tests
```

## API Integration

All API calls go to the Symfony backend (configured via `VITE_API_URL`, default `http://localhost:8080`).
Every request is authenticated with the Bearer token from `AuthContext`.

| Endpoint | Used by |
|----------|---------|
| `GET /api/bank-accounts` | BankAccountsListPage |
| `GET /api/labels` | LabelsListPage |
| `GET /api/transfers` | TransferList |
| `POST /api/transfers/import` | TransferImport |

> Bank accounts and labels are created as a side-effect of the CSV import feature
> (see `specs/001-csv-import-transfers`). The list pages here are read-only views
> of that data.

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
