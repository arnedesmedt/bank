# Research: Backend Account Features

## Research Tasks

1. Research Symfony and Doctrine ORM version best practices for PHP backend.
2. Research database choice (PostgreSQL vs MySQL) and migration strategy for reversible migrations.
3. Research hash calculation algorithm and storage for bank account uniqueness.
4. Research account number normalization rules for 'BEXX XXXX XXXX XXXX' format.
5. Research criteria and migration for internal account marking.
6. Research efficient detection and filtering of reversed internal transfers.
7. Research total balance calculation for bank accounts (performance, edge cases).
8. Research impact and migration strategy for owner property removal.
9. Research testing coverage and best practices for unit and integration tests.

## Findings

### 1. Symfony and Doctrine ORM Version
- Decision: Use Symfony 8.x and the current used version of doctrine
- Rationale: Latest versions provide security, performance, and compatibility with modern PHP.
- Alternatives considered: Older versions (unsupported, less secure).

### 2. Database Choice and Migration Strategy
- Decision: Use PostgreSQL for advanced features and reliability.
- Rationale: PostgreSQL offers better support for complex queries, migrations, and data integrity.
- Alternatives considered: MySQL (less robust for migrations).

### 3. Hash Calculation Algorithm and Storage
- Decision: Use base64encode combined with crc32 hash of concatenated account name and number, stored as a unique column.
- Rationale: it shouldn't be secure hasing but very fast and easy to implement.
- Alternatives considered: MD5 (less secure), custom algorithms (unnecessary complexity).

### 4. Account Number Normalization
- Decision: Normalize to 'BEXX XXXX XXXX XXXX' using regex and string manipulation; allow null if invalid.
- Rationale: Ensures consistent format; null for invalid/missing values.
- Alternatives considered: Store original value (less consistent).

### 5. Internal Account Marking
- Decision: Mark first imported account as internal; add boolean property to entity.
- Rationale: Matches spec; migration sets internal flag for existing accounts.
- Alternatives considered: Use account type (not required).

### 6. Transfer Filtering (Reversed Internal Transfers)
- Decision: Filter transfers with same amount * -1, same datetime, and switched accounts using indexed queries.
- Rationale: Efficient detection via DB query; ensures only exact reversed pairs are filtered.
- Alternatives considered: In-memory filtering (less scalable).

### 7. Total Balance Calculation
- Decision: Calculate balance by summing transfer amounts (add for 'from', subtract for 'to'); allow negative balances.
- Rationale: Matches spec; negative balances allowed unless otherwise specified.
- Alternatives considered: Disallow negative balances (not required).

### 8. Owner Property Removal
- Decision: Remove owner properties from bank accounts, transfers, and labels; update migrations and business logic.
- Rationale: Simplifies model; migration ensures no impact on existing logic.
- Alternatives considered: Keep owner property (not required).

### 9. Testing Coverage
- Decision: Use PHPUnit for unit/integration tests; ensure coverage for all business logic and migrations.
- Rationale: Matches constitution; ensures quality and testability.
- Alternatives considered: Manual testing (not sufficient).


