# Feature Specification: Action Bar Improvements & Advanced Filtering

**Feature Branch**: `009-action-bar-improvements`  
**Created**: March 17, 2026  
**Status**: Draft  
**Input**: User description: "Action bar improvements, advanced filtering, multi-select actions, refund/parent transfer logic, group by and graph pages, and all UI/UX details described in TODO. Covers frontend and backend requirements as listed in the TODO file."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enhanced Action Bar & Filtering (Priority: P1)

As a user, I want to filter and search transfers using an improved action bar (with search, date range, and label filters) on all relevant pages, so I can quickly find and analyze specific transactions.

**Why this priority**: Filtering and searching are core to user productivity and data analysis.

**Independent Test**: Can be fully tested by applying filters and verifying the displayed transfers and totals update accordingly.

**Acceptance Scenarios**:

1. **Given** the transfer list page, **When** the user applies a search, date range, or label filter, **Then** only matching transfers are shown and totals update.
2. **Given** the bank account or label detail page, **When** filters are applied, **Then** only linked/filtered transfers are shown and totals update.
3. **Given** the bank account list page, **When** filters are applied, **Then** the total amount per account updates based on filtered transfers.

---

### User Story 2 - Multi-Select & Bulk Actions (Priority: P2)

As a user, I want to select multiple transfers and perform bulk actions (apply/remove label, mark as refund/parent), so I can efficiently manage and categorize transactions.

**Why this priority**: Bulk actions save time and reduce repetitive work for users managing many transfers.

**Independent Test**: Can be fully tested by selecting multiple transfers and performing each bulk action, verifying results.

**Acceptance Scenarios**:

1. **Given** the transfer list, **When** the user multi-selects transfers and applies/removes a label, **Then** the labels are updated for all selected transfers.
2. **Given** the transfer list, **When** the user marks transfers as refunds of another transfer, **Then** the parent/child relationship is stored and displayed (with indented/collapsible UI).

---

### User Story 3 - Group By & Graphical Analysis (Priority: P3)

As a user, I want to group transfers by period or label and visualize the results in an interactive graph, so I can analyze trends and drill down into details.

**Why this priority**: Grouping and visualization provide insights and support decision-making.

**Independent Test**: Can be fully tested by grouping data, viewing the graph, and clicking on graph elements to filter the list view.

**Acceptance Scenarios**:

1. **Given** the group by page, **When** the user selects grouping options (period/label, relative/absolute), **Then** the overview updates with correct totals.
2. **Given** the graph page, **When** the user interacts with the graph (e.g., clicks a bar), **Then** the list view opens with filters applied for that period/label.

---

### Edge Cases

- What happens if no transfers match the applied filters? (Show empty state, no errors)
- How does the system handle overlapping date ranges or invalid filter combinations? (Disable or warn)
- What if a refund transfer is deleted or its parent is missing? (UI should handle gracefully, e.g., show as orphaned)
- How are totals calculated if transfers are partially filtered by multiple criteria?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an action bar with search, date range picker, and multi-label filter on transfer list, bank account detail, label detail, and bank account list pages.
- **FR-002**: System MUST update displayed transfers and total amounts in real time as filters are applied.
- **FR-003**: System MUST allow multi-select of transfers and support bulk actions: apply label, remove label, mark as refund of another transfer.
- **FR-004**: System MUST store and display parent/child (refund) relationships, with indented/collapsible UI in the transfer list.
- **FR-005**: System MUST update parent transfer amounts to reflect associated refunds.
- **FR-006**: System MUST provide a group by page to group transfers by period (month, quarter, year; relative/absolute) and by label, with selectable filters.
- **FR-007**: System MUST provide a graph page visualizing grouped data, with interactive elements to filter the list view.
- **FR-008**: System MUST ensure all UI/UX improvements described in the TODO are implemented (e.g., moving import button, updating totals, consistent action bar across pages).
- **FR-009**: System MUST handle edge cases gracefully (empty results, invalid filters, orphaned refunds).

### Key Entities

- **Transfer**: Represents a financial transaction. Attributes: amount, date, reference, labels, parent (optional, for refunds), children (refunds).
- **Label**: Represents a category/tag for transfers. Attributes: name, color, associated transfers.
- **Bank Account**: Represents a user's bank account. Attributes: name, balance, associated transfers.
- **GroupByResult**: Represents grouped transfer data for a period/label. Attributes: period, label, total amount, transfer count.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can filter and find specific transfers in under 5 seconds on all relevant pages.
- **SC-002**: Bulk actions (apply/remove label, mark as refund) can be completed for 20+ transfers in a single operation.
- **SC-003**: Group by and graph pages load and update results in under 2 seconds for up to 10,000 transfers.
- **SC-004**: 90% of users report satisfaction with the new filtering, grouping, and bulk action features in user testing.
- **SC-005**: No critical errors or data inconsistencies occur when handling edge cases (empty results, invalid filters, orphaned refunds).

### Assumptions

- All pages referenced already exist and support extension.
- Standard date picker and multi-select UI patterns are acceptable unless otherwise specified.
- Refund/parent logic applies only to transfers within the same account unless clarified otherwise.
- Group by periods default to year+absolute unless user changes.
- Graphs are bar or line charts unless otherwise specified.
