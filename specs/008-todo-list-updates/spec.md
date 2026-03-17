# Feature Specification: Todo List UI & Backend Updates

**Feature Branch**: `008-todo-list-updates`  
**Created**: 2026-03-16  
**Status**: Draft  
**Input**: User description: "Frontend:\n- Create an action bar under the topbar that can be hidden if not needed, or shown if there are general action items, like filter, create buttons, imports, ... The action bar should be part of the page and move when scrolling.\n- Notifications should be floating on the right top corner of the page. And have a close button. They will also close if you go to another page.\n- Move the csv import as button to the action bar. And show notifications of it as floating notifications, like described in the previous bullet.\n- Create a detail page for the labels where we also see all linked transfers for the label. There you can also edit or delete the label.\n- Make labels clickable in the transfer collection page so we go to a detail page of the label.\n- Don't allow deleting of bank accounts.\n- Create a detail page for the transfers where we also see all linked labels for the transfer. There you can also edit the transfer. The only thing that should be editable is adding manually a label to it.\n\nBackend:\n- Don't allow deleting of bank accounts."

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Action Bar and Notifications (Priority: P1)

As a user, I want to see an action bar under the topbar with relevant actions (filter, create, import), and receive floating notifications in the top right corner that I can close or that disappear when I navigate away, so I can easily access actions and stay informed about important events.

**Why this priority**: This is the most visible and frequently used part of the UI, directly impacting user efficiency and awareness.

**Independent Test**: Can be fully tested by navigating to a page with actions, triggering actions (e.g., import), and observing the action bar and notification behavior.

**Acceptance Scenarios**:

1. **Given** a page with available actions, **When** the user scrolls, **Then** the action bar remains part of the page and moves with scrolling.
2. **Given** a notification is shown, **When** the user clicks the close button or navigates to another page, **Then** the notification disappears.
3. **Given** the CSV import is available, **When** the user clicks the import button in the action bar, **Then** the import process starts and notifications appear as floating notifications.

---

### User Story 2 - Label and Transfer Detail Pages (Priority: P2)

As a user, I want to click on a label in the transfer list to view a detail page showing all linked transfers, and be able to edit or delete the label. I also want to view a transfer detail page showing all linked labels and be able to manually add a label to the transfer.

**Why this priority**: Enables efficient navigation and management of labels and transfers, improving data organization and user control.

**Independent Test**: Can be fully tested by clicking a label or transfer, viewing the detail page, and performing edit/delete or label assignment actions.

**Acceptance Scenarios**:

1. **Given** a transfer list with labels, **When** the user clicks a label, **Then** the label detail page opens showing all linked transfers and options to edit or delete the label.
2. **Given** a transfer detail page, **When** the user views the page, **Then** all linked labels are shown and the user can manually add a label to the transfer.

---

### User Story 3 - Prevent Bank Account Deletion (Priority: P3)

As a user, I should not be able to delete bank accounts from the UI, and the backend must also remove the bank account delete endpoint.

**Why this priority**: Prevents accidental or unauthorized removal of critical financial data, ensuring data integrity and compliance.

**Independent Test**: Can be fully tested by attempting to delete a bank account in the UI and via backend API, and confirming the operation is blocked.

**Acceptance Scenarios**:

1. **Given** a bank account, **When** the user attempts to delete it in the UI, **Then** the option is not available or the action is blocked.
2. **Given** a backend API request to delete a bank account, **When** the request is made, **Then** the endpoint doesn't exist anymore and a route not found exception is thrown.

---

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- What happens when there are no actions to show in the action bar? (The action bar should be hidden.)
- How does the system handle multiple notifications at once? (Notifications should stack without overlap and each should be individually closable.)
- What if a user tries to delete a label that is linked to transfers? (Allow deletion, but transfers should remain and lose the label association.)
- What if a user tries to add a label to a transfer that already has it? (Prevent duplicate label assignment.)
- What if a user tries to delete a bank account via direct API call? (Backend must block and return an error.)

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: The system MUST display an action bar under the topbar with relevant actions (filter, create, import) when actions are available.
- **FR-002**: The action bar MUST be part of the page and move with scrolling.
- **FR-003**: The system MUST display floating notifications in the top right corner, each with a close button, and notifications MUST disappear when navigating to another page.
- **FR-004**: The CSV import action MUST be accessible as a button in the action bar, and its notifications MUST use the floating notification system.
- **FR-005**: The system MUST provide a label detail page showing all linked transfers, with options to edit or delete the label.
- **FR-006**: Labels in the transfer collection page MUST be clickable and link to the label detail page.
- **FR-007**: The system MUST provide a transfer detail page showing all linked labels, with the ability to manually add a label to the transfer.
- **FR-008**: The system MUST NOT allow deleting of bank accounts in the frontend UI.
- **FR-009**: The backend MUST NOT allow deletion of bank accounts via any API or direct request. Remove the bank account delete endpoint.
- **FR-010**: The system MUST prevent duplicate label assignments to a transfer.
- **FR-011**: The system MUST allow deletion of labels even if linked to transfers, but transfers should remain and lose the label association.

### Key Entities

- **Action Bar**: UI component that displays available actions (filter, create, import) and is context-sensitive.
- **Notification**: Floating UI element that displays messages, can be closed by the user, and disappears on navigation.
- **Label**: Represents a tag or category, has a name, can be linked to multiple transfers, and can be edited or deleted.
- **Transfer**: Represents a financial transaction, can have multiple labels, and can be edited to add labels.
- **Bank Account**: Represents a user's bank account, cannot be deleted once created.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: Users can access all relevant actions from the action bar on applicable pages 100% of the time.
- **SC-002**: 95% of notifications are closed by users or disappear automatically within 10 seconds or on navigation.
- **SC-003**: 90% of users successfully navigate to label and transfer detail pages and complete edit/delete or label assignment tasks without errors.
- **SC-004**: No bank account deletions occur via UI or backend API in production after release.
- **SC-005**: User feedback indicates improved clarity and efficiency in accessing actions and managing labels/transfers (measured via post-release survey).

### Assumptions

- The action bar is only shown when there are actions to display.
- Notifications are transient and not persisted.
- Deleting a label removes its association from all linked transfers but does not delete the transfers themselves.
- Only label assignment is editable on the transfer detail page; other transfer fields are not editable here.
- Bank account deletion is not allowed for any user role.
