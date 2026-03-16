# UI Contract: Transfer Page Routing (Feature 007)

## Transfer Page
- Bank accounts in transaction list are clickable
- Clicking account navigates to /accounts/:id
- Import CSV panel:
  - Wide screen: fixed on right, no padding, does not scroll
  - Narrow screen: collapsible accordion above transaction list, not visible when scrolled if collapsed
- Responsive: Panel moves on window resize

## Account Detail Page
- URL: /accounts/:id
- Shows account info, labels, transactions
- On refresh, remains on detail page
- 404/403 error page if not found/unauthorized

## Transaction Detail Page
- URL: /transactions/:id
- Shows transaction info, labels, account
- On refresh, remains on detail page
- 404/403 error page if not found/unauthorized

## Accessibility
- Import panel and error pages use ARIA roles
- Keyboard navigation supported for all interactive elements

## Error Handling
- User-friendly error messages for navigation and import failures
- Actionable links/buttons to recover from errors

