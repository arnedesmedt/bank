# Implementation Plan: Todo List UI & Backend Updates

**Branch**: `008-todo-list-updates` | **Date**: 2026-03-16 | **Spec**: [specs/008-todo-list-updates/spec.md]
**Input**: Feature specification from `/specs/008-todo-list-updates/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

This feature delivers a unified action bar and floating notification system in the frontend, label and transfer detail pages, and blocks bank account deletion in both frontend and backend. The approach leverages the existing React + TypeScript SPA and Symfony API Platform backend, updating UI components, routes, and API contracts as needed. All user stories, edge cases, and success criteria from the spec are addressed, with a focus on testability, accessibility, and data integrity.

## Technical Context

**Language/Version**: PHP 8.5 (backend), TypeScript 5.9 (frontend)  
**Primary Dependencies**: Symfony 8, API Platform 3, Doctrine ORM, React 19, Vite 7, TailwindCSS 4  
**Storage**: PostgreSQL (via Doctrine ORM)  
**Testing**: PHPUnit, PHPStan, PHPCS, PHPMD, Rector, GrumPHP (backend); Vitest, React Testing Library, Prettier, ESLint (frontend)  
**Target Platform**: Linux server (Dockerized backend), modern browsers (SPA)  
**Project Type**: Web application (SPA + REST API)  
**Performance Goals**: <2s API response for main queries, responsive UI, instant navigation  
**Constraints**: REST/JSON only, strict separation of frontend/backend, accessibility, mobile responsiveness, code quality gates, security (OWASP), data integrity, test coverage  
**Scale/Scope**: 10k+ users, 100+ accounts/user, 10k+ transactions/user

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Separation of Concerns: SPA frontend and REST API backend, communicate via HTTP(S)/JSON only (PASS)
- Data Integrity: No duplicate records, all changes traceable, migrations reversible (PASS)
- Extensibility: New navigation, endpoints, and UI features must be easy to add (PASS)
- Quality: Automated tests (unit, integration, E2E), code review, CI/CD, PSR-12, static analysis (PASS)
- Security: API endpoints protected, sensitive data secure, OWASP Top 10 (PASS)
- Performance: Handle 10,000+ transactions/import, <2s API response (PASS)
- Documentation: All API changes documented (OpenAPI/Swagger) (PASS)
- Demo: All user-facing features demoed in SPA before release (PASS)
- Migration: All data migrations reversible and tested (PASS)

## Project Structure

### Documentation (this feature)

```text
specs/008-todo-list-updates/
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
│   ├── ApiResource/
│   ├── Controller/
│   ├── Entity/
│   ├── Repository/
│   ├── Service/
│   ├── State/
│   └── ...
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/
```

**Structure Decision**: Web application structure, using existing frontend and backend directories. New pages/components/services will be added under `frontend/src/` and `backend/src/` as appropriate for this feature.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
|           |            |                                     |
