# Implementation Plan: CSV Import Transfers

**Branch**: `001-csv-import-transfers` | **Date**: March 10, 2026 | **Spec**: [link]
**Input**: Feature specification from `/specs/001-csv-import-transfers/spec.md`

## Summary

Architectural update: Doctrine entities are now separated from ApiResource classes for the Transfer domain. Symfony's object mapper will be used to map incoming ApiResource DTOs to Doctrine entities and vice versa, following API Platform's DTO guidance (https://api-platform.com/docs/core/dto/).

## Technical Context

**Language/Version**: PHP 8.4, Symfony 8.x, API Platform 4.x  
**Primary Dependencies**: Symfony, API Platform, Doctrine ORM, Symfony ObjectMapper (NEEDS CLARIFICATION: exact mapping configuration)  
**Storage**: PostgreSQL  
**Testing**: PHPUnit, API Platform Test, Symfony Test  
**Target Platform**: Linux server  
**Project Type**: web-service (REST API)  
**Performance Goals**: <2s API response for main queries, handle 10,000 transfers per import  
**Constraints**: Idempotency, data integrity, separation of concerns, extensibility  
**Scale/Scope**: Multiple banks, 10k+ users, 10k+ transfers per import

**Architectural Change**:
- Doctrine entities and ApiResource DTOs are now separate for Transfer domain.
- Symfony's object mapper will handle mapping between DTOs and entities. Configure the object mapper via attributes
- API Platform will expose DTOs as resources, not entities directly. You can use input and output DTOs for different operations if needed.
- Validation, persistence, and business logic will operate on entities; API input/output will use DTOs.

**Unknowns/Clarifications Needed**:
- NEEDS CLARIFICATION: DTO structure for Transfer import (fields, validation).
- NEEDS CLARIFICATION: Mapping patterns for nested/related entities (e.g., BankAccount, Label).
- NEEDS CLARIFICATION: How to handle idempotency and deduplication in DTO/entity mapping.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Separation of Concerns: Architectural change supports this principle.
- Data Integrity and Idempotency: Must ensure deduplication and validation in mapping logic.
- Extensibility and Maintainability: DTO/entity split improves maintainability and supports new formats.
- Quality and Testability: Mapping logic must be covered by tests.
- Security and Privacy: No direct entity exposure; DTOs validated and mapped securely.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
