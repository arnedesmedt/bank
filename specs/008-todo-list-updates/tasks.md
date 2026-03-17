---
description: "Task list for 008-todo-list-updates: Todo List UI & Backend Updates"
---

# Tasks: Todo List UI & Backend Updates

**Input**: Design documents from `/specs/008-todo-list-updates/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md

**Tests**: No explicit TDD/test tasks requested in the spec; only include implementation and validation tasks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description with file path`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Ensure frontend and backend project structure matches plan in frontend/src/ and backend/src/
- [x] T002 [P] Verify all dependencies are installed (React 19, Vite 7, TailwindCSS 4, Symfony 8, API Platform 3, Doctrine ORM) in package.json and composer.json
- [x] T003 [P] Configure linting and formatting tools (ESLint, Prettier, PHPCS, PHPStan, Rector) in frontend/ and backend/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [x] T004 Setup environment configuration for local/dev/test in frontend/ and backend/
- [x] T005 [P] Ensure database schema and migrations are up to date in backend/migrations/
- [x] T006 [P] Confirm API routing and middleware structure in backend/config/routes.yaml and backend/config/packages/
- [x] T007 [P] Confirm base entities (Label, Transfer, BankAccount) exist in backend/src/Entity/
- [x] T008 [P] Confirm base API resources for Label, Transfer, BankAccount in backend/src/ApiResource/
- [x] T009 [P] Confirm base pages/components exist in frontend/src/pages/ and frontend/src/components/

---

## Phase 3: User Story 1 - Action Bar and Notifications (Priority: P1) 🎯 MVP

**Goal**: Action bar under topbar with relevant actions (filter, create, import), floating notifications in top right, CSV import in action bar, notifications closeable and disappear on navigation.

**Independent Test**: Navigate to a page with actions, trigger actions (e.g., import), observe action bar and notification behavior.

### Implementation for User Story 1

- [x] T010 [P] [US1] Create ActionBar component in frontend/src/components/ActionBar.tsx
- [x] T011 [P] [US1] Create Notification system (context/provider + component) in frontend/src/components/NotificationProvider.tsx
- [x] T012 [P] [US1] Integrate NotificationProvider at app root in frontend/src/main.tsx
- [x] T013 [P] [US1] Update CSV import to be a button in ActionBar in frontend/src/pages/TransferListPage.tsx
- [x] T014 [US1] Wire up floating notifications for CSV import in frontend/src/pages/TransferListPage.tsx
- [x] T015 [US1] Ensure action bar is context-sensitive and hidden if no actions in frontend/src/components/ActionBar.tsx
- [x] T016 [US1] Ensure notifications close on navigation in frontend/src/components/NotificationProvider.tsx
- [x] T017 [US1] Add accessibility and stacking logic for notifications in frontend/src/components/NotificationProvider.tsx

---

## Phase 4: User Story 2 - Label and Transfer Detail Pages (Priority: P2)

**Goal**: Label detail page (shows linked transfers, edit/delete label), transfer detail page (shows linked labels, add label), labels clickable in transfer list.

**Independent Test**: Click label or transfer, view detail page, perform edit/delete or label assignment actions.

### Implementation for User Story 2

- [x] T018 [P] [US2] Create LabelDetailPage in frontend/src/pages/LabelDetailPage.tsx
- [x] T019 [P] [US2] Create TransferDetailPage in frontend/src/pages/TransferDetailPage.tsx
- [x] T020 [P] [US2] Add label click navigation in TransferListPage in frontend/src/pages/TransferListPage.tsx
- [x] T021 [P] [US2] Implement edit/delete logic for label in frontend/src/pages/LabelDetailPage.tsx
- [x] T022 [P] [US2] Implement add label to transfer logic in frontend/src/pages/TransferDetailPage.tsx
- [x] T023 [P] [US2] Update backend Label and Transfer entities for detail endpoints in backend/src/Entity/Label.php and backend/src/Entity/Transfer.php
- [x] T024 [P] [US2] Add/Update API resources for label/transfer detail in backend/src/ApiResource/
- [x] T025 [US2] Add/Update controllers/services for label/transfer detail/edit in backend/src/Controller/
- [x] T026 [US2] Prevent duplicate label assignment in backend/src/Service/TransferService.php
- [x] T027 [US2] Ensure deleting label removes association from transfers but not the transfers in backend/src/Service/LabelService.php

---

## Phase 5: User Story 3 - Prevent Bank Account Deletion (Priority: P3)

**Goal**: Prevent bank account deletion in UI and backend (remove endpoint).

**Independent Test**: Attempt to delete bank account in UI and via API, confirm operation is blocked.

### Implementation for User Story 3

- [x] T028 [P] [US3] Remove/delete bank account delete endpoint in backend/src/ApiResource/BankAccount.php
- [x] T029 [P] [US3] Remove/hide delete option in frontend UI in frontend/src/pages/BankAccountPage.tsx
- [x] T030 [US3] Ensure backend returns error if delete attempted via direct API in backend/src/Controller/BankAccountController.php

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T031 [P] Update documentation in README.md and QUICKSTART.md
- [x] T032 Code cleanup and refactoring in frontend/src/ and backend/src/
- [x] T033 Performance optimization across all stories in frontend/src/ and backend/src/
- [x] T034 [P] Security hardening in backend/config/ and frontend/src/

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies
- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story
- Models/services/components marked [P] can run in parallel if in different files
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Execution Examples
- All [P] tasks in Setup and Foundational can run in parallel
- For User Story 1: ActionBar, NotificationProvider, and CSV import button can be implemented in parallel
- For User Story 2: LabelDetailPage, TransferDetailPage, and backend entity/API updates can be implemented in parallel

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
5. Each story adds value without breaking previous stories

---

## Summary

- **Total tasks**: 34
- **Task count per user story**:
  - US1: 8
  - US2: 10
  - US3: 3
- **Parallel opportunities**: All [P] tasks in Setup, Foundational, and within each user story (see above)
- **Independent test criteria**:
  - US1: Action bar and notifications work as described
  - US2: Label/transfer detail pages and edit/assignment work as described
  - US3: Bank account deletion blocked in UI and backend
- **Suggested MVP scope**: Complete through User Story 1 (Phase 3)
- **Format validation**: All tasks follow strict checklist format (checkbox, ID, [P] if parallel, [USx] for user stories, file path)

