---
description: "Task list for 009-action-bar-improvements"
---
# Tasks: 009-action-bar-improvements
**Input**: Design documents from `/specs/009-action-bar-improvements/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/
## Phase 1: Setup (Shared Infrastructure)
- [X] T001 Create feature branch and ensure project structure per plan.md
- [X] T002 [P] Install/verify backend dependencies in backend/composer.json
- [X] T003 [P] Install/verify frontend dependencies in frontend/package.json
- [X] T004 [P] Ensure backend and frontend dev/test environments are up (docker-compose, Makefile)
---
## Phase 2: Foundational (Blocking Prerequisites)
- [X] T005 Setup database schema and migrations framework in backend/
- [X] T006 [P] Configure backend API routing and OpenAPI docs in backend/config/routes.yaml, backend/config/packages/api_platform.yaml
- [X] T007 [P] Configure frontend linting, formatting, and test tools in frontend/
- [X] T008 [P] Add base Transfer, Label, BankAccount entities in backend/src/Entity/
- [X] T009 Configure error handling and logging in backend/src/ and frontend/src/
- [X] T010 Setup environment configuration for backend/.env and frontend/.env
---
## Phase 3: User Story 1 - Enhanced Action Bar & Filtering (Priority: P1) 🎯 MVP
**Goal**: Filtering and searching transfers using an improved action bar (search, date range, label filters) on all relevant pages.
**Independent Test**: Apply filters and verify displayed transfers and totals update accordingly.
- [X] T011 [P] [US1] Extend Transfer entity with indexed filter fields in backend/src/Entity/Transfer.php
- [X] T012 [P] [US1] Extend /api/transfers GET endpoint for search, date, label, account filters in backend/src/Controller/TransferController.php
- [X] T013 [P] [US1] Update Doctrine migrations for new fields/indexes in backend/migrations/
- [X] T014 [P] [US1] Implement ActionBar component with search, date range, label filter in frontend/src/components/ActionBar.tsx
- [X] T015 [P] [US1] Integrate ActionBar into transfer list, bank account detail, label detail, and account list pages in frontend/src/pages/
- [X] T016 [P] [US1] Update TransferList to support real-time filter updates and totals in frontend/src/components/TransferList.tsx
- [X] T017 [US1] Add backend and frontend tests for filtering and totals in backend/tests/ and frontend/tests/
- [X] T018 [US1] Handle empty, error, and edge states for filtering in frontend/src/components/ActionBar.tsx and TransferList.tsx
---
## Phase 4: User Story 2 - Multi-Select & Bulk Actions (Priority: P2)
**Goal**: Select multiple transfers and perform bulk actions (apply/remove label, mark as refund/parent).
**Independent Test**: Select multiple transfers and perform each bulk action, verifying results.
- [X] T019 [P] [US2] Implement PATCH /api/transfers/bulk endpoint for bulk actions in backend/src/Controller/TransferController.php
- [X] T020 [P] [US2] Add bulk action logic to TransferService in backend/src/Service/TransferService.php
- [X] T021 [P] [US2] Add multi-select checkboxes to TransferList in frontend/src/components/TransferList.tsx
- [X] T022 [P] [US2] Add bulk action controls (apply/remove label, mark as refund, remove refund) in frontend/src/components/ActionBar.tsx
- [X] T023 [P] [US2] Implement collapsible/indented UI for refund/parent relationships in frontend/src/components/TransferList.tsx
- [X] T024 [US2] Add backend and frontend tests for bulk actions and refund logic in backend/tests/ and frontend/tests/
- [X] T025 [US2] Handle edge cases: orphaned refunds, invalid bulk actions in backend/src/Service/TransferService.php and frontend/src/components/TransferList.tsx
---
## Phase 5: User Story 3 - Group By & Graphical Analysis (Priority: P3)
**Goal**: Group transfers by period or label and visualize in an interactive graph.
**Independent Test**: Group data, view graph, and click graph elements to filter list view.
- [X] T026 [P] [US3] Implement /api/group-by GET endpoint for grouping in backend/src/Controller/GroupByController.php
- [X] T027 [P] [US3] Add GroupByResult DTO/entity in backend/src/ApiResource/GroupByResult.php
- [X] T028 [P] [US3] Add GroupByPage and GraphPage with Nivo charts in frontend/src/pages/GroupByPage.tsx and GraphPage.tsx
- [X] T029 [P] [US3] Implement interactive graph (bar/line) with click-to-filter in frontend/src/components/Graph.tsx
- [X] T030 [US3] Add backend and frontend tests for grouping and graphing in backend/tests/ and frontend/tests/
- [X] T031 [US3] Handle edge cases: empty/invalid groupings, graph errors in frontend/src/components/Graph.tsx
---
## Final Phase: Polish & Cross-Cutting Concerns
- [X] T032 [P] Update OpenAPI docs for all new/changed endpoints in backend/config/packages/api_platform.yaml
- [X] T033 [P] Update README/QUICKSTART for new features in README.md and QUICKSTART.md
- [X] T034 [P] Document UI/UX contracts and edge case handling in specs/009-action-bar-improvements/contracts/
- [X] T035 Code cleanup, refactoring, and performance optimization in backend/src/ and frontend/src/
- [X] T036 [P] Add additional unit/integration tests as needed in backend/tests/ and frontend/tests/
- [X] T037 Security review and hardening in backend/ and frontend/
- [X] T038 Run quickstart.md validation and demo new features in SPA
---
## Dependencies & Execution Order
### Phase Dependencies
- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup completion
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all user stories being complete
### User Story Dependencies
- **User Story 1 (P1)**: Can start after Foundational (Phase 2)
- **User Story 2 (P2)**: Can start after Foundational (Phase 2); independent but may integrate with US1
- **User Story 3 (P3)**: Can start after Foundational (Phase 2); independent but may integrate with US1/US2
### Within Each User Story
- Tests (if included) written and fail before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority
### Parallel Opportunities
- All [P] tasks in Setup and Foundational can run in parallel
- All user stories can start in parallel after Foundational
- Within a story, [P] tasks (different files) can run in parallel
#### Example: User Story 1 Parallel Execution
- T011, T012, T013, T014, T015, T016 can run in parallel (different files)
- T017, T018 depend on previous tasks
---
## Implementation Strategy
- **MVP First**: Complete Setup, Foundational, and User Story 1 (P1) before proceeding
- **Incremental Delivery**: Add User Story 2 (P2) and User Story 3 (P3) independently after MVP
- **Parallel Team**: After Foundational, different devs can work on US1, US2, US3 in parallel
---
