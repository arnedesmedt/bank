---
project: Bank Application
version: 1.0.0
ratification_date: TODO
last_amended_date: 2026-02-24
---

# Constitution: Bank Application

## Principles

### 1. Separation of Concerns
- The system must consist of a decoupled frontend (SPA) and a REST API backend, communicating strictly via HTTP(S) and JSON.

### 2. Data Integrity and Idempotency
- All imported CSV data must be deduplicated, validated, and persisted with traceable provenance. Re-importing the same file must not create duplicate records.

### 3. Extensibility and Maintainability
- The architecture must support new bank formats, new data visualizations, and new API endpoints with minimal code duplication and clear separation of domain logic.

### 4. Quality and Testability
- All business logic must be covered by automated tests (unit, integration, and end-to-end). Code must adhere to modern standards (PSR-12, static analysis, code review, CI/CD).

### 5. Security and Privacy
- All file uploads and API endpoints must be protected against common web vulnerabilities (OWASP Top 10). Sensitive data must be handled and stored securely.

## Section 2: Technical Constraints and Requirements
- Backend: Must be a REST API (Symfony, API Platform, or equivalent), supporting file upload (CSV), entity persistence, and stateless authentication.
- Frontend: Must be a modern SPA (React, Vue, or equivalent), consuming the REST API and providing interactive data visualizations.
- File upload: Must support large CSV files, with progress feedback and error handling.
- Data model: Must support multiple banks, bank accounts, transfers, labels, and statistics.
- Visualization: Must provide clear, actionable insights (charts, tables, filters) for end users.
- Performance: Must handle at least 10,000 transfers per import with <2s API response time for main queries.

## Section 3: Workflow and Quality Gates
- All changes must be peer-reviewed and pass automated CI checks (lint, static analysis, tests).
- All API changes must be documented (OpenAPI/Swagger).
- All user-facing features must be demoed in the SPA before release.
- All data migrations must be reversible and tested.

## Governance Rules
- Amendments to this constitution require consensus of the core maintainers and must be versioned.
- The constitution must be reviewed at least annually or after any major architectural change.
- Compliance with the constitution is mandatory for all contributors.

