# Research: Action Bar Improvements & Advanced Filtering

## Decision 1: Charting Library for React Graphs
- **Decision**: Use Nivo
- **Rationale**: Must support large datasets, interactive filtering, accessibility, and be actively maintained.
- **Alternatives considered**: Recharts, Chart.js, Victory, Nivo, ECharts, D3.js wrappers.

## Decision 2: Modeling Parent/Child (Refund) Relationships
- **Decision**: Add a parent transfer property to the transfer entity. And update the amount of the parent transfer based on the linked child refund transfers
- **Rationale**: Must support linking transfers as refunds, allow for orphaned children, and be queryable for grouping and totals.
- **Alternatives considered**: Self-referencing foreign key, join table, denormalized field.

## Decision 3: API Design for Bulk Actions & Multi-Select
- **Decision**: Bulk actions only need to link transfers to labels, mark transfers as refund of another transfer, and remove labels from transfers, undo is not needed, and those actions are idempotent by default.
- **Rationale**: Must allow atomic updates to multiple transfers, support undo, and be idempotent.
- **Alternatives considered**: REST batch endpoints, PATCH with array, GraphQL mutation, command queue.

## Decision 4: UI/UX for Collapsible/Indented Refund Display
- **Decision**: Refunds won't be a big list, but will be indented and collapsible in the transfer list
- **Rationale**: Must be intuitive, accessible, and performant for large lists.
- **Alternatives considered**: Tree view, expandable rows, nested lists, virtualized lists.

## Decision 5: Handling Orphaned Refunds (UI & API)
- **Decision**: We can't delete transfers that are linked as a refund, but we can remove the refund link
- **Rationale**: Must not break UI, must allow for data repair, must not throw errors on missing parent.
- **Alternatives considered**: Show as orphaned, hide, allow reassignment, error state.

## Decision 6: API Contract for Group By/Graph Endpoints
- **Decision**: Server side aggregation, GET endpoints with query parameters to select the period, labels, absolute/relative, and return data suitable for graphing.
- **Rationale**: Must be efficient, support flexible grouping, and return data suitable for graphing.
- **Alternatives considered**: REST endpoints with query params, GraphQL, server-side aggregation, client-side aggregation.

## Best Practices: Symfony REST API for Bulk Actions & Filtering
- **Summary**: Use PATCH endpoints for batch updates, validate all input, return updated entities, ensure idempotency, document with OpenAPI.

## Best Practices: React State for Multi-Select & Bulk Actions
- **Summary**: Use local state or context for selection, debounce updates, show progress/undo, keep UI responsive for large lists.

## Best Practices: Efficient Filtering/Grouping in SQL/Doctrine
- **Summary**: Use indexed columns, server-side filtering/grouping, pagination, avoid N+1 queries, cache results if needed.

---

**All NEEDS CLARIFICATION items must be resolved before proceeding to Phase 1.**

