# Research: Sidebar Layout & Bank Account Management Improvements

## 1. Should bank account detail and edit be combined in a single page or separate?

- **Decision**: Combine detail and edit in a single page with view/edit modes (inline or tabbed)
- **Rationale**: Modern banking and finance apps (e.g., Revolut, Monzo, N26) typically use a single page for account details, with an "Edit" button that toggles editable fields inline or opens a modal. This reduces navigation friction and keeps context for the user. Accessibility and mobile UX are improved by minimizing page transitions.
- **Alternatives considered**: Separate detail and edit pages (requires more navigation, can be confusing on mobile, less efficient for quick edits)

## 2. Best Practices: Sidebar Navigation (React, Tailwind, Accessibility, Mobile)

- **Decision**: Use a fixed, collapsible sidebar with always-visible icons, keyboard navigation, and ARIA roles. Hamburger menu for mobile. Sidebar should not scroll with content.
- **Rationale**: Consistent with Material UI, Ant Design, and major SaaS dashboards. Ensures accessibility (tab order, ARIA), mobile usability, and visual clarity. Tailwind provides utilities for responsive/fixed layouts.
- **Alternatives considered**: Top tab bar (less scalable), hidden drawer (less discoverable on desktop)

## 3. Best Practices: Top Bar with Quick Actions

- **Decision**: Top bar contains back button (contextual), page title (left), and quick actions (right: search, user menu). Use semantic HTML and ARIA labels.
- **Rationale**: Matches modern app conventions, improves discoverability, and supports keyboard/screen reader users. Quick actions should be accessible via keyboard and have visible focus states.
- **Alternatives considered**: Floating action buttons (less discoverable for navigation), cluttered top bar (hurts usability)

## 4. Best Practices: Bank Account Management UI

- **Decision**: List page with clickable rows for detail/edit, empty state with add option, error messages for failed actions, confirmation for delete. Use modals or inline forms for add/edit.
- **Rationale**: Reduces navigation, supports undo/confirmation, and provides clear feedback. Consistent with banking/finance UX patterns.
- **Alternatives considered**: Separate add/edit pages (slower, more disruptive)

## 5. Best Practices: Data Consistency for Label-Transfer Sync

- **Decision**: On unlinking a bank account from a label, trigger a backend process to re-evaluate all affected transfers and update label associations. Use Doctrine transactions to ensure atomicity.
- **Rationale**: Prevents stale/misleading data, ensures reporting accuracy. API Platform and Doctrine support transactional updates and event-driven sync.
- **Alternatives considered**: Async/batch jobs (overkill for current scale), manual sync (error-prone)

## 6. Patterns: Error Handling and Empty States

- **Decision**: Show clear, actionable error messages for failed API calls (edit/delete/add), and empty states with call-to-action (e.g., "No accounts yet. Add one!").
- **Rationale**: Improves user trust and reduces confusion. Matches accessibility guidelines.
- **Alternatives considered**: Silent failures (bad UX), generic errors (unhelpful)

## 7. Patterns: Visual Feedback for Amounts

- **Decision**: Use green for positive, red for negative amounts. Ensure sufficient color contrast (WCAG AA), and add icons or text for colorblind users if possible.
- **Rationale**: Standard in finance apps, improves data comprehension. Tailwind supports accessible color palettes.
- **Alternatives considered**: Only color (not accessible), icons only (less clear)

## 8. Patterns: Responsive Layout

- **Decision**: Sidebar collapses to icons on small screens, hamburger menu toggles sidebar. Top bar remains fixed. Use Tailwind responsive classes and test with keyboard/screen reader.
- **Rationale**: Ensures usability on all devices, matches modern web app standards.
- **Alternatives considered**: Non-collapsible sidebar (wastes space), no hamburger menu (hurts mobile UX)

---

All "NEEDS CLARIFICATION" resolved. Best practices and patterns documented for implementation.

