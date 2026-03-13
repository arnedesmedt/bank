# Tasks: Backend Account Features

## Feature Name
Backend Account Features

---

## Phase 1: Setup
- [x] T001 Create feature branch `003-backend-account-features` in VCS
- [x] T002 Setup PostgreSQL database and update Doctrine config in backend/config/packages/doctrine.yaml
- [x] T003 Add migration script skeleton in backend/migrations/ for schema changes

## Phase 2: Foundational
- [x] T004 [P] Add hash property to BankAccount entity in backend/src/Entity/BankAccount.php
- [x] T005 [P] Add internal boolean property to BankAccount entity in backend/src/Entity/BankAccount.php
- [x] T006 [P] Add total_balance property to BankAccount entity in backend/src/Entity/BankAccount.php
- [x] T007 [P] Remove owner property from BankAccount, Transfer, and Label entities in backend/src/Entity/BankAccount.php, backend/src/Entity/Transfer.php, backend/src/Entity/Label.php
- [x] T008 [P] Update migration scripts for new properties and owner removal in backend/migrations/

## Phase 3: User Story 1 (P1) - Unique Account Creation
**Goal**: Ensure unique account creation/import with hash, strict property handling, normalization, internal marking.
**Independent Test Criteria**: Create/import accounts, verify hash uniqueness, normalization, internal flag.
- [x] T009 [P] [US1] Implement hash calculation logic in backend/src/Entity/BankAccount.php
- [x] T010 [P] [US1] Implement strict property handling (nulls for missing/invalid) in backend/src/Entity/BankAccount.php
- [x] T011 [P] [US1] Implement account number normalization to 'BEXX XXXX XXXX XXXX' in backend/src/Entity/BankAccount.php
- [x] T012 [P] [US1] Set internal flag for first imported account in backend/src/Entity/BankAccount.php
- [x] T013 [P] [US1] Update BankAccount API resource to expose hash, internal, total_balance in backend/src/ApiResource/BankAccountApiResource.php
- [x] T014 [P] [US1] Update POST /accounts endpoint logic in backend/src/State/BankAccountStateProcessor.php
- [x] T015 [P] [US1] Update GET /accounts and GET /accounts/{id} endpoints in backend/src/State/BankAccountItemProvider.php, backend/src/State/BankAccountStateProvider.php
- [x] T016 [P] [US1] Add migration for hash, internal, normalization in backend/migrations/
- [x] T017 [P] [US1] Add tests for account creation, hash uniqueness, normalization, internal flag in backend/tests/Api/BankAccountApiResourceTest.php

## Phase 4: User Story 2 (P2) - Transfer Filtering and Balance Update
**Goal**: Filter reversed internal transfers, update balances.
**Independent Test Criteria**: Import/process transfers, verify filtering and balance updates.
- [x] T018 [P] [US2] Implement transfer filtering logic in backend/src/Service/TransferService.php
- [x] T019 [P] [US2] Update Transfer entity for balance calculation in backend/src/Entity/Transfer.php
- [x] T020 [P] [US2] Update BankAccount entity for balance calculation in backend/src/Entity/BankAccount.php
- [x] T021 [P] [US2] Update Transfer API resource to expose filtered and balanced transfers in backend/src/ApiResource/TransferApiResource.php
- [x] T022 [P] [US2] Update POST /transfers/import endpoint logic in backend/src/State/TransferImportProcessor.php
- [x] T023 [P] [US2] Update GET /accounts/{id}/transfers endpoint in backend/src/State/TransfersByAccountProvider.php
- [x] T024 [P] [US2] Add migration for transfer filtering and balance calculation in backend/migrations/
- [x] T025 [P] [US2] Add tests for transfer filtering and balance calculation in backend/tests/Api/TransferApiResourceTest.php, backend/tests/Api/CsvImportIntegrationTest.php

## Phase 5: User Story 3 (P3) - Owner Property Removal
**Goal**: Remove owner properties from all relevant entities.
**Independent Test Criteria**: Review entities, confirm absence of owner properties.
- [x] T026 [P] [US3] Remove owner property from Label entity in backend/src/Entity/Label.php
- [x] T027 [P] [US3] Remove owner property from Transfer entity in backend/src/Entity/Transfer.php
- [x] T028 [P] [US3] Remove owner property from BankAccount entity in backend/src/Entity/BankAccount.php
- [x] T029 [P] [US3] Update Label API resource for owner removal in backend/src/ApiResource/LabelApiResource.php
- [x] T030 [P] [US3] Update Transfer API resource for owner removal in backend/src/ApiResource/TransferApiResource.php
- [x] T031 [P] [US3] Update BankAccount API resource for owner removal in backend/src/ApiResource/BankAccountApiResource.php
- [x] T032 [P] [US3] Add migration for owner property removal in backend/migrations/
- [x] T033 [P] [US3] Add tests for owner property removal in backend/tests/Api/LabelApiResourceTest.php, backend/tests/Api/TransferApiResourceTest.php, backend/tests/Api/BankAccountApiResourceTest.php

## Final Phase: Polish & Cross-Cutting Concerns
- [x] T034 [P] Update documentation in backend/README.md and specs/003-backend-account-features/quickstart.md
- [x] T035 [P] Refactor and clean up code in backend/src/Entity/, backend/src/ApiResource/, backend/src/Service/
- [x] T036 [P] Ensure all migrations are reversible in backend/migrations/
- [x] T037 [P] Finalize test coverage in backend/tests/Api/

---

## Dependencies
- Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (US1) → Phase 4 (US2) → Phase 5 (US3) → Final Phase (Polish)
- Entity/schema changes must precede API/resource updates and migrations
- Tests for each story depend on implementation tasks for that story

## Parallel Execution Examples
- T004, T005, T006, T007 can be done in parallel (different entity files)
- T009–T012 can be done in parallel (hash, normalization, internal logic)
- API resource updates (T013, T021, T029) can be parallelized
- Test tasks (T017, T025, T033, T037) can be parallelized after implementation

## Implementation Strategy
- MVP: Complete Phase 1–3 (Setup, Foundational, US1)
- Incremental delivery: Each user story phase is independently testable and deployable

---

## Format Validation
- All tasks follow strict checklist format: checkbox, sequential TaskID, [P] for parallel, [USx] for story, exact file path
- Each user story has all needed tasks, independently testable

---

## Summary
- Total task count: 37
- Task count per user story: US1 (9), US2 (8), US3 (8)
- Parallel opportunities: Entity changes, API updates, tests
- Independent test criteria for each story included
- Suggested MVP scope: Phase 1–3 (Setup, Foundational, US1)
