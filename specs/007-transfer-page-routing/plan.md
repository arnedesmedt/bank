
# Implementation Plan: Transfer Page Routing


**Branch**: `007-transfer-page-routing` | **Date**: 2026-03-14 | **Spec**: [specs/007-transfer-page-routing/spec.md](specs/007-transfer-page-routing/spec.md)
**Input**: Feature specification from `/specs/007-transfer-page-routing/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.


## Summary

This feature improves navigation and usability on the transfer page:
- Bank accounts are clickable in the transfer page, allowing navigation to the account detail page.
- The import CSV file panel is repositioned: on wide screens, it appears as a fixed action panel on the right (does not scroll); on narrow screens, it appears as a collapsible accordion above the transaction list.
- Routing is updated so that detail pages (transaction/account) are persistent in the URL, allowing refresh and deep linking.
- Backend ensures that when a label is added, updated, or removed from a bank account, all related transactions are updated accordingly.

Technical approach: Extend the React frontend with new routing and responsive layout logic, update the import panel component, and enhance navigation. Backend logic for label sync is updated for consistency. All changes are covered by automated tests and follow accessibility and performance standards.


## Technical Context

**Language/Version**: PHP 8.4+ (backend), TypeScript (frontend, React)
**Primary Dependencies**: Symfony (API Platform), React, React Router, Doctrine ORM, Tailwind CSS, Vite, Vitest, PHPUnit
**Storage**: PostgreSQL (relational DB)
**Testing**: PHPUnit (backend), Vitest (frontend), E2E (TBD)
**Target Platform**: Linux server (backend), modern browsers (frontend)
**Project Type**: Web application (SPA frontend + REST API backend)
**Performance Goals**: <2s API response for main queries, instant navigation, responsive UI
**Constraints**: REST/SPA, accessibility, responsive design, no duplicate records, reversible migrations
**Scale/Scope**: 10k+ users, 100+ accounts/user, 10k+ transactions/user


## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [ ] Separation of Concerns: SPA frontend and REST API backend, communicate via HTTP(S)/JSON only
- [ ] Data Integrity: No duplicate records, all changes traceable, migrations reversible
- [ ] Extensibility: New navigation, endpoints, and UI features must be easy to add
- [ ] Quality: Automated tests (unit, integration, E2E), code review, CI/CD, PSR-12, static analysis
- [ ] Security: API endpoints protected, sensitive data secure, OWASP Top 10
- [ ] Performance: Handle 10,000+ transactions/import, <2s API response
- [ ] Documentation: All API changes documented (OpenAPI/Swagger)
- [ ] Demo: All user-facing features demoed in SPA before release
- [ ] Migration: All data migrations reversible and tested

## Project Structure

### Documentation (this feature)

```text
specs/007-transfer-page-routing/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── Entity/
│   ├── Service/
│   ├── Controller/
│   └── ...
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/
```

**Structure Decision**: Web application with separate backend (Symfony) and frontend (React) directories as above.
directories captured above]


## User Stories

### User Story 1 - Clickable Bank Accounts (P1)
As a user viewing the transfer page, I want to click on a bank account in the list to view its detail page, so I can quickly access more information about that account.

### User Story 2 - Responsive Import CSV Panel (P2)
As a user on the transfer page, I want the import CSV file panel to be easily accessible and appropriately placed based on my screen size, so I can import transactions efficiently on any device.

### User Story 3 - Persistent Routing for Detail Pages (P3)
As a user viewing a transaction or account detail page, I want the URL to reflect my current view, so that refreshing the page keeps me on the same detail page.

### User Story 4 - Label Sync for Transactions (P4)
As an admin or user updating a label linked to a bank account, I want all related transactions to have their labels updated accordingly, so that label changes are consistently reflected.

## Edge Cases
- Accessing a detail page for a non-existent or unauthorized account: show error or redirect
- Import panel display when resizing the screen dynamically
- Label updated while transactions are being processed concurrently
- Malformed or duplicate CSV files during import

## Functional Requirements
- FR-001: System MUST allow users to click bank accounts on the transfer page to navigate to the account detail page.
- FR-002: System MUST update the browser URL to reflect the current page (including detail pages) and persist view on refresh.
- FR-003: System MUST display the import CSV file panel as a fixed action panel on the right for wide screens, and as a collapsible accordion above the transaction list for narrow screens.
- FR-004: System MUST ensure the import panel does not scroll with the page on wide screens and is not visible when scrolled on narrow screens (if collapsed).
- FR-005: System MUST update all transactions linked to a bank account when a label is added, updated, or removed from the account.
- FR-006: System MUST handle error cases gracefully, such as navigation to non-existent accounts or failed CSV imports.
- FR-007: System MUST provide responsive behavior for the import panel when resizing the browser window.

## Key Entities
- Bank Account: account ID, name, associated labels
- Transaction: transaction ID, amount, date, associated bank account, labels
- Label: label ID, name, linked bank accounts/transactions

## Measurable Outcomes
- SC-001: 95% of users can navigate from the transfer page to an account detail page without confusion or error.
- SC-002: 100% of page refreshes on detail pages retain the correct view and do not redirect to home.
- SC-003: Import CSV panel is accessible and correctly positioned on 100% of tested screen sizes and devices.
- SC-004: All label changes on bank accounts are reflected in 100% of related transactions within 1 minute.
- SC-005: No critical errors reported for navigation, import panel, or label sync in user acceptance testing.

## Assumptions
- Users have permission to view the accounts and transactions they access.
- Responsive breakpoints for "wide" and "narrow" screens follow existing design system standards.
- Label updates are processed asynchronously if needed, but must be reflected in all related transactions within 1 minute.
- Error messages for navigation and import failures are user-friendly and actionable.
