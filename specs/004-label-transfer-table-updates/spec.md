
# Feature Specification: Label/Transfer Table Updates

**Feature Branch**: `004-label-transfer-table-updates`  
**Created**: March 13, 2026  
**Status**: Draft  
**Input**: User description: "Frontend: Remove the labels from home page and move the creation, editting and deleting of the labels to the label page. Move the importing of the transfers to a right vertical menu that can be collapsed and expanded on the main page where the transfers are listed. Auto update the transfers in the home 'transfer page' if the transfers are uploaded and processed. Use the table styling from the transfers also for the bank accounts and labels. Add an action column for bank accounts and labels. Add an edit button for a bank account. Also show if the bank account is internal yes or no (can be done with a sort of checkmark after the name). Add an edit page for a bank account (You are allowed to change the name). Backend: If a label is created, auto assign it to already existing transfers, based on the rules of that label (linked bank account or regex). Not only link regexes based on the reference of the transfer, but also on the account name. If a bank account is updated, check if the automated linked labels are still valid and update them accordingly. If a label is updated, check if the automated linked bank accounts are still valid and update them accordingly."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage Labels and Bank Accounts (Priority: P1)

As a user, I want to manage (create, edit, delete) labels and bank accounts from their dedicated pages, and see consistent table layouts and actions, so that I can efficiently organize my financial data.

**Why this priority**: Core to user workflow; enables clear, focused management of key entities and improves usability.

**Independent Test**: Can be fully tested by navigating to the label and bank account pages, performing create/edit/delete actions, and verifying table consistency and available actions.

**Acceptance Scenarios**:
1. **Given** the user is on the label page, **When** they create, edit, or delete a label, **Then** the label list updates accordingly and these actions are not available on the home page.
2. **Given** the user is on the bank account page, **When** they view the table, **Then** the table uses the same styling as the transfer table, includes an action column, and shows if the account is internal (with a checkmark or similar indicator).
3. **Given** the user is on the bank account page, **When** they click the edit button for a bank account, **Then** they are taken to an edit page where they can change the account name.

---

### User Story 2 - Import and Auto-Update Transfers (Priority: P2)

As a user, I want to upload files from a collapsible right vertical menu on the transfer list page. If that is done, you can remove the upload on top. The transfer list auto-updates when new transfers are uploaded and processed, so that I always see the latest data without manual refresh.

**Why this priority**: Improves efficiency and user experience by streamlining import and ensuring up-to-date information.

**Independent Test**: Can be fully tested by uploading transfers via the menu, then observing the transfer list auto-update.

**Acceptance Scenarios**:
1. **Given** the user is on the transfer list page, **When** they expand the right vertical menu, **Then** they can upload transfers from there.
2. **Given** the user uploads new transfers, **When** the upload and processing complete, **Then** the transfer list updates automatically without page reload.

---


### User Story 3 - Automated and Manual Label Assignment (Priority: P3)

As a user, I want labels to be assigned to transfers either automatically (by rules) or manually, and for the system to clearly distinguish between these link types. Manually assigned labels should only be removed by explicit user/API action, while automatically assigned labels should be removed automatically if the rules no longer match, so that I have control and clarity over label assignments.

**Why this priority**: Ensures data integrity, reduces manual work, and prevents unwanted removal of user-assigned labels.

**Independent Test**: Can be fully tested by creating/updating labels, manually assigning/removing labels, updating bank accounts, and verifying that transfers are correctly (re)linked and that manual links are only removed by explicit action.

**Acceptance Scenarios**:
1. **Given** a new label is created with rules, **When** it is saved, **Then** it is auto-assigned to all matching existing transfers as an "automatic" link.
2. **Given** a user manually assigns a label to a transfer, **When** the assignment is saved, **Then** the link is marked as "manual" and persists regardless of rule changes.
3. **Given** a label or bank account is updated, **When** the update is saved, **Then** all affected transfers are re-evaluated and automatic links are updated, but manual links remain unless explicitly removed.
4. **Given** a user requests to remove a label from a transfer, **When** the link is manual, **Then** it is only removed by explicit API/user action.
5. **Given** a label uses a regex rule, **When** a transfer's reference or account name matches, **Then** the label is linked as "automatic"; if the rule no longer matches, the automatic link is removed, but any manual link remains.

---


### Edge Cases

- What happens if a user tries to create a label with a rule that matches no existing transfers? (Label is created, but not linked to any transfer; user receives feedback)
- How does the system handle simultaneous edits to the same bank account or label by multiple users? The last write wins.
- What if a transfer is updated after a label is auto-assigned? (System should re-evaluate label assignment for that transfer, updating only automatic links)
- What if a transfer has both a manual and an automatic link to the same label? (Manual link takes precedence; automatic link can be removed if rules no longer match, but manual link remains until explicitly removed)
- What happens if a user tries to remove a label from a transfer that was assigned automatically? (Allowed; if user removes, it becomes an explicit removal)
- What if a user tries to remove a label from a transfer that was assigned manually? (Only removed by explicit user/API action)
- How does the UI behave if the import or auto-update fails? (User receives error message and can retry)

## Requirements *(mandatory)*


### Functional Requirements

- **FR-001**: The system MUST allow users to create, edit, and delete labels only from the label page, not from the home page.
- **FR-002**: The system MUST allow users to upload transfers from a collapsible right vertical menu on the transfer list page.
- **FR-003**: The system MUST auto-update the transfer list on the home/transfer page when new transfers are uploaded and processed.
- **FR-004**: The system MUST use consistent table styling for transfers, bank accounts, and labels.
- **FR-005**: The system MUST provide an action column for bank accounts and labels, including an edit button for bank accounts.
- **FR-006**: The system MUST display whether a bank account is internal (e.g., with a checkmark) in the bank account table.
- **FR-007**: The system MUST provide an edit page for bank accounts, allowing users to change the account name.
- **FR-008**: When a label is created, the system MUST auto-assign it to all existing transfers that match its rules (linked bank account or regex on reference/account name) as an "automatic" link.
- **FR-009**: The system MUST allow users to manually assign or remove labels from transfers, marking such links as "manual".
- **FR-010**: The system MUST match label regex rules against both the reference and account name fields of transfers.
- **FR-011**: When a bank account or label is updated, the system MUST re-evaluate and update only the "automatic" label links for affected transfers; "manual" links remain unless explicitly removed by user/API.
- **FR-012**: The system MUST ensure that manually assigned label links can never be removed automatically; they can only be removed by explicit API/user action.
- **FR-013**: The system MUST allow automatically assigned label links to be removed automatically if the rules no longer match.
- **FR-014**: The system MUST provide user feedback for successful and failed actions (e.g., import, auto-update, edit).
- **FR-015**: The system MUST handle simultaneous edits to the same bank account or label by multiple users. Last writes win.


### Key Entities

- **Label**: Represents a user-defined tag with rules (linked bank account(s), regex for reference/account name) for auto-assignment to transfers.
- **Bank Account**: Represents a user's bank account, with attributes such as name and internal/external status.
- **Transfer**: Represents a financial transaction, with attributes such as reference, account name, and linked labels.
- **Label-Transfer Link**: Represents the association between a label and a transfer, with an attribute indicating whether the link is "manual" (explicitly assigned by user/API) or "automatic" (assigned/removed by rules). Manual links persist until explicitly removed; automatic links are updated based on rule evaluation.

## Success Criteria *(mandatory)*


### Measurable Outcomes

- **SC-001**: 100% of label create/edit/delete actions are only possible from the label page, not the home page.
- **SC-002**: 100% of users can upload transfers from the right vertical menu without assistance.
- **SC-003**: 100% of transfer uploads result in the transfer list auto-updating within 5 seconds of processing completion.
- **SC-004**: Table styling is visually consistent across transfers, bank accounts, and labels as verified by user acceptance testing.
- **SC-005**: 100% of bank accounts display internal status and provide an edit button in the action column.
- **SC-006**: 100% of label and bank account edits are reflected in automated label-transfer links within 5 seconds.
- **SC-007**: 0 unresolved user complaints about missing or incorrect label assignments after label or bank account changes (measured over 1 month post-release).
- **SC-008**: 100% of manually assigned label links are only removed by explicit user/API action, never automatically.
- **SC-009**: 100% of automatically assigned label links are removed automatically if the rules no longer match, unless a manual link exists.


## Assumptions

- Users have permission to manage labels and bank accounts.
- Standard web application error handling and feedback patterns apply.
- Table styling refers to visual consistency, not implementation details.
- Auto-update means the UI refreshes automatically without manual reload.
- Simultaneous edits are rare.
- If a label-transfer link is both manual and automatic, the manual status takes precedence and the link is only removed by explicit user/API action.
