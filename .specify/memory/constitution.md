<!--
Sync Impact Report
Version change: N/A → 1.0.0
Modified principles: (all added)
Added sections: Core Principles, Architecture & Security Constraints, Development Workflow & Quality Gates, Governance
Templates requiring updates:
- .specify/templates/plan-template.md ✅
- .specify/templates/spec-template.md ✅
- .specify/templates/tasks-template.md ✅
Follow-up TODOs:
- TODO(RATIFICATION_DATE): Original ratification date unknown, must be set by project owner.
-->

# Bank Application Constitution

## Core Principles

### I. Separation of Concerns (Frontend/Backend)
All user-facing functionality is implemented in a single-page application (SPA) frontend, which communicates exclusively with a REST API backend. No business logic is duplicated between layers. File upload, data processing, and visualization responsibilities are clearly separated.

**Rationale**: Ensures maintainability, testability, and scalability by enforcing clear boundaries and responsibilities.

### II. Input Integrity & Deduplication
All uploaded CSV files are validated for format and content. The backend MUST deduplicate transfers and bank accounts before persisting. No duplicate transactions or accounts are allowed in the system.

**Rationale**: Prevents data corruption and ensures accurate analytics.

### III. Testability & Quality Gates (NON-NEGOTIABLE)
All code (frontend and backend) MUST be covered by automated tests: unit, integration, and end-to-end. No feature is considered complete without passing tests for all acceptance criteria. Red-Green-Refactor cycle is enforced. Linting and static analysis tools MUST be integrated into the CI/CD pipeline, and all issues must be resolved before merge. Before commiting, grumphp MUST be run to ensure all tests pass and code quality standards are met.

**Rationale**: Guarantees reliability and enables safe refactoring and extensibility.

### IV. Extensibility & Modularity
The system MUST be designed for easy addition of new banks, file formats, and analytics features. All modules/components are independently testable and documented. No hardcoded bank-specific logic in core processing.

**Rationale**: Supports future growth and adaptation to new requirements.

### V. Observability & Traceability
All critical operations (file upload, processing, deduplication, analytics) MUST be logged with structured, queryable logs. Errors and anomalies are surfaced to both users (in the frontend) and operators (in the backend) with actionable diagnostics.

**Rationale**: Enables rapid debugging, compliance, and operational excellence.

## Architecture & Security Constraints

- Technology stack: Modern SPA framework (e.g., React, Vue, Svelte) for frontend; RESTful API backend (e.g., Node.js/Express, Python/FastAPI, or equivalent).
- Data storage: Use a relational database (e.g., PostgreSQL) for persistence of accounts and transfers.
- Security: All file uploads and API endpoints require authentication and input validation. Sensitive data is encrypted at rest and in transit.
- Performance: System must support concurrent uploads and analytics for at least 1000 users with <1s p95 response time for core operations.
- Compliance: Adhere to relevant data protection regulations (e.g., GDPR) for all user/account data.

## Development Workflow & Quality Gates

- All changes require code review by at least one other contributor.
- CI/CD pipeline MUST enforce passing tests, linting, and static analysis before merge.
- Feature branches are required for all new features, bugfixes and specifications; direct commits to main are prohibited.
- All user stories and acceptance criteria must be independently testable and demonstrable.
- Documentation (user and developer) must be updated with each relevant change.
- New specifications MUST start a new branch from main with a unique prefix number (check the already existing folders in the specs folder in the root of this project).

## Governance

- This constitution supersedes all other project practices and policies.
- Amendments require documentation, approval by majority of maintainers, and a migration plan if breaking.
- All PRs and reviews must verify compliance with the constitution and principles above.
- Versioning follows semantic versioning: MAJOR for breaking/removal, MINOR for new/expanded principles, PATCH for clarifications.
- Compliance reviews are conducted quarterly or upon major release.
- TODO(RATIFICATION_DATE): Original ratification date must be set by project owner.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE) | **Last Amended**: 2026-02-24
