---

description: "Task list for feature 006: Sidebar Layout & Bank Account Management Improvements"
---

# Tasks: Sidebar Layout & Bank Account Management Improvements

**Input**: Design documents from `/specs/006-sidebar-layout/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Only included where explicitly required by the spec or for critical flows.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create/verify project structure for backend and frontend per plan.md
- [x] T002 [P] Install/verify backend dependencies in backend/composer.json
- [x] T003 [P] Install/verify frontend dependencies in frontend/package.json
- [x] T004 [P] Ensure Docker Compose setup for backend/frontend in docker-compose.yml, backend/compose.yaml, frontend/Dockerfile
- [x] T005 [P] Configure/verify linting and formatting tools in backend/grumphp.yml, frontend/eslint.config.js, frontend/prettier config

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [x] T006 Setup/verify database schema and migrations for BankAccount, Transfer, Label, LabelTransferLink in backend/src/Entity/
- [x] T007 [P] Setup/verify API Platform resource configuration for BankAccount, Transfer, Label in backend/src/ApiResource/
- [x] T008 [P] Implement/verify error handling and validation for all API endpoints in backend/src/Controller/
- [x] T009 [P] Setup/verify frontend routing and state management for sidebar, top bar, and bank account pages in frontend/src/pages/ and frontend/src/services/
- [x] T010 [P] Configure accessibility and responsive design base in frontend/src/components/

---

## Phase 3: User Story 1 - Navigate with Sidebar (Priority: P1) 🎯 MVP

**Goal**: Implement a modern, accessible, always-accessible, collapsible sidebar for navigation with icons, responsive for all device sizes.

**Independent Test**: Can be fully tested by logging in and navigating between all main pages using the sidebar on desktop and mobile devices.

### Implementation for User Story 1

- [x] T011 [P] [US1] Create Sidebar component with ARIA roles, keyboard navigation, and responsive/collapsible behavior in frontend/src/components/Sidebar.tsx
- [x] T012 [P] [US1] Implement sidebar page list and icon rendering in frontend/src/components/Sidebar.tsx
- [x] T013 [P] [US1] Integrate sidebar with frontend routing in frontend/src/pages/
- [x] T014 [US1] Add hamburger menu for expand/collapse in frontend/src/components/Sidebar.tsx
- [x] T015 [US1] Ensure sidebar does not scroll with main content in frontend/src/components/Sidebar.tsx
- [x] T016 [US1] Add accessibility tests for sidebar navigation in frontend/tests/

---

## Phase 4: User Story 2 - Top Bar Quick Actions (Priority: P2)

**Goal**: Implement a top bar with back button, page title, and quick actions (search, user menu), accessible and responsive.

**Independent Test**: Can be fully tested by viewing the top bar on all pages and verifying the presence and function of navigation, title, and quick actions.

### Implementation for User Story 2

- [x] T017 [P] [US2] Create TopBar component with ARIA labels and focus states in frontend/src/components/TopBar.tsx
- [x] T018 [P] [US2] Implement back button and page title logic in frontend/src/components/TopBar.tsx
- [x] T019 [P] [US2] Add quick actions (search, user menu) in frontend/src/components/TopBar.tsx
- [x] T020 [US2] Integrate TopBar with page navigation and state in frontend/src/pages/
- [x] T021 [US2] Add accessibility tests for top bar in frontend/tests/

---

## Phase 5: User Story 3 - Manage Bank Accounts (Priority: P3)

**Goal**: List, view, add, edit, and delete bank accounts with combined detail/edit page, error/empty states, and sync with backend.

**Independent Test**: Can be fully tested by adding, editing, deleting, and viewing bank accounts and their details.

### Implementation for User Story 3

- [x] T022 [P] [US3] Implement BankAccount API endpoints (GET/POST/PUT/DELETE) in backend/src/ApiResource/BankAccount.php, backend/src/Controller/BankAccountController.php
- [x] T023 [P] [US3] Implement bank account list page with clickable rows in frontend/src/pages/BankAccountsPage.tsx
- [x] T024 [P] [US3] Implement combined detail/edit page with view/edit modes in frontend/src/pages/BankAccountDetailPage.tsx
- [x] T025 [P] [US3] Implement add/edit/delete logic with modals or inline forms in frontend/src/pages/BankAccountDetailPage.tsx
- [x] T026 [US3] Show transaction history and balance in detail page in frontend/src/pages/BankAccountDetailPage.tsx
- [x] T027 [US3] Implement empty state and error handling for bank account list/detail in frontend/src/pages/BankAccountsPage.tsx, frontend/src/pages/BankAccountDetailPage.tsx
- [x] T028 [US3] Add backend validation for add/edit/delete in backend/src/Entity/BankAccount.php
- [x] T029 [US3] Add accessibility and keyboard navigation for all bank account management UI in frontend/src/pages/BankAccountsPage.tsx, frontend/src/pages/BankAccountDetailPage.tsx
- [x] T030 [US3] Add tests for bank account management flows in frontend/tests/, backend/tests/

---

## Phase 6: User Story 4 - Visual Feedback for Amounts (Priority: P4)

**Goal**: Color positive amounts green and negative amounts red, with accessible contrast and icons/text for colorblind users.

**Independent Test**: Can be fully tested by viewing any table/list of amounts and verifying color and icon/text feedback.

### Implementation for User Story 4

- [x] T031 [P] [US4] Update amount rendering logic in frontend/src/components/Amount.tsx
- [x] T032 [US4] Ensure accessible color contrast and add icons/text for colorblind users in frontend/src/components/Amount.tsx
- [x] T033 [US4] Add tests for amount rendering and accessibility in frontend/tests/

---

## Phase 7: Backend Label-Transfer Sync Bugfix (from spec & research)

**Goal**: Ensure that when a bank account is unlinked from a label, all related transfers update their label associations atomically and consistently.

**Independent Test**: Can be fully tested by unlinking a bank account from a label and verifying all affected transfers update their labels within 1 minute, with no partial updates.

- [x] T034 [P] Implement backend sync logic for label-transfer updates in backend/src/Service/LabelTransferSyncService.php
- [x] T035 [P] Add/verify Doctrine transaction for atomic sync in backend/src/Service/LabelTransferSyncService.php
- [x] T036 [P] Add/verify event-driven trigger for sync on unlink in backend/src/EventListener/LabelUnlinkListener.php
- [x] T037 Add backend tests for label-transfer sync in backend/tests/Service/LabelTransferSyncServiceTest.php

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T038 [P] Update documentation in README.md, QUICKSTART.md, and API docs
- [x] T039 Code cleanup and refactoring in backend/src/, frontend/src/
- [ ] T040 Performance optimization for sidebar, top bar, and bank account pages
- [x] T041 [P] Additional accessibility and unit tests in frontend/tests/, backend/tests/
- [x] T042 Security hardening in backend/src/, frontend/src/
- [x] T043 Run quickstart.md validation steps

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4)
- **Label-Transfer Sync Bugfix**: Depends on Foundational phase, can run in parallel with user stories
- **Polish (Final Phase)**: Depends on all desired user stories and bugfix being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **Label-Transfer Sync Bugfix**: Can start after Foundational (Phase 2)

### Within Each User Story
- Tests (if included) MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities
- All [P] tasks in Setup and Foundational can run in parallel
- All user stories and bugfix can be implemented in parallel after Foundational
- Within each user story, [P] tasks (different files, no dependencies) can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all sidebar component tasks together:
Task: "Create Sidebar component with ARIA roles, keyboard navigation, and responsive/collapsible behavior in frontend/src/components/Sidebar.tsx"
Task: "Implement sidebar page list and icon rendering in frontend/src/components/Sidebar.tsx"
```

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
6. Add Label-Transfer Sync Bugfix → Test independently → Deploy/Demo
7. Each story/bugfix adds value without breaking previous stories

---
