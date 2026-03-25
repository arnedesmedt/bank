# Research: 010-refund-linking-improvements

## Unknowns & Clarifications

### 1. Handling legacy transfers with no `amount_before_refund`
- **Decision**: Default `amount_before_refund` to the current `amount` for all existing transfers during migration.
- **Rationale**: Ensures backward compatibility and preserves original data for all records.
- **Alternatives considered**: Null value (would complicate logic and UI), custom migration script (unnecessary complexity).

### 2. Restricting refund linking (account/date/type)
- **Decision**: Restrict refund linking to transfers within the same account. No restriction on date/type unless specified by business logic.
- **Rationale**: Prevents cross-account inconsistencies; matches typical banking workflows.
- **Alternatives considered**: Allow cross-account linking (risk of confusion), restrict by date/type (no clear requirement).

### 3. UI/UX design for "Link Refunds" action panel
- **Decision**: Use a modal or side panel to select refund transfers after clicking "Link Refunds" in the action bar. Show only eligible (unlinked, same account) transfers.
- **Rationale**: Consistent with existing UI patterns; minimizes user error.
- **Alternatives considered**: Inline selection (clutters UI), multi-step wizard (overkill for this use case).

### 4. API behavior when sum(refunds) > original amount
- **Decision**: API will prevent linking if the sum of refunds exceeds the original amount. UI will show a warning and block the action.
- **Rationale**: Prevents negative balances and data inconsistencies.
- **Alternatives considered**: Allow with warning (risk of data errors), allow and auto-adjust (not user-friendly).

### 5. Migration plan for existing refund links
- **Decision**: Migration will set `amount_before_refund` for all transfers. Existing parent/child links are preserved. No destructive changes.
- **Rationale**: Ensures backward compatibility and data integrity.
- **Alternatives considered**: Remove all links and require relinking (user disruption).

## Best Practices

### Doctrine Migrations
- Always provide a reversible `down()` method.
- Use default values for new columns to avoid nulls in legacy data.
- Test migration on a copy of production data.

### API Platform
- Expose new fields (`amount_before_refund`, parent/child) in API resources.
- Document all changes in OpenAPI/Swagger.

### React SPA
- Use controlled selection state for refund linking.
- Group child refunds under parent in an accordion/collapsible UI.
- Prevent invalid actions in the UI (disable or warn).

### Edge Case Handling
- Orphaned refunds: show as unlinked in UI, allow relinking.
- Duplicate linking: prevent in both UI and backend.
- Deletion: if parent is deleted, children become orphans.

---

All clarifications resolved. Proceed to data model and contract design.

