# Quickstart: Transfer Page Routing (Feature 007)

## Prerequisites
- Backend: Symfony 8, API Platform 4, Doctrine ORM 3.6
- Frontend: React 19, React Router 6, Tailwind CSS 4, Vite
- Ensure backend and frontend are running (see project root QUICKSTART.md)

## Steps

### 1. Checkout Feature Branch
```bash
git checkout 007-transfer-page-routing
```

### 2. Install Dependencies
```bash
cd backend && composer install
cd ../frontend && npm install
```

### 3. Run Backend and Frontend
```bash
cd backend && make start
cd ../frontend && npm run dev
```

### 4. Test Feature
- Navigate to /transfers in the app
- Click a bank account: should route to detail page
- Resize window: import panel should move responsively
- Refresh on detail page: should stay on same page
- Update a label on a bank account: all related transactions update labels within 1 minute

### 5. Run Tests
```bash
cd backend && make test
cd ../frontend && npm test
```

## Troubleshooting
- For routing issues, check React Router config in frontend/src/pages/
- For backend label sync, check logs and async job status

