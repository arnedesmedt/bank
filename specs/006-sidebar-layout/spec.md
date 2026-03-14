# Feature Specification: Sidebar Layout & Bank Account Management Improvements

**Feature Branch**: `006-sidebar-layout`  
**Created**: March 14, 2026  
**Status**: Draft  
**Input**: User description: "Frontend: Move the pages from the top of the page to a left sidebar. Sidebar should be collapsible, always accessible, with icons always visible (even when collapsed), and responsive for all device sizes. Hamburger menu for expand/collapse. Sidebar does not scroll with page. Icons for each page. The top bar should be reserved for a back button (navigation), page title (left), and quick actions (right, e.g., search bar, user profile menu). Cleaner, more organized layout. Add a bank account detail page with overview of all linked bank accounts. Click to see details (transaction history, balance), and manage (edit, delete, add). Consider combining detail and edit page. Color positive amounts green and negative amounts red. Bug: Remove extra padding around the bank account table on the collection page. Backend: Bug: When bank accounts are linked to labels, transfers are not updated to check if new labels should be added or removed if the link is deleted. Fix this so transfers are updated accordingly."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navigate with Sidebar (Priority: P1)

As a user, I want to navigate between pages using a left sidebar that is always accessible, collapsible, and shows icons for each page, so I can quickly access all main features regardless of device size.

**Why this priority**: Navigation is a core part of the user experience and impacts all users on every visit.

**Independent Test**: Can be fully tested by logging in and navigating between all main pages using the sidebar on desktop and mobile devices.

**Acceptance Scenarios**:

1. **Given** the user is on any page, **When** the sidebar is collapsed, **Then** icons remain visible and navigation is possible.
2. **Given** the user is on any page, **When** the sidebar is expanded, **Then** all page names and icons are visible and navigation is possible.
3. **Given** the user is on a mobile device, **When** the hamburger menu is tapped, **Then** the sidebar expands/collapses responsively.
4. **Given** the user scrolls the main content, **When** the sidebar is visible, **Then** the sidebar does not scroll with the page content.

---

### User Story 2 - Top Bar Quick Actions (Priority: P2)

As a user, I want the top bar to provide a back button, page title, and quick actions (such as search and user profile menu), so I can easily navigate and access important actions without clutter.

**Why this priority**: A clean, organized top bar improves usability and reduces confusion, especially on smaller screens.

**Independent Test**: Can be fully tested by viewing the top bar on all pages and verifying the presence and function of navigation, title, and quick actions.

**Acceptance Scenarios**:

1. **Given** the user is on any page, **When** viewing the top bar, **Then** the back button, page title, and quick actions are present and functional.
2. **Given** the user is on a detail page, **When** the back button is pressed, **Then** the user returns to the previous page.

---

### User Story 3 - Manage Bank Accounts (Priority: P3)

As a user, I want to view a list of all my linked bank accounts, click to see details (including transaction history and balance), and manage them (edit, delete, add), so I can keep my account information up to date and review my finances.

**Why this priority**: Managing bank accounts is a key feature for users to control their financial data.

**Independent Test**: Can be fully tested by adding, editing, deleting, and viewing bank accounts and their details.

**Acceptance Scenarios**:

1. **Given** the user is on the bank accounts page, **When** clicking an account, **Then** the detail page shows transaction history and balance.
2. **Given** the user is on the detail page, **When** editing or deleting the account, **Then** changes are reflected in the overview.
3. **Given** the user is on the bank accounts page, **When** adding a new account, **Then** the new account appears in the list.

---

### User Story 4 - Visual Feedback for Amounts (Priority: P4)

As a user, I want positive amounts to be colored green and negative amounts red, so I can quickly distinguish credits from debits.

**Why this priority**: Visual cues improve data comprehension and reduce errors.

**Independent Test**: Can be fully tested by viewing transactions with both positive and negative amounts.

**Acceptance Scenarios**:

1. **Given** the user views a transaction list, **When** amounts are positive, **Then** they are colored green.
2. **Given** the user views a transaction list, **When** amounts are negative, **Then** they are colored red.

---

### User Story 5 - Remove Extra Padding (Priority: P5)

As a user, I want the bank account table on the collection page to have consistent padding, so the layout looks clean and professional.

**Why this priority**: Consistent spacing improves visual appeal and usability.

**Independent Test**: Can be fully tested by viewing the bank account table and verifying padding matches design guidelines.

**Acceptance Scenarios**:

1. **Given** the user views the bank account table, **When** the page loads, **Then** there is no extra padding around the table.

---

### User Story 6 - Label-Transfer Sync Bugfix (Priority: P6)

As an admin or user, when a bank account is unlinked from a label, I want all related transfers to update their labels accordingly, so that label associations remain accurate.

**Why this priority**: Ensures data integrity and prevents misleading reporting.

**Independent Test**: Can be fully tested by linking/unlinking accounts and verifying transfer labels update as expected.

**Acceptance Scenarios**:

1. **Given** a bank account is linked to a label, **When** the link is removed, **Then** all related transfers update their labels accordingly.
2. **Given** a transfer is no longer associated with a label due to account unlinking, **When** viewing transfer details, **Then** the label is not shown.

---

### Edge Cases

- What happens when the sidebar is collapsed on a very small screen? (Should remain usable and icons visible)
- How does the system handle a user with no linked bank accounts? (Show empty state with add option)
- What if a transfer is associated with multiple labels and one is removed? (Only the removed label should be unlinked)
- How does the system handle a failed attempt to edit or delete a bank account? (Show error message and do not apply changes)
- What if a user tries to add a bank account with missing or invalid data? (Show validation errors)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a left sidebar for navigation that is always accessible, collapsible, and responsive for all device sizes.
- **FR-002**: Sidebar MUST display icons for each page, visible even when collapsed.
- **FR-003**: Sidebar MUST include a hamburger menu for expand/collapse on all devices.
- **FR-004**: Sidebar MUST remain fixed and not scroll with the main content.
- **FR-005**: System MUST provide a top bar with a back button, page title (left), and quick actions (right: search, user profile menu).
- **FR-006**: System MUST provide a bank account detail page showing all linked accounts, with ability to view details (transaction history, balance) and manage (edit, delete, add) accounts. [NEEDS CLARIFICATION: Should edit and detail be combined in a single page or separate?]
- **FR-007**: System MUST color positive amounts green and negative amounts red in all relevant tables and lists.
- **FR-008**: System MUST remove extra padding around the bank account table on the collection page.
- **FR-009**: When a bank account is unlinked from a label, all related transfers MUST update their labels accordingly.

### Key Entities

- **Sidebar**: Navigation component, attributes: expanded/collapsed state, list of pages, icons, responsive behavior.
- **Top Bar**: UI component, attributes: back button, page title, quick actions (search, user profile menu).
- **Bank Account**: Represents a user's linked bank account, attributes: account name, balance, transaction history, labels.
- **Transfer**: Represents a financial transaction, attributes: amount, date, associated labels, account.
- **Label**: Tag or category for organizing accounts and transfers, attributes: name, linked accounts, linked transfers.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of users can navigate between all main pages using the sidebar on both desktop and mobile without confusion.
- **SC-002**: 90% of users report the top bar is clear and easy to use for navigation and quick actions.
- **SC-003**: 100% of bank account management actions (add, edit, delete, view) are available and function as described.
- **SC-004**: Positive and negative amounts are visually distinct in all transaction lists (green/red) in 100% of cases.
- **SC-005**: No extra padding is present around the bank account table on the collection page in 100% of tested layouts.
- **SC-006**: When a bank account is unlinked from a label, all related transfers update their labels within 1 minute.

### Assumptions

- Sidebar and top bar design will follow modern web app UX standards for accessibility and responsiveness.
- Users have permission to manage their own bank accounts; admin users can manage all accounts.
- Combining detail and edit pages is a common pattern, but may require confirmation from stakeholders.
- Label-transfer sync applies to both manual and automated label associations.
