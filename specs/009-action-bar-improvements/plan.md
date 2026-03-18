# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

This feature delivers advanced filtering, multi-select bulk actions, refund/parent transfer logic, group by and graph pages, and a consistent, improved action bar UI across all transfer-related pages. The backend is extended with efficient batch endpoints and grouping APIs, while the frontend implements new UI/UX patterns, interactive graphs (Nivo), and robust state management for large lists. All requirements and edge cases from the spec are addressed, with best practices from research applied throughout.

## Technical Context

**Language/Version**: PHP 8.5 (backend), TypeScript/React 19 (frontend)  
**Primary Dependencies**: Symfony 8, API Platform 3, Doctrine ORM, PostgreSQL, React 19, Vite, TailwindCSS, Nivo (charts)  
**Storage**: PostgreSQL (backend)  
**Testing**: PHPUnit, Zenstruck Foundry (backend); Vitest, React Testing Library (frontend)  
**Target Platform**: Linux server (backend), modern browsers (frontend)  
**Project Type**: Web application (SPA + REST API)  
**Performance Goals**: <2s for 10,000 transfers (grouping/filtering/bulk actions)  
**Constraints**: All API changes documented (OpenAPI), all features demoed in SPA, migrations reversible and tested  
**Scale/Scope**: Up to 10,000 transfers per user, 4+ main pages, 3+ entity types, 2+ graph types

## Constitution Check

- Separation of Concerns: Maintained (frontend and backend communicate via REST API/JSON)
- Data Integrity and Idempotency: Bulk actions and filtering are idempotent; refund/parent logic ensures no data duplication
- Extensibility and Maintainability: New endpoints and UI features are modular, follow existing patterns, and are documented
- Quality and Testability: All new business logic and UI features require automated tests (unit, integration, E2E)
- Security and Privacy: No sensitive data exposed; all endpoints require authentication; input validation enforced
- Technical Constraints: Symfony REST API, React SPA, OpenAPI docs, performance targets (<2s for 10k transfers)
- Workflow: All API changes documented, demo required before release, migrations reversible and tested

## Project Structure

### Documentation (this feature)
specs/009-action-bar-improvements/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── api.md           # API contract
│   └── ui.md            # UI contract
└── tasks.md             # Phase 2 output (/speckit.tasks command)

### Source Code (repository root)
backend/
├── src/
│   ├── Entity/
│   ├── Controller/
│   ├── Service/
│   └── ApiResource/
└── tests/
frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

**Structure Decision**: Web application (frontend + backend), using existing monorepo layout. All new code and changes are scoped to the feature branch and the above directories.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

## Implementation Plan

### 1. Data Model Changes (Backend)
- Add `parentTransfer` (nullable, self-referencing) to Transfer entity for refund logic
- Add `childRefunds` (inverse) to Transfer entity
- Ensure all filtering fields (date, label, account) are indexed for performance
- Update Doctrine migrations and tests

### 2. API Endpoints (Backend)
- Extend `/api/transfers` GET endpoint to support search, date range, label, and account filters
- Implement `/api/transfers/bulk` PATCH endpoint for bulk actions (apply/remove label, mark as refund, remove refund)
- Add `/api/group-by` GET endpoint for grouping by period/label, with query params for period, relative/absolute, labelIds, date range
- Ensure all endpoints are documented in OpenAPI and covered by tests

### 3. UI/UX (Frontend)
- Refactor ActionBar component to support search, date range, and multi-label filter on all relevant pages
- Add multi-select checkboxes to TransferList, with bulk action controls (apply/remove label, mark as refund, remove refund)
- Implement collapsible/indented UI for refund/parent relationships in TransferList
- Add GroupByPage and GraphPage, using Nivo for interactive graphs (bar/line), with click-to-filter behavior
- Ensure ActionBar is consistent and accessible across transfer list, bank account detail, label detail, and bank account list pages
- Handle empty/error states and edge cases (no results, invalid filters, orphaned refunds)

### 4. Integration Points
- Frontend uses new/extended API endpoints for filtering, bulk actions, and grouping
- State management for multi-select and bulk actions uses local state/context, debounced updates, and progress feedback
- Graph interactions trigger list view filters via navigation or state

### 5. Testing & Quality
- Add/extend backend unit, integration, and E2E tests for all new endpoints and logic
- Add/extend frontend unit and E2E tests for ActionBar, TransferList, GroupByPage, and GraphPage
- Validate performance for 10,000+ transfers (API and UI)
- Ensure all new code passes CI, static analysis, and code review

### 6. Documentation
- Update OpenAPI docs for all new/changed endpoints
- Update README/QUICKSTART as needed
- Document UI/UX contracts and edge case handling

### 7. Migration & Rollout
- Provide reversible Doctrine migration for data model changes
- Feature flag or branch for safe rollout and testing
- Demo new features in SPA before release

---

**All requirements from the spec are mapped to actionable steps above. Each step is ready for task breakdown and implementation.**
