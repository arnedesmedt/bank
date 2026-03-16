# Research for 007-transfer-page-routing

## Unknowns and Clarifications

### 1. Responsive breakpoints for import panel
- Decision: Use existing design system breakpoints (Tailwind default: `md` for 768px).
- Rationale: Consistency with rest of app, maintainable, and predictable.
- Alternatives: Custom breakpoints (rejected for consistency).

### 2. Routing library and approach (frontend)
- Decision: Use React Router v6 (assumed already in use; if not, add).
- Rationale: Industry standard, supports nested routes, URL persistence, and guards.
- Alternatives: Next.js routing (not SPA), custom router (unnecessary complexity).

### 3. Error handling for non-existent/unauthorized detail pages
- Decision: Show user-friendly error page (404/403) with actionable message and link back.
- Rationale: Good UX, prevents confusion, aligns with constitution.
- Alternatives: Silent redirect to home (rejected: confusing).

### 4. Import panel behavior on dynamic resize
- Decision: Listen to window resize and update panel layout responsively.
- Rationale: Ensures correct behavior if user resizes after load.
- Alternatives: Only set on initial load (rejected: not robust).

### 5. Backend label sync logic
- Decision: On label update/remove, trigger async job to update all related transactions within 1 minute.
- Rationale: Scalable, meets spec, avoids blocking UI.
- Alternatives: Synchronous update (may block), eventual consistency >1min (rejected: spec violation).

### 6. CSV import error handling
- Decision: Validate CSV on upload, deduplicate, show actionable errors (malformed, duplicate, etc.).
- Rationale: Data integrity, user trust, aligns with constitution.
- Alternatives: Silent fail (rejected: poor UX).

## Best Practices
- Use ARIA roles and keyboard navigation for import panel and error pages (accessibility).
- Use optimistic UI for navigation, loading spinners for async actions.
- Test with Vitest (frontend) and PHPUnit (backend).
- Use API Platform for REST endpoints, Doctrine for entity updates.

## Alternatives Considered
- Custom routing, custom breakpoints, synchronous backend updates, silent error handling—all rejected for maintainability, UX, or scalability reasons.

