# Implementation Plan: Label/Transfer Table Updates

**Branch**: `004-label-transfer-table-updates` | **Date**: March 13, 2026 | **Spec**: [specs/004-label-transfer-table-updates/spec.md]
**Input**: Feature specification from `/specs/004-label-transfer-table-updates/spec.md`

---

## 1. User Scenarios & Acceptance Criteria

### User Story 1: Manage Labels and Bank Accounts
- Users manage (create, edit, delete) labels and bank accounts from their dedicated pages.
- Table layouts and actions are consistent across entities.
- **Acceptance:**
  - Label actions only on label page; not on home page.
  - Bank account table uses transfer table styling, includes action column, and shows internal status.
  - Edit button for bank accounts leads to edit page.

### User Story 2: Import and Auto-Update Transfers
- Users upload transfers from a collapsible right vertical menu on the transfer list page.
- Transfer list auto-updates after upload/processing.
- **Acceptance:**
  - Upload only from right menu; transfer list updates automatically.

### User Story 3: Automated and Manual Label Assignment
- Labels are assigned to transfers automatically (by rules) or manually.
- System distinguishes link types; manual links only removed by explicit action, automatic links removed if rules no longer match.
- **Acceptance:**
  - New label with rules auto-assigns to matching transfers as "automatic".
  - Manual assignment persists regardless of rule changes.
  - Updates to labels/bank accounts re-evaluate only automatic links.
  - Manual links only removed by explicit user/API action.
  - Regex rules match both reference and account name.

---

## 2. Edge Cases
- Label with rule matching no transfers: created, not linked; user feedback.
- Simultaneous edits: last write wins.
- Transfer updated after label auto-assigned: re-evaluate only automatic links.
- Both manual and automatic link: manual takes precedence.
- Remove label from transfer (automatic): allowed; becomes explicit removal.
- Remove label from transfer (manual): only by explicit user/API action.
- UI import/auto-update fails: user receives error, can retry.

---

## 3. Functional Requirements
- FR-001: Labels managed only from label page.
- FR-002: Upload transfers from right vertical menu.
- FR-003: Transfer list auto-updates after upload/processing.
- FR-004: Consistent table styling for transfers, bank accounts, labels.
- FR-005: Action column for bank accounts and labels; edit button for bank accounts.
- FR-006: Show internal status for bank accounts.
- FR-007: Edit page for bank accounts (change name).
- FR-008: Label creation auto-assigns to matching transfers as "automatic".
- FR-009: Manual assign/remove labels to transfers; mark as "manual".
- FR-010: Regex rules match reference and account name.
- FR-011: Updates to bank account/label re-evaluate only automatic links.
- FR-012: Manual links never removed automatically; only by explicit action.
- FR-013: Automatic links removed if rules no longer match.
- FR-014: User feedback for all actions.
- FR-015: Simultaneous edits: last write wins.

---

## 4. Key Entities
- **Label**: Tag with rules (linked bank account(s), regex for reference/account name) for auto-assignment.
- **Bank Account**: User's bank account; has name, internal/external status.
- **Transfer**: Financial transaction; has reference, account name, linked labels.
- **Label-Transfer Link**: Association between label and transfer; attribute for "manual" (explicit) or "automatic" (rule-based). Manual links persist until explicitly removed; automatic links updated by rule evaluation.

---

## 5. Success Criteria (Measurable Outcomes)
- SC-001: 100% of label actions only on label page.
- SC-002: 100% of users upload transfers from right menu without assistance.
- SC-003: 100% of transfer uploads auto-update list within 5s.
- SC-004: Table styling visually consistent across all entities.
- SC-005: 100% of bank accounts show internal status and edit button.
- SC-006: 100% of edits reflected in automated label-transfer links within 5s.
- SC-007: 0 unresolved complaints about label assignment after changes (1 month post-release).
- SC-008: 100% of manual links only removed by explicit action.
- SC-009: 100% of automatic links removed if rules no longer match, unless manual link exists.

---

## 6. Assumptions
- Users have permission to manage labels and bank accounts.
- Standard web app error handling and feedback apply.
- Table styling refers to visual consistency, not implementation details.
- Auto-update means UI refreshes automatically without reload.
- Simultaneous edits are rare.
- If a label-transfer link is both manual and automatic, manual takes precedence and is only removed by explicit action.

---

## 7. Technical Context & Research Results (from previous plan)

**Language/Version**: PHP 8.x (Symfony/API Platform), TypeScript/React 18+  
**Primary Dependencies**: Symfony, Doctrine ORM, API Platform, React, Tailwind CSS  
**Storage**: PostgreSQL (via Doctrine ORM)  
**Testing**: PHPUnit (backend), Vitest/Jest (frontend)  
**Target Platform**: Linux server (backend), modern browsers (frontend)  
**Project Type**: Web application (SPA frontend + REST API backend)  
**Performance Goals**: <2s API response for main queries, auto-update UI within 5s of backend change  
**Constraints**: Data integrity, idempotency, extensibility, test coverage, security (see Constitution)  
**Scale/Scope**: 10k+ transfers per import, multi-user, multi-bank

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Separation of concerns: SPA + REST API, strict JSON/HTTP
- Data integrity: deduplication, validation, provenance, idempotency
- Extensibility: new formats/endpoints with minimal duplication
- Quality: automated tests, code standards, CI/CD
- Security: OWASP Top 10, secure data handling
- API documentation: OpenAPI/Swagger
- Migrations: reversible, tested
- All user-facing features demoed in SPA before release

## Project Structure

### Documentation (this feature)

```text
specs/004-label-transfer-table-updates/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── Entity/
│   │   ├── Label.php
│   │   ├── Transfer.php
│   │   └── LabelTransferLink.php   # New join entity for label-transfer with is_manual/link_type
│   ├── Repository/
│   ├── Service/
│   └── ...existing code...
├── migrations/                     # Doctrine migration for join entity and field
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/
```

**Structure Decision**: The project uses a monorepo with `backend` (Symfony, Doctrine, API Platform) and `frontend` (React SPA). The join entity and migration will be added to the backend, and UI/logic updates to the frontend.

## Research Results Incorporated

### Doctrine Many-to-Many Join Table with Extra Fields
- Use a dedicated join entity (`LabelTransferLink`) with a boolean or enum field to indicate manual/automatic assignment.
- Doctrine requires an explicit entity for extra attributes.

### React Auto-Updating Tables
- Use React Query, SWR, or Redux for state management and data fetching.
- Auto-update tables by refetching after uploads/edits, or use WebSockets/server-sent events for real-time updates.

### Business Logic for Manual/Automatic Label Links
- Manual links: Only created/removed by explicit user/API action; persist regardless of rule changes.
- Automatic links: Created/removed by rule evaluation; updated when rules or related entities change.
- Manual takes precedence if both exist.

### Migration Strategy
- Add the new field to the join entity with a default value.
- For existing links, default to "manual" if origin is unclear, to preserve user intent.
- Provide a migration script to update records.

## Complexity Tracking

> No Constitution Check violations at this stage.
