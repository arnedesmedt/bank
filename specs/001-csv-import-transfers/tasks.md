---
description: "Task list for CSV Import Transfers feature"
---

# Tasks: CSV Import Transfers

**Input**: Design documents from `/specs/001-csv-import-transfers/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Only included where explicitly required by the specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create backend/ and frontend/ project structure per implementation plan
- [x] T002 Initialize Symfony 8.x project in backend/ with API Platform, Doctrine, PostgreSQL, OAuth2, Xdebug, grumphp (composer.json)
- [x] T003 Initialize React + Vite + TypeScript + TailwindCSS project in frontend/ (package.json, vite.config.ts)
- [x] T004 [P] Configure Docker Compose for backend, db, frontend, Xdebug (backend/docker/, frontend/docker/, docker-compose.yml)
- [x] T005 [P] Add tmuxinator config for multi-container orchestration and logs (devops/tmuxinator.yml)
- [x] T006 [P] Configure backend and frontend .env files for DB and OAuth2 provider
- [x] T007 [P] Set up grumphp, phpstan, phpmd, phpcs (doctrine coding standard), rector in backend/ (grumphp.yml, phpstan.neon, etc.)
- [x] T008 [P] Set up linting, formatting, and test scripts in frontend/ (eslint, prettier, npm scripts)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [ ] T009 Implement base User entity and OAuth2 authentication in backend/src/ (Symfony security, league/oauth2-server)
- [ ] T010 [P] Implement authentication flow in frontend/src/ (OAuth2 client, sign-in/out UI)
- [ ] T011 [P] Set up PostgreSQL schema and migrations for core entities (backend/migrations/)
- [ ] T012 [P] Implement error handling middleware and global error responses in backend/src/
- [ ] T013 [P] Implement API Platform configuration (JSON only, docs disabled) in backend/config/
- [ ] T014 [P] Set up Xdebug config for backend (backend/docker/xdebug.ini, Dockerfile)

---

## Phase 3: User Story 1 - Import Transfers (P1)

**Goal**: User uploads CSV, system parses, persists, deduplicates, links to accounts, auto-labels transfers.
**Independent Test Criteria**: Upload CSV, verify transfers imported, no duplicates, auto-labeled.

- [ ] T015 [US1] Implement BankAccount entity, repository, and migration (backend/src/Entity/BankAccount.php, backend/migrations/)
- [ ] T016 [P] [US1] Implement Label entity, repository, and migration (backend/src/Entity/Label.php, backend/migrations/)
- [ ] T017 [P] [US1] Implement Transfer entity, repository, and migration (backend/src/Entity/Transfer.php, backend/migrations/)
- [ ] T018 [P] [US1] Implement CSV import service for Belfius format (backend/src/Service/CsvImportService.php)
- [ ] T019 [P] [US1] Implement idempotency logic (transaction_id or fingerprint) in backend/src/Service/TransferService.php
- [ ] T020 [P] [US1] Implement auto-labeling logic (regex, bank account) in backend/src/Service/LabelingService.php
- [ ] T021 [P] [US1] Implement internal transfer detection/exclusion logic in backend/src/Service/TransferService.php
- [ ] T022 [P] [US1] Implement /transfers/import endpoint per OpenAPI contract (backend/src/Controller/TransferImportController.php)
- [ ] T023 [P] [US1] Implement /transfers endpoint (list, filter, sort, paginate) per OpenAPI contract (backend/src/Controller/TransferController.php)
- [ ] T024 [P] [US1] Implement frontend CSV upload UI with progress/error handling (frontend/src/components/TransferImport.tsx)
- [ ] T025 [P] [US1] Implement frontend transfer list UI (paginated, sortable, filterable) (frontend/src/components/TransferList.tsx)
- [ ] T026 [P] [US1] Implement Redux/Context state for transfers, accounts, labels (frontend/src/state/)
- [ ] T027 [P] [US1] Implement integration/unit tests for CSV import, idempotency, auto-labeling, endpoints (backend/tests/)
- [ ] T028 [P] [US1] Implement integration/unit tests for frontend CSV import and transfer list (frontend/tests/)

---

## Phase 4: User Story 2 - Manage Labels (P2)

**Goal**: User manages labels, parent-child relationships, auto-linking, and auto-labeling.
**Independent Test Criteria**: Create labels, set parent-child, link to transfers, verify auto-linking/labeling.

- [ ] T029 [US2] Implement parent-child label relationship logic (backend/src/Entity/Label.php, backend/src/Service/LabelService.php)
- [ ] T030 [P] [US2] Implement linking labels to bank accounts and regexes (backend/src/Service/LabelService.php)
- [ ] T031 [P] [US2] Implement frontend label management UI (create, edit, parent-child, link to accounts/regexes) (frontend/src/components/LabelManager.tsx)
- [ ] T032 [P] [US2] Implement backend/DB tests for label hierarchy and auto-linking (backend/tests/)
- [ ] T033 [P] [US2] Implement frontend tests for label management (frontend/tests/)

---

## Phase 5: User Story 3 - View Statistics & Graphs (P3)

**Goal**: User views statistics, graphs, max values/percentages, remaining budget.
**Independent Test Criteria**: Select date range/labels, verify graphs and max values.

- [ ] T034 [US3] Implement backend endpoints for statistics and label max values (backend/src/Controller/StatisticsController.php)
- [ ] T035 [P] [US3] Implement backend logic for statistics aggregation (backend/src/Service/StatisticsService.php)
- [ ] T036 [P] [US3] Implement frontend statistics/graphs UI (circle diagrams, bar charts) (frontend/src/components/Statistics.tsx)
- [ ] T037 [P] [US3] Implement frontend logic for max value/percentage visualization (frontend/src/components/LabelBudget.tsx)
- [ ] T038 [P] [US3] Implement backend/frontend tests for statistics and graphs (backend/tests/, frontend/tests/)

---

## Final Phase: Polish & Cross-Cutting Concerns

- [ ] T039 Add edge case handling for unsupported CSV, missing transaction_id, multiple label matches, internal transfers (backend/src/Service/CsvImportService.php, TransferService.php)
- [ ] T040 [P] Add frontend error handling and debugging UI for import steps (frontend/src/components/TransferImport.tsx)
- [ ] T041 [P] Add documentation for endpoints, entities, and usage (backend/README.md, frontend/README.md)
- [ ] T042 [P] Add CI/CD pipeline config for quality gates (lint, tests, static analysis) (.github/workflows/)
- [ ] T043 [P] Final code review and constitution/quality gate check (all files)

---

## Dependencies

- Phase 1 → Phase 2 → US1 (Phase 3) → US2 (Phase 4) → US3 (Phase 5) → Polish
- US1, US2, US3 are independently testable after their phase

## Parallel Execution Examples

- T016, T017, T018, T019, T020, T021, T022, T023, T024, T025, T026, T027, T028 can be run in parallel after T015
- T030, T031, T032, T033 can be run in parallel after T029
- T035, T036, T037, T038 can be run in parallel after T034

## Implementation Strategy

- MVP: Complete Phase 1, Phase 2, and User Story 1 (Phase 3)
- Incremental: Deliver each user story as a complete, independently testable increment

## Format Validation

- All tasks follow strict checklist format: checkbox, ID, [P] if parallel, [USx] if user story, file path


