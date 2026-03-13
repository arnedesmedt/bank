---

description: "Task list for feature implementation: Label/Transfer Table Updates"
---

# Tasks: Label/Transfer Table Updates

**Input**: Design documents from `/specs/004-label-transfer-table-updates/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: Only included if explicitly requested in the feature specification (see below).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup
- [x] T001 Ensure backend and frontend environments are up to date (composer install, npm install) in backend/ and frontend/
- [x] T002 [P] Verify existing migrations are applied and database is up to date (backend/migrations/)

## Phase 2: Foundational (Blocking Prerequisites)
- [x] T003 Create LabelTransferLink join entity with manual/automatic flag in backend/src/Entity/LabelTransferLink.php
- [x] T004 Create Doctrine migration for LabelTransferLink and update existing label-transfer relationships in backend/migrations/
- [x] T005 Update Label, Transfer, and BankAccount entities to use LabelTransferLink in backend/src/Entity/
- [x] T006 Update backend services to support new label-transfer link logic (manual/automatic) in backend/src/Service/
- [x] T007 Update API Platform resources and endpoints for new join entity in backend/src/ApiResource/
- [x] T008 Update backend tests for new join entity and logic in backend/tests/Api/

## Phase 3: User Story 1 (P1) - Manage Labels and Bank Accounts
- [x] T009 [P] [US1] Update LabelsListPage to remove label actions from home page and ensure all label management is on label page in frontend/src/pages/LabelsListPage.tsx
- [x] T010 [P] [US1] Update LabelManager component for create/edit/delete actions in frontend/src/components/LabelManager.tsx
- [x] T011 [P] [US1] Update BankAccountsListPage to use transfer table styling, add action column, and show internal status in frontend/src/pages/BankAccountsListPage.tsx
- [x] T012 [P] [US1] Add edit button for bank accounts in BankAccountsListPage and BankAccountRow in frontend/src/pages/BankAccountsListPage.tsx and frontend/src/components/BankAccountRow.tsx
- [x] T013 [P] [US1] Implement bank account edit page in frontend/src/pages/BankAccountEditPage.tsx
- [x] T014 [P] [US1] Update frontend services for label and bank account management in frontend/src/services/
- [x] T015 [P] [US1] Update frontend tests for label and bank account management in frontend/tests/

## Phase 4: User Story 2 (P2) - Import and Auto-Update Transfers
- [x] T016 [P] [US2] Implement right vertical menu for transfer import in frontend/src/components/TransferImport.tsx
- [x] T017 [P] [US2] Remove old upload UI from transfer list page in frontend/src/pages/TransferList.tsx
- [x] T018 [P] [US2] Implement auto-update logic for transfer list after upload in frontend/src/components/TransferList.tsx
- [x] T019 [P] [US2] Update frontend tests for transfer import and auto-update in frontend/tests/TransferImportAndList.test.tsx

## Phase 5: User Story 3 (P3) - Automated and Manual Label Assignment
- [x] T020 [P] [US3] Implement backend logic for auto-assigning labels to transfers on creation in backend/src/Service/LabelingService.php
- [x] T021 [P] [US3] Implement backend logic for manual label assignment/removal in backend/src/Service/LabelingService.php
- [x] T022 [P] [US3] Update backend endpoints for manual/automatic label assignment in backend/src/ApiResource/
- [x] T023 [P] [US3] Update frontend to support manual label assignment/removal in frontend/src/components/LabelManager.tsx
- [x] T024 [P] [US3] Update frontend to display manual/automatic label links in transfer details in frontend/src/components/TransferList.tsx
- [x] T025 [P] [US3] Update backend and frontend tests for label assignment logic in backend/tests/Api/ and frontend/tests/

## Final Phase: Polish & Cross-Cutting Concerns
- [x] T026 [P] Add user feedback for all actions (success/failure) in frontend/src/components/ and backend/src/Service/
- [x] T027 [P] Ensure simultaneous edits are handled (last write wins) in backend/src/Service/ and frontend/src/services/
- [x] T028 [P] Update feature documentation in specs/004-label-transfer-table-updates/plan.md and specs/004-label-transfer-table-updates/spec.md
- [x] T029 [P] Update or add migration documentation in backend/migrations/

---

## Dependencies
- Phase 1 and 2 must be completed before any user story phases.
- User Story 1 (US1) is independent and can be implemented/tested first (MVP scope).
- User Story 2 (US2) and User Story 3 (US3) can be implemented in parallel after foundational tasks, but US3 depends on join entity and backend logic from Phase 2.
- Polish phase can be done in parallel after all user stories are complete.

## Parallel Execution Examples
- T009, T010, T011, T012, T013, T014, T015 ([US1] frontend tasks) can be done in parallel after foundational tasks.
- T016, T017, T018, T019 ([US2] frontend tasks) can be done in parallel after foundational tasks.
- T020, T021, T022, T023, T024, T025 ([US3] backend/frontend tasks) can be done in parallel after foundational tasks.
- T026, T027, T028, T029 (polish/documentation) can be done in parallel after all user stories.

## Implementation Strategy
- MVP: Complete all tasks for User Story 1 (US1) to deliver core label and bank account management improvements.
- Incremental: Deliver each user story as an independently testable increment, with backend and frontend tasks grouped for parallel execution.

---

# END OF TASKS

