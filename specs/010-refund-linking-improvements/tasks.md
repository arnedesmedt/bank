---
description: "Task list for Refund Linking Improvements feature"
---

# Tasks: Refund Linking Improvements

**Input**: Design documents from `/specs/010-refund-linking-improvements/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included as requested in quickstart and spec (backend and frontend)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create/verify project structure per implementation plan (backend/, frontend/, specs/010-refund-linking-improvements/)
- [x] T002 [P] Ensure backend dependencies (Symfony 8, API Platform, Doctrine ORM) in backend/composer.json
- [x] T003 [P] Ensure frontend dependencies (React 19, TypeScript, Vite, TailwindCSS) in frontend/package.json
- [x] T004 [P] Configure linting and formatting tools (phpcs, eslint, prettier) in backend/ and frontend/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [x] T005 Create migration to add `amount_before_refund` column to backend/src/Entity/Transfer.php and backend/migrations/
- [x] T006 [P] Update backend/src/Entity/Transfer.php to support parent/child (refund) relationships and expose `amount_before_refund`, `parentTransfer`, `childRefunds` via API Platform
- [x] T007 [P] Update backend/src/Repository/TransferRepository.php for refund linking queries
- [x] T008 [P] Update backend/src/Service/TransferService.php to recalculate parent amount on refund link/unlink and enforce validation rules
- [x] T009 [P] Update backend/config/routes.yaml and API Platform config for PATCH /api/transfers/bulk endpoint
- [x] T010 [P] Update frontend/src/services/transfersService.ts to support new/changed API fields and PATCH /api/transfers/bulk
- [x] T011 [P] Add/verify backend/tests/ for migration and entity changes (PHPUnit)
- [x] T012 [P] Add/verify frontend/tests/ for API client changes (Vitest)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Refund Linking via Action Panel (Priority: P1) 🎯 MVP

**Goal**: Users can select a transfer, link refund transfers as children, and see accurate amounts and grouping in the UI. All edge cases handled.

**Independent Test**: Link refunds via UI, verify amounts, grouping, and edge case handling (orphaned, excessive, duplicate, self-linking)

### Tests for User Story 1

- [x] T013 [P] [US1] Backend contract test for PATCH /api/transfers/bulk in backend/tests/Api/RefundLinkingTest.php
- [x] T014 [P] [US1] Backend integration test for refund linking, unlinking, and edge cases in backend/tests/Service/RefundLinkingIntegrationTest.php
- [x] T015 [P] [US1] Frontend integration test for refund linking UI in frontend/tests/TransferListRefundLinking.test.tsx
- [x] T016 [P] [US1] Frontend edge case test for orphaned, excessive, duplicate, and self-linking in frontend/tests/TransferListRefundEdgeCases.test.tsx

### Implementation for User Story 1

- [x] T017 [P] [US1] Implement "Link Refunds" button in frontend/src/components/ActionBar.tsx
- [x] T018 [P] [US1] Implement modal/side panel for selecting eligible refund transfers in frontend/src/components/TransferList.tsx
- [x] T019 [P] [US1] Group refunds under parent transfer in accordion/collapsible UI in frontend/src/components/TransferList.tsx
- [x] T020 [P] [US1] Prevent invalid linking (already linked, sum > original amount, self-link) in frontend/src/components/TransferList.tsx
- [x] T021 [P] [US1] Show orphaned refunds as unlinked in frontend/src/components/TransferList.tsx
- [x] T022 [P] [US1] Implement PATCH /api/transfers/bulk logic for refund linking in backend/src/State/TransferBulkActionProcessor.php
- [x] T023 [P] [US1] Add validation and error handling for refund linking in backend/src/Service/TransferService.php
- [x] T024 [P] [US1] Update OpenAPI/Swagger docs for new/changed API fields in backend/config/
- [x] T025 [P] [US1] Add logging for refund linking operations in backend/src/Service/TransferService.php

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Final Phase: Polish & Cross-Cutting Concerns

- [x] T026 Update backend/README.md and frontend/README.md for refund linking improvements
- [x] T027 [P] Add/verify migration down() method and reversibility in backend/migrations/
- [x] T028 [P] Add/verify CI checks for new/changed files (lint, test) in .github/workflows/
- [x] T029 [P] Code review and refactor for maintainability (backend/src/, frontend/src/)
- [x] T030 [P] Update user documentation for refund linking in docs/

---

## Dependencies

- Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (User Story 1) → Final Phase (Polish)
- Within Phase 2 and 3, tasks marked [P] can be executed in parallel if file dependencies allow
- User Story 1 is independently testable after foundational tasks

## Parallel Execution Examples

- T002, T003, T004 can run in parallel after T001
- T006, T007, T008, T009, T010, T011, T012 can run in parallel after T005
- T013, T014, T015, T016, T017, T018, T019, T020, T021, T022, T023, T024, T025 can run in parallel after foundational tasks
- T027, T028, T029, T030 can run in parallel after T026

## Implementation Strategy

- MVP: Complete all tasks for User Story 1 (Phase 3)
- Deliver incrementally: Setup → Foundational → US1 (MVP) → Polish
- Each phase is independently testable and deliverable

## Format Validation

- All tasks follow strict checklist format: `- [ ] T### [P?] [US#?] Description with file path`
- Each user story phase task includes [US1] label
- All tasks specify file paths
- Parallelizable tasks are marked [P]

---




