# Feature Specification: CSV Import Transfers

**Feature Branch**: `001-csv-import-transfers`  
**Created**: February 24, 2026  
**Status**: Draft  
**First Supported Bank**: Belfius

---

## Belfius CSV Clarifications

- **CSV Format**: Belfius CSVs use semicolon (;) as delimiter, UTF-8 encoding. Columns: Date (DD/MM/YYYY), Amount, Currency, From Account, To Account, Reference, Transaction ID.
- **Idempotency**: Transfers are uniquely identified by Transaction ID if present; otherwise, by composite fingerprint (Date + Amount + From Account + To Account + Reference).
- **Labeling**: Pre-configured regexes for common references (e.g., "CARREFOUR", "DELHAIZE" for groceries). Bank accounts can be linked to labels for auto-labeling. Reference field is scanned for regex matches.
- **Parent Label Handling**: Parent labels are auto-linked whenever a child label is applied, both for manual and automatic labeling.
- **Internal Transfers**: Identified by both From and To Account belonging to the user, or reference containing "INTERNAL TRANSFER".

# Feature Specification: CSV Import Transfers

**Feature Branch**: `001-csv-import-transfers`  
**Created**: February 24, 2026  
**Status**: Draft  
**Input**: User description: "Import CSV files containing transfers from personal bank accounts, supporting multiple bank formats. Transfers are persisted; uploads are idempotent (no duplicate transfers). Bank accounts are saved in a separate table and linked to transfers via 'from' and 'to' properties. Transfers can be labeled; labels can have parent labels (hierarchical). If a child label is linked, parent label is automatically linked. Labels group transfers for comparison and statistics over periods. Labels can be linked to bank accounts and regexes for automatic labeling. New transfers are auto-labeled based on bank accounts or reference regexes. Graphs: Circle diagrams for parent labels, bar charts for label comparison over periods (months, quarters, years). Max values/percentages per label for a period (e.g., 10% of income or 5000 euro for travel per year). Internal transfers between own accounts are persisted but excluded from statistics/labeling. Authentication is required. Easy step debugging is required. Frontend: Collapsible left sidebar with menu items; bottom sign-in/sign-out icon; topbar with back button, title, description, custom action buttons (e.g., import CSV). Transfer page: Paginated, sortable, filterable list; action buttons for manual labeling. Bank account page: Similar features. Label page: Set max values/percentages, visualize remaining amount for period. Statistics page: Select date range and labels, visualize in graphs. Ensure the specification is clear, actionable, and covers all described requirements."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Import Transfers (Priority: P1)

A user uploads a CSV file containing transfers from their personal bank account. The system parses the file, supports multiple bank formats (first: Belfius), and persists transfers without duplicates. Transfers are linked to bank accounts and auto-labeled based on account or reference regexes.

**Why this priority**: Enables core functionality for tracking and analyzing personal finances.

**Independent Test**: Upload a CSV file; verify transfers are imported, no duplicates, and auto-labeled.

**Acceptance Scenarios**:

1. **Given** a valid CSV file from a supported bank, **When** the user uploads it, **Then** all transfers are imported and linked to the correct accounts.
2. **Given** a CSV file with previously imported transfers, **When** the user uploads it again, **Then** no duplicate transfers are created.
3. **Given** a transfer matching a regex or bank account, **When** imported, **Then** it is auto-labeled accordingly.

**Belfius-specific Acceptance Scenarios**:
- Given a Belfius CSV file with Transaction ID, the system uses Transaction ID for idempotency.
- Given a Belfius CSV file without Transaction ID, the system uses composite fingerprint for idempotency.
- Given a Belfius CSV file, the system parses semicolon-delimited, UTF-8 encoded rows with DD/MM/YYYY date format.
- Given a transfer with reference matching a pre-configured regex, the label is auto-applied.
- Given a transfer between two user-owned Belfius accounts, the transfer is excluded from statistics and labeling.

---

### User Story 2 - Manage Labels (Priority: P2)

A user creates and manages labels, including hierarchical parent-child relationships. When a child label is linked to a transfer, the parent label is automatically linked. Labels can be associated with bank accounts and regexes for auto-labeling.

**Why this priority**: Enables organization and categorization of transfers for meaningful statistics.

**Independent Test**: Create labels, set parent-child relationships, link labels to transfers, verify auto-linking and auto-labeling.

**Acceptance Scenarios**:

1. **Given** a child label linked to a transfer, **When** saved, **Then** the parent label is also linked.
2. **Given** a label linked to a regex or bank account, **When** a matching transfer is imported, **Then** the label is auto-applied.

---

### User Story 3 - View Statistics & Graphs (Priority: P3)

A user selects date ranges and labels to view statistics and comparisons in circle diagrams and bar charts. Max values/percentages per label for a period are visualized, including remaining amounts.

**Why this priority**: Provides insights into spending and budgeting, supporting financial goals.

**Independent Test**: Select date range and labels; verify graphs display correct statistics and max values.

**Acceptance Scenarios**:

1. **Given** a set of labeled transfers, **When** viewing statistics for a period, **Then** graphs show correct totals and remaining amounts.
2. **Given** max values/percentages set for a label, **When** viewing statistics, **Then** remaining budget is visualized.

---

### Edge Cases

- What happens if a CSV file contains unsupported bank format? System rejects the file with an error message.
- How does system handle internal transfers between own accounts? Should be excluded from statistics and labeling by default. For Belfius, internal transfers are identified by both From and To Account belonging to the user, or reference containing "INTERNAL TRANSFER".
- What if a transfer matches multiple regexes or bank accounts for auto-labeling? A transfer can have multiple labels; all matching labels are applied. For Belfius, reference field is scanned for regexes and bank account matches.
- What if Transaction ID is missing in Belfius CSV? Use composite fingerprint for idempotency.
- What if CSV uses unexpected delimiter or encoding? System rejects with clear error message.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to import CSV files containing transfers from personal bank accounts, supporting multiple bank formats (first: Belfius, semicolon-delimited, UTF-8, DD/MM/YYYY date format).
- **FR-002**: System MUST persist transfers and ensure uploads are idempotent (no duplicate transfers). For Belfius, use Transaction ID if present, otherwise composite fingerprint.
- **FR-007**: System MUST allow labels to be linked to bank accounts and regexes for automatic labeling. For Belfius, pre-configured regexes are used for common references.
- **FR-011**: System MUST persist internal transfers between own accounts but exclude them from statistics and labeling. For Belfius, internal transfers are identified by both From and To Account belonging to the user, or reference containing "INTERNAL TRANSFER".

### Key Entities

- **Bank Account**: Represents a user's personal bank account. Attributes: account name, account number, linked labels, linked regexes.
- **Transfer**: Represents a financial transfer. Attributes: amount, date, from account, to account, labels, reference, CSV source.
- **Label**: Represents a category for transfers. Attributes: name, parent label, linked bank accounts, linked regexes, max value/percentage, period.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can import CSV files and see transfers in the system within 2 minutes.
- **SC-002**: No duplicate transfers are created from repeated uploads.
- **SC-003**: 95% of transfers are auto-labeled correctly based on bank accounts or regexes.
- **SC-004**: Users can view statistics and graphs for selected labels and periods.
- **SC-005**: Users can set max values/percentages for labels and visualize remaining budget.
- **SC-006**: Internal transfers are excluded from statistics and labeling.
- **SC-007**: Authentication prevents unauthorized access.
- **SC-008**: Users can debug import steps easily and resolve issues.
- **SC-009**: User satisfaction: 90% of users successfully import and label transfers on first attempt.

### Assumptions

- Standard CSV formats for major banks are supported; custom mapping may be required for unsupported formats. Belfius is the first supported bank, with semicolon delimiter, UTF-8 encoding, DD/MM/YYYY date format, and Transaction ID column.
- Internal transfers are identified by matching 'from' and 'to' accounts belonging to the user, or reference containing "INTERNAL TRANSFER" for Belfius.
- If a transfer matches multiple regexes or accounts, all relevant labels are applied unless clarified otherwise. For Belfius, reference field is scanned for regexes and bank account matches.
- Authentication uses standard session-based login.
- Easy step debugging means users can see import steps and errors clearly.
