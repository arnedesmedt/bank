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

- [x] T009 Implement base User entity and OAuth2 authentication in backend/src/ (Symfony security, league/oauth2-server)
- [x] T010 [P] Implement authentication flow in frontend/src/ (OAuth2 client, sign-in/out UI)
- [x] T011 [P] Set up PostgreSQL schema and migrations for core entities (backend/migrations/)
- [x] T012 [P] Implement error handling middleware and global error responses in backend/src/
- [x] T013 [P] Implement API Platform configuration (JSON only, docs disabled, expect open api) in backend/config/
- [x] T014 [P] Set up Xdebug config for backend (backend/docker/xdebug.ini, Dockerfile)

---

## Phase 3: User Story 1 - Import Transfers (P1)

**Goal**: User uploads CSV, system parses, persists, deduplicates, links to accounts, auto-labels transfers.
**Independent Test Criteria**: Upload CSV, verify transfers imported, no duplicates, auto-labeled.

- [x] T015 [US1] Implement BankAccount entity, repository, and migration (backend/src/Entity/BankAccount.php, backend/migrations/)
- [x] T016 [P] [US1] Implement Label entity, repository, and migration (backend/src/Entity/Label.php, backend/migrations/)
- [x] T017 [P] [US1] Implement Transfer entity, repository, and migration (backend/src/Entity/Transfer.php, backend/migrations/)
- [x] T018 [P] [US1] Implement CSV import service for Belfius format (backend/src/Service/CsvImportService.php)
- [x] T019 [P] [US1] Implement idempotency logic (transaction_id or fingerprint) in backend/src/Service/TransferService.php
- [x] T020 [P] [US1] Implement auto-labeling logic (regex, bank account) in backend/src/Service/LabelingService.php
- [x] T021 [P] [US1] Implement internal transfer detection/exclusion logic in backend/src/Service/TransferService.php
- [x] T022 [P] [US1] Implement /transfers/import endpoint per OpenAPI contract (backend/src/Controller/TransferImportController.php)
- [x] T023 [P] [US1] Implement /transfers endpoint (list, filter, sort, paginate) per OpenAPI contract (backend/src/Controller/TransferController.php)
- [x] T024 [P] [US1] Implement frontend CSV upload UI with progress/error handling (frontend/src/components/TransferImport.tsx)
- [x] T025 [P] [US1] Implement frontend transfer list UI (paginated, sortable, filterable) (frontend/src/components/TransferList.tsx)
- [x] T026 [P] [US1] Implement Redux/Context state for transfers, accounts, labels (frontend/src/state/) - Using React hooks and AuthContext
- [x] T027 [P] [US1] Implement integration/unit tests for CSV import, idempotency, auto-labeling, endpoints (backend/tests/)
- [x] T028 [P] [US1] Implement integration/unit tests for frontend CSV import and transfer list (frontend/tests/)
- [x] T044 [P] [US1] Create TransferApiResource DTO class in backend/src/ApiResource/TransferApiResource.php
- [x] T045 [P] [US1] Create BankAccountApiResource DTO class in backend/src/ApiResource/BankAccountApiResource.php
- [x] T046 [P] [US1] Create LabelApiResource DTO class in backend/src/ApiResource/LabelApiResource.php
- [x] T047 [US1] Refactor Transfer endpoints to use TransferApiResource DTO (backend/src/Controller/TransferController.php, backend/config/routes.yaml)
- [x] T048 [US1] Refactor Transfer import endpoint to use TransferApiResource DTO (backend/src/Controller/TransferImportController.php)
- [x] T049 [US1] Refactor BankAccount and Label endpoints to use respective DTOs (backend/src/Controller/BankAccountController.php, LabelController.php)
- [x] T050 [US1] Implement and configure Symfony object mapper/DataTransformer for DTO <-> Entity mapping (backend/src/Service/ObjectMapperService.php, backend/config/services.yaml)
- [x] T051 [US1] Update API Platform resource configuration to expose DTOs (backend/config/api_platform/transfer.yaml, bank_account.yaml, label.yaml)
- [x] T052 [US1] Update unit/integration tests for DTO/entity mapping and endpoints (backend/tests/Api/TransferApiResourceTest.php, BankAccountApiResourceTest.php, LabelApiResourceTest.php)
- [x] T053 [US1] Update migrations if entity structure changes due to DTO/entity split (backend/migrations/)

---

## Dependencies

- Phase 1 → Phase 2 → US1 (Phase 3)
- US1 is independently testable after its phase

## Parallel Execution Examples

- T016, T017, T018, T019, T020, T021, T022, T023, T024, T025, T026, T027, T028 can be run in parallel after T015

## Implementation Strategy

- MVP: Complete Phase 1, Phase 2, and User Story 1 (Phase 3)
- Incremental: Deliver each user story as a complete, independently testable increment

## Format Validation

- All tasks follow strict checklist format: checkbox, ID, [P] if parallel, [USx] if user story, file path
