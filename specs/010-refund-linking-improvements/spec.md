# Feature Specification: Improved Refund Transfer Linking & Parent/Child Logic

**Feature Branch**: `010-refund-linking-improvements`
**Created**: March 24, 2026
**Status**: Draft

## Background

Currently, refund links can be removed via a bulk action. This was likely a misimplementation. The desired workflow is to allow users to select a transfer, then select refund transfers to be linked as children (refunds) of the original transfer. The original transfer's amount should be reduced by the sum of its refunds, and all refund transfers should be visually grouped under the parent transfer in the UI (accordion style). The database should clearly mark parent and child (refund) relationships, and a new `amount_before_refund` column should be introduced to preserve the original amount.

## User Scenarios & Testing

### User Story 1 - Refund Linking via Action Panel (Priority: P1)

As a user, I want to select a transfer and then, via a button in the action panel, select refund transfers that should be subtracted from the original transfer, so that refunds are clearly linked and the amounts are accurate.

**Acceptance Scenarios:**
1. **Given** the transfer list, **When** the user selects a transfer and clicks the "Link Refunds" button, **Then** the user can select one or more refund transfers to link as refunds.
2. **Given** refund transfers are linked, **Then** they are visually grouped under the original transfer in an accordion/collapsible UI.
3. **Given** refund transfers are linked, **Then** the amount of the original transfer is updated to be the original amount minus the sum of the refund transfer amounts.
4. **Given** refund transfers are linked, **Then** the database marks the parent and child (refund) relationships, and the original amount is preserved in a new `amount_before_refund` column.

### Edge Cases
- What if a refund transfer is already linked to another parent? (UI should prevent or warn)
- What if the sum of refunds exceeds the original amount? (UI should warn or prevent)
- What if a refund transfer is deleted or its parent is missing? (UI should show as orphaned)

## Requirements

### Functional Requirements
- **FR-001**: System MUST remove the ability to remove refund links via bulk action.
- **FR-002**: System MUST allow users to select a transfer and, via the action panel, select refund transfers to link as children (refunds).
- **FR-003**: System MUST update the parent transfer's amount to reflect the sum of its refunds.
- **FR-004**: System MUST visually group refund transfers under their parent in the UI (accordion/collapsible style).
- **FR-005**: System MUST add a new `amount_before_refund` column to the transfer entity to preserve the original amount.
- **FR-006**: System MUST mark parent and child (refund) relationships in the database.
- **FR-007**: System MUST handle edge cases gracefully (orphaned refunds, excessive refund amounts, duplicate linking).

### Key Entities
- **Transfer**: Attributes: amount, amount_before_refund, date, reference, labels, parent (optional, for refunds), children (refunds).

## Success Criteria
- Users can link refunds to a transfer via the action panel in under 10 seconds.
- Refund transfers are always visually grouped under their parent in the UI.
- The parent transfer's amount is always accurate and the original amount is preserved.
- No critical errors or data inconsistencies occur when handling edge cases.

## Assumptions
- The parent/child (refund) relationship already exists in the data model; if not, it will be added.
- UI patterns for selection and accordion/collapsible grouping are acceptable as per existing design.
- All changes are backward compatible with existing transfer data.

