---
description: "Task list for 007-transfer-page-routing"
---

# Tasks: Transfer Page Routing (Feature 007)

**Input**: Design documents from `/specs/007-transfer-page-routing/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Only include if explicitly requested (not required for this feature unless specified in a user story)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create/verify project structure per plan in backend/ and frontend/
- [x] T002 Initialize backend dependencies (Symfony, API Platform, Doctrine) in backend/
- [x] T003 Initialize frontend dependencies (React 19, React Router 6, Tailwind CSS, Vite) in frontend/
- [x] T004 [P] Configure linting and formatting tools in backend/ and frontend/
- [x] T005 [P] Ensure .env and environment configuration for both backend/ and frontend/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [x] T006 Setup base entities: BankAccount, Transaction, Label in backend/src/Entity/
- [x] T007 [P] Setup database migrations for new/updated entities in backend/migrations/
- [x] T008 [P] Implement authentication/authorization middleware in backend/src/Service/
- [x] T009 [P] Setup API routing and error handling in backend/src/Controller/
- [x] T010 [P] Setup base API endpoints for account, transaction, label, and import in backend/src/Controller/
- [x] T011 [P] Setup frontend routing structure in frontend/src/pages/ and frontend/src/services/
- [x] T012 [P] Implement global error boundary and user-friendly error pages in frontend/src/components/
- [x] T013 [P] Add ARIA roles and keyboard navigation support for import panel and error pages in frontend/src/components/
- [x] T014 [P] Configure logging and monitoring in backend/ and frontend/

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Clickable Bank Accounts (Priority: P1) 🎯 MVP

**Goal**: Users can click a bank account on the transfer page to view its detail page.

**Independent Test**: Click a bank account on the transfer page and verify navigation to the correct detail page. Refresh on detail page retains view.

### Implementation for User Story 1

- [x] T015 [P] [US1] Update transfer page to render bank accounts as clickable links in frontend/src/pages/TransferPage.tsx
- [x] T016 [P] [US1] Implement navigation to /accounts/:id using React Router in frontend/src/pages/AccountDetailPage.tsx
- [x] T017 [US1] Fetch account detail from backend via GET /api/accounts/{id} in frontend/src/services/accountService.ts
- [x] T018 [US1] Handle 404/403 errors with user-friendly error page in frontend/src/components/ErrorPage.tsx
- [x] T019 [US1] Ensure account detail page is accessible and supports keyboard navigation in frontend/src/pages/AccountDetailPage.tsx

**Checkpoint**: User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Responsive Import CSV Panel (Priority: P2)

**Goal**: Import CSV panel is accessible and correctly positioned on all screen sizes.

**Independent Test**: Resize browser and verify import panel's position and behavior.

### Implementation for User Story 2

- [x] T020 [P] [US2] Refactor import CSV panel to fixed action panel on right for wide screens in frontend/src/components/ImportPanel.tsx
- [x] T021 [P] [US2] Implement collapsible accordion import panel above transaction list for narrow screens in frontend/src/components/ImportPanel.tsx
- [x] T022 [US2] Add responsive logic for panel position and behavior on window resize in frontend/src/components/ImportPanel.tsx
- [x] T023 [US2] Ensure import panel does not scroll with page on wide screens and is hidden when collapsed on narrow screens in frontend/src/components/ImportPanel.tsx
- [x] T024 [US2] Add ARIA roles and keyboard navigation for import panel in frontend/src/components/ImportPanel.tsx
- [x] T025 [US2] Handle malformed/duplicate CSV files and display actionable errors in frontend/src/components/ImportPanel.tsx

**Checkpoint**: User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Persistent Routing for Detail Pages (Priority: P3)

**Goal**: URL reflects current view; refresh and deep links retain correct detail page.

**Independent Test**: Navigate to a detail page, refresh, and confirm the same page is shown. Share URL and verify correct page loads.

### Implementation for User Story 3

- [x] T026 [P] [US3] Update React Router config for persistent detail page routing in frontend/src/pages/
- [ ] T027 [P] [US3] Ensure transaction detail page at /transactions/:id supports refresh and deep linking in frontend/src/pages/TransactionDetailPage.tsx
- [ ] T028 [US3] Fetch transaction detail from backend via GET /api/transactions/{id} in frontend/src/services/transactionService.ts
- [ ] T029 [US3] Handle 404/403 errors for transaction detail with user-friendly error page in frontend/src/components/ErrorPage.tsx
- [ ] T030 [US3] Ensure transaction detail page is accessible and supports keyboard navigation in frontend/src/pages/TransactionDetailPage.tsx

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: User Story 4 - Label Sync for Transactions (Priority: P4)

**Goal**: Label changes on bank accounts are reflected in all related transactions within 1 minute.

**Independent Test**: Update a label on a bank account and verify all related transactions reflect the change within 1 minute.

### Implementation for User Story 4

- [x] T031 [P] [US4] Update backend label PATCH logic to trigger async job for transaction label sync in backend/src/Service/LabelService.php
- [x] T032 [P] [US4] Implement async job handler for label sync in backend/src/Service/LabelSyncJobHandler.php
- [x] T033 [US4] Update transaction entity and repository to support label updates in backend/src/Entity/Transaction.php and backend/src/Repository/TransactionRepository.php
- [x] T034 [US4] Ensure PATCH /api/labels/{id} endpoint triggers sync and returns updated label in backend/src/Controller/LabelController.php
- [x] T035 [US4] Handle concurrent label updates and ensure data consistency in backend/src/Service/LabelSyncJobHandler.php
- [x] T036 [US4] Add logging and error handling for label sync in backend/src/Service/LabelSyncJobHandler.php

**Checkpoint**: All user stories independently testable and complete

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T037 [P] Update OpenAPI/Swagger documentation for all new/changed endpoints in backend/
- [ ] T038 [P] Update frontend and backend README.md with new features and usage
- [ ] T039 Code cleanup and refactoring in backend/ and frontend/
- [ ] T040 Performance optimization for navigation, import, and label sync
- [ ] T041 [P] Security review and hardening for new endpoints and UI
- [ ] T042 [P] Run quickstart.md validation for end-to-end feature check

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies
- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - No dependencies on other stories

### Within Each User Story
- Models/services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities
- All [P] tasks in Setup and Foundational can run in parallel
- All user stories can start in parallel after Foundational
- Within each user story, [P] tasks can run in parallel (different files, no dependencies)

#### Parallel Example: User Story 1
- T015, T016, T017 can be implemented in parallel (different files)
- T018, T019 can be implemented in parallel after above

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery
1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy
With multiple developers:
1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
   - Developer D: User Story 4
3. Stories complete and integrate independently

---

## Notes
- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

