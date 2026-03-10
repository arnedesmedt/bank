---
description: "Task list for Add List Pages feature implementation"
---

# Tasks: Add List Pages

**Input**: Design documents from `/specs/001-add-list-pages/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Automated tests are required for list rendering, empty/error states, and API integration (per spec and research).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Ensure frontend project structure exists in frontend/src/pages/, frontend/src/components/, frontend/src/services/
- [X] T002 Ensure backend API endpoints `/api/bank-accounts` and `/api/labels` are available in backend/src/api/
- [X] T003 Add React Router setup in frontend/src/main.tsx for new routes
- [X] T004 Install/verify Vitest and React Testing Library in frontend (package.json)

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared utilities/services for API calls and error handling

- [X] T005 [P] Create API service for fetching bank accounts in frontend/src/services/bankAccountsService.ts
- [X] T006 [P] Create API service for fetching labels in frontend/src/services/labelsService.ts
- [X] T007 [P] Create shared error/empty state component in frontend/src/components/EmptyOrErrorState.tsx

## Phase 3: User Story 1 - View Bank Accounts List (Priority: P1)

**Goal**: List all bank accounts with minimal UI, error/empty handling
**Independent Test Criteria**: Visiting /bank-accounts displays all accounts, empty state, and error state

- [X] T008 [P] [US1] Add route `/bank-accounts` to frontend/src/pages/BankAccountsListPage.tsx
- [X] T009 [P] [US1] Implement BankAccountsListPage component in frontend/src/pages/BankAccountsListPage.tsx
- [X] T010 [P] [US1] Render each account as row (name, account number, balance) in frontend/src/components/BankAccountRow.tsx
- [X] T011 [P] [US1] Integrate bankAccountsService for data fetching in BankAccountsListPage.tsx
- [X] T012 [P] [US1] Handle empty/error states using EmptyOrErrorState.tsx in BankAccountsListPage.tsx
- [X] T013 [P] [US1] Add automated tests for rendering, empty/error states, and API integration in frontend/tests/BankAccountsListPage.test.tsx

## Phase 4: User Story 2 - View Labels List (Priority: P2)

**Goal**: List all labels with minimal UI, error/empty handling
**Independent Test Criteria**: Visiting /labels displays all labels, empty state, and error state

- [X] T014 [P] [US2] Add route `/labels` to frontend/src/pages/LabelsListPage.tsx
- [X] T015 [P] [US2] Implement LabelsListPage component in frontend/src/pages/LabelsListPage.tsx
- [X] T016 [P] [US2] Render each label as row (name, description) in frontend/src/components/LabelRow.tsx
- [X] T017 [P] [US2] Integrate labelsService for data fetching in LabelsListPage.tsx
- [X] T018 [P] [US2] Handle empty/error states using EmptyOrErrorState.tsx in LabelsListPage.tsx
- [X] T019 [P] [US2] Add automated tests for rendering, empty/error states, and API integration in frontend/tests/LabelsListPage.test.tsx

## Final Phase: Polish & Cross-Cutting Concerns

- [ ] T020 Refactor code for clarity and maintainability in frontend/src/
- [ ] T021 Update documentation in frontend/README.md and backend/README.md
- [ ] T022 Ensure all new endpoints reference csv import transfers for provenance in backend/src/api/

## Dependencies

- Phase 1 (Setup) → Phase 2 (Foundational) → US1 (P1) → US2 (P2) → Polish
- US1 and US2 can be implemented and tested independently after foundational tasks

## Parallel Execution Examples

- T005, T006, T007 can be developed in parallel
- US1 tasks (T008-T013) can be developed in parallel after foundational tasks
- US2 tasks (T014-T019) can be developed in parallel after foundational tasks

## Implementation Strategy

- MVP: Complete US1 (Bank Accounts List Page) and all blocking tasks
- Incremental delivery: US2 (Labels List Page) and polish tasks follow

## Format Validation

- All tasks follow strict checklist format: checkbox, TaskID, [P] marker, [Story] label, file path
- Each user story phase is independently testable
- Parallel opportunities are clearly marked

