# Quickstart: Sidebar Layout & Bank Account Management Improvements

## Prerequisites
- Existing backend (Symfony 8, API Platform, Doctrine, PostgreSQL)
- Existing frontend (React 19, Vite, TailwindCSS)
- Docker, Node.js, Composer installed

## Setup
1. **Checkout feature branch**
   ```bash
   git checkout 006-sidebar-layout
   ```
2. **Install dependencies**
   ```bash
   cd backend && composer install
   cd ../frontend && npm install
   ```
3. **Start services**
   ```bash
   docker compose up -d
   npm run dev # in frontend/
   ```
4. **Run tests**
   - Backend: `cd backend && make test`
   - Frontend: `cd frontend && npm test`

## Feature Usage
- **Sidebar**: Use the left sidebar to navigate between Transfers, Bank Accounts, and Labels. Collapse/expand with hamburger menu. Icons always visible.
- **Top Bar**: Back button, page title, and quick actions (search, user menu) always present.
- **Bank Account Management**: Click a bank account to view/edit details. Add, edit, or delete accounts. Errors and empty states are clearly shown.
- **Label-Transfer Sync**: When unlinking a bank account from a label, all related transfers update their labels automatically.
- **Visual Feedback**: Positive amounts are green, negative amounts are red in all tables/lists.

## Accessibility & Responsiveness
- All navigation and actions are keyboard accessible.
- Sidebar and top bar are responsive for all device sizes.
- Color contrast meets WCAG AA.

## Troubleshooting
- If API or UI does not update after changes, refresh the page and check logs.
- For backend errors, check `backend/var/log/`.
- For frontend errors, check browser console and `frontend/` logs.

