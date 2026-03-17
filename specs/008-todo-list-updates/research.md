# Research: Todo List UI & Backend Updates

## Phase 0: Research Tasks

### Unknowns/Clarifications
- Notification system implementation details (frontend): How are notifications currently handled? Is there a notification context or component, or does it need to be created from scratch?
- Action bar: Is there an existing action bar or should it be a new component? How should it interact with page scroll and visibility logic?
- CSV import: How is the import button currently implemented? What changes are needed to move it to the action bar?
- Label/Transfer detail pages: Are there existing detail page components, or do they need to be created? What data is required for each?
- Preventing bank account deletion: What is the current API contract for bank account deletion? What changes are needed in both frontend and backend?

### Best Practices
- Floating notifications: Best practices for stacking, auto-dismiss, and accessibility in React SPAs.
- Action bar: Best practices for context-sensitive action bars in modern UIs.
- API endpoint deprecation: Best practices for safely removing endpoints in API Platform/Symfony.

### Integration Patterns
- Frontend-backend contract for label/transfer detail pages.
- Notification system integration with async actions (e.g., CSV import).

## Research Tasks

1. Research notification system implementation for React SPA (floating, stackable, auto-dismiss, accessible).
2. Research action bar patterns for React (context-sensitive, scroll behavior, show/hide logic).
3. Research how to move CSV import to action bar and update notification triggers.
4. Research requirements and data contracts for label and transfer detail pages (frontend and backend).
5. Research how to block bank account deletion in both frontend (UI) and backend (API Platform/Symfony).
6. Research best practices for API endpoint removal/deprecation in Symfony API Platform.
7. Research frontend-backend contract for label/transfer detail pages (data shape, endpoints).
8. Research notification system integration with async actions (e.g., CSV import, label edit/delete).

## Consolidated Findings

- [To be filled after research agents complete their tasks.]

## Decision Log

- [To be filled after research agents complete their tasks.]

## Alternatives Considered

- [To be filled after research agents complete their tasks.]

