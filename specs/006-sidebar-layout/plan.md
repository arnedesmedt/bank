# Implementation Plan: Sidebar Layout & Bank Account Management Improvements

**Branch**: `006-sidebar-layout` | **Date**: 2026-03-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-sidebar-layout/spec.md`

## Summary

Implement a modern, accessible sidebar layout and improved bank account management for the SPA. Incrementally refactor navigation from top tab bar to a left sidebar (collapsible, always accessible, icons always visible, responsive). Add a combined bank account detail/edit page, improve error/empty states, color amounts, and fix label-transfer sync bug. All changes must be accessible, performant, and integrate with the existing Symfony/API Platform backend and React/Tailwind frontend.

## Technical Context

**Language/Version**: PHP 8.4+/8.5 (backend), React 19 + TypeScript (frontend)  
**Primary Dependencies**: Symfony 8, API Platform 3, Doctrine ORM, React 19, Vite, TailwindCSS  
**Storage**: PostgreSQL (via Doctrine ORM)  
**Testing**: PHPUnit, PHPStan, PHPCS, PHPMD, Rector, GrumPHP (backend); Vitest, React Testing Library, Prettier, ESLint (frontend)  
**Target Platform**: Linux server (Dockerized backend), modern browsers (SPA)  
**Project Type**: Web application (SPA + REST API)  
**Performance Goals**: <2s API response for main queries, responsive UI, instant navigation  
**Constraints**: REST/JSON only, strict separation of frontend/backend, accessibility, mobile responsiveness, code quality gates, security (OWASP), data integrity, test coverage  
**Scale/Scope**: Multi-user, multi-bank, scalable to 10k+ users, 50+ screens, extensible for new features

## Constitution Check

- Separation of concerns (SPA + REST API, HTTP/JSON only)
- Data integrity/idempotency (no duplicate records, correct label-transfer sync)
- Extensibility/maintainability (modular, testable, clear domain logic)
- Quality/testability (automated tests, code standards, CI/CD)
- Security/privacy (OWASP, secure data handling)
- Documentation (API docs, user-facing features demoed before release)
- All changes peer-reviewed, migrations reversible

**No violations detected.**

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
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
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

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
