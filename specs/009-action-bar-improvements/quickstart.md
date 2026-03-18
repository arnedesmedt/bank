# Quickstart: Action Bar Improvements & Advanced Filtering

## Overview
This feature introduces advanced filtering, multi-select bulk actions, refund/parent transfer logic, group by and graph pages, and UI/UX improvements to the action bar across transfer-related pages.

## Prerequisites
- Backend: Symfony 8, API Platform 3, Doctrine ORM, PostgreSQL
- Frontend: React 19, TypeScript, Vite, TailwindCSS, Nivo (for charts)

## Setup
1. Checkout the feature branch:
   ```sh
   git checkout 009-action-bar-improvements
   ```
2. Install backend dependencies:
   ```sh
   cd backend && composer install
   ```
3. Install frontend dependencies:
   ```sh
   cd frontend && npm install
   ```
4. Run backend and frontend:
   ```sh
   docker-compose up
   # or use Makefile targets if available
   ```

## Key Endpoints
- `GET /api/transfers?filter=...` — Filtering/search
- `PATCH /api/transfers/bulk` — Bulk actions (apply/remove label, mark as refund)
- `GET /api/group-by` — Grouping for graph/overview

## UI/UX
- Action bar is consistent across transfer, account, and label pages
- Multi-select and bulk actions available in transfer list
- Group by and graph pages accessible from navigation
- Refund/parent logic visible in transfer list (collapsible/indented)

## Testing
- Run backend tests:
   ```sh
   cd backend && make test
   ```
- Run frontend tests:
   ```sh
   cd frontend && npm test
   ```

## Documentation
- See `/specs/009-action-bar-improvements/spec.md` for requirements
- See `/specs/009-action-bar-improvements/data-model.md` for data model
- See `/specs/009-action-bar-improvements/contracts/` for API/UI contracts

