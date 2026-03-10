# Research: Add List Pages

## Decision 1: API Endpoints for Bank Accounts and Labels
- **Decision**: Use `/api/bank-accounts` and `/api/labels` endpoints (GET) from Symfony API Platform.
- **Rationale**: API Platform exposes RESTful endpoints for entities; consistent with csv import transfers.
- **Alternatives considered**: Custom endpoints, GraphQL, direct DB access (rejected for separation of concerns).

## Decision 2: Data Shape for Bank Accounts and Labels
- **Decision**: Bank Account: `{ id, name, accountNumber, balance }`; Label: `{ id, name, regex }`.
- **Rationale**: Matches entity definitions in csv import spec and API Platform conventions.
- **Alternatives considered**: Including linked transfers/labels, but out of scope for minimal list pages.

## Decision 3: Error/Empty State UI Conventions
- **Decision**: Show "No bank accounts found" or "No labels found" for empty state; "Failed to load data" for error state.
- **Rationale**: Clear, actionable, minimal UI; matches spec requirements.
- **Alternatives considered**: Custom graphics, retry buttons (rejected for minimal UI constraint).

## Decision 4: API Client Choice
- **Decision**: Use Fetch API for simplicity and minimal dependencies.
- **Rationale**: No advanced features needed; Fetch is native and sufficient.
- **Alternatives considered**: Axios (rejected for minimalism).

## Decision 5: Test Coverage Requirements
- **Decision**: Use Vitest and React Testing Library; test rendering, empty/error states, and API integration.
- **Rationale**: Matches frontend stack and constitution quality gates.
- **Alternatives considered**: Cypress for E2E (not required for minimal list pages).

## Best Practices
- Use React functional components, hooks for data fetching.
- Handle loading, error, and empty states explicitly.
- Use React Router for navigation.
- Reference csv import transfers for provenance.

## Integration Patterns
- Fetch data from backend, display in simple list.
- No interaction, editing, filtering, or sorting.
- Minimal UI, clear separation of concerns.

## All NEEDS CLARIFICATION resolved.

