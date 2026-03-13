# Feature Specification: Backend Account Features

**Feature Branch**: `003-backend-account-features`
**Created**: March 11, 2026
**Status**: Draft

## Description
Implement stricter handling and normalization of bank account properties, internal account marking, transfer filtering, balance calculation, and removal of owner properties.

## Requirements

- Add a hash property to the bank account, calculated from the concat of account name and number, set only on creation/import. Used for uniqueness and allows later name changes without affecting uniqueness.
- Strictly separate account number and name properties. Only store valid values; allow nulls if not found.
- Normalize bank account numbers to the format 'BEXX XXXX XXXX XXXX' (space every 4 characters).
- Add an 'internal' boolean property for bank accounts. The first bank account (first column) is always marked as internal.
- When a transfer is done between two internal accounts and there is already a transfer with the same amount * -1, same datetime, and switched accounts, do not persist that transfer.
- Add a total balance column for every bank account. For every transfer where the bank account is involved, add or subtract the amount. If the bank account is in the 'from' column, add the amount; if in the 'to' column, subtract the amount.
- Remove owners of transfers, labels, and bank accounts.

## User Scenarios & Testing

### User Story 1 - Unique Account Creation (Priority: P1)

As a user or importer, when creating/importing a bank account, the system calculates a hash from the account name and number, stores it, and uses it to ensure uniqueness. Account number and name are strictly separated and validated; nulls are allowed if not found. Account number is normalized to 'BEXX XXXX XXXX XXXX' format. The 'internal' property is set for own accounts (first column on import).

**Independent Test**: Create/import accounts with various name/number combinations, verify hash uniqueness, normalization, and internal flag.

**Acceptance Scenarios**:
1. **Given** a new account with valid name and number, **When** created/imported, **Then** hash is calculated, uniqueness enforced, number normalized, internal flag set if own account.
2. **Given** an account with missing name or number, **When** created/imported, **Then** null is stored for missing property, hash is calculated from available data.
3. **Given** duplicate account name/number, **When** imported, **Then** duplicate is rejected based on hash uniqueness.

### User Story 2 - Transfer Filtering and Balance Update (Priority: P2)

As a user, when importing or processing transfers, transfers between two internal accounts with matching reversed values (amount * -1, same datetime, switched accounts) are not persisted. Each transfer updates the total balance for involved accounts (add for 'from', subtract for 'to').

**Independent Test**: Import/process transfers between internal accounts, verify filtering and balance updates.

**Acceptance Scenarios**:
1. **Given** two internal accounts, **When** a transfer and its reverse exist (amount * -1, same datetime, switched accounts), **Then** neither transfer is persisted.
2. **Given** a transfer from/to any account, **When** processed, **Then** balances are updated accordingly.

### User Story 3 - Owner Property Removal (Priority: P3)

As a user, owner properties are no longer present in transfers, labels, or bank accounts.

**Independent Test**: Review entities, confirm absence of owner properties.

**Acceptance Scenarios**:
1. **Given** a transfer, label, or bank account, **When** inspected, **Then** no owner property exists.

## Edge Cases

- If account name or number is missing or invalid, null is stored, hash is calculated from available data.
- Duplicate accounts with same hash are rejected.
- If account number cannot be normalized, store as null or original value.
- Only exact reversed internal transfers are filtered; partial matches are persisted.
- Negative balances are allowed unless otherwise specified.
- Owner property removal does not affect existing business logic.

## Success Criteria

- No duplicate bank accounts exist (hash uniqueness enforced).
- 100% of account numbers are normalized to 'BEXX XXXX XXXX XXXX' format when possible.
- Internal transfers with matching reversed values are not persisted (0% occurrence).
- Balances for all accounts are updated accurately after each transfer (verified by test cases).
- Owner properties are absent from all relevant entities.
- User/importer can create/import accounts and transfers without errors related to new properties.

## Assumptions

- If account name or number is missing, null is stored and hash is calculated from available data.
- Account number normalization assumes valid input; if not possible, original value or null is stored.
- Internal property is set based on import logic (first column = own account).
- Negative balances are allowed unless otherwise specified.
- Only exact reversed internal transfers are filtered; partial matches are persisted.
- Owner property removal does not affect existing business logic.

