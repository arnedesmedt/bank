# research.md

## Unknowns Resolved

### 1. OAuth2 provider details and integration (Symfony, React)
- Decision: Use Symfony's league/oauth2-server bundle for backend, integrate with React using react-oauth2-auth-code-flow or similar. Provider: Internal (self-hosted) for privacy.
- Rationale: Mature, stateless, integrates with API Platform. React libraries support OAuth2 flows.
- Alternatives considered: External providers (Google, Auth0) rejected for privacy; session-based login rejected for stateless API.

### 2. API Platform: disabling UI/docs
- Decision: Set api_platform.enable_swagger_ui: false and api_platform.enable_docs: false in Symfony config.
- Rationale: Disables OpenAPI/Swagger UI/docs, meets requirement for no public API docs.
- Alternatives considered: Customizing API Platform UI rejected as unnecessary.

### 3. Xdebug: Docker Compose best practice for Symfony
- Decision: Use official Xdebug Docker image, set XDEBUG_MODE=debug, expose port 9003, add xdebug.ini config.
- Rationale: Official image/config ensures compatibility and easy debugging.
- Alternatives considered: Manual install/config rejected for complexity.

### 4. Doctrine coding standard config for phpcs
- Decision: Use doctrine/coding-standard package, configure phpcs with ruleset.xml referencing doctrine standard.
- Rationale: Maintained, integrates with phpcs.
- Alternatives considered: PSR-12 only rejected for lack of domain-specific rules.

### 5. CSV upload progress/error handling in React/Vite
- Decision: Use fetch/XMLHttpRequest or axios, track progress via onProgress, show progress bar and error messages.
- Rationale: Standard for large file uploads, ensures user feedback.
- Alternatives considered: WebSockets rejected for complexity.

### 6. tmuxinator config for multi-container logs
- Decision: Create tmuxinator config with panes for docker-compose up and docker-compose logs -f for each container.
- Rationale: Allows simultaneous monitoring/control.
- Alternatives considered: Custom shell scripts rejected for lack of terminal multiplexing.

---

# Research: CSV Import Transfers DTO/Entity Split

## Research Tasks

1. Research best practice for configuring Symfony's object mapper for Transfer domain.
2. Research DTO structure for Transfer import (fields, validation).
3. Research mapping patterns for nested/related entities (e.g., BankAccount, Label).
4. Research how to handle idempotency and deduplication in DTO/entity mapping.
5. Research API Platform configuration for DTOs (resource, input/output, serialization).
6. Find best practices for Symfony, API Platform, Doctrine ORM in DTO/entity separation for REST APIs.

---

## Findings

### 1. Best practice for configuring Symfony's object mapper for Transfer domain
- **Decision**: Use Symfony's PropertyMapper or custom DataTransformer for mapping between ApiResource DTOs and Doctrine entities. Also take a look at the Symfony Mapper Attribute.
- **Rationale**: PropertyMapper is recommended for simple mapping; DataTransformer allows custom logic (e.g., idempotency, nested relations).
- **Alternatives considered**: Manual mapping in controller/service, third-party mappers (rejected for maintainability).

### 2. DTO structure for Transfer import (fields, validation)
- **Decision**: DTOs should mirror CSV fields: date, amount, currency, fromAccount, toAccount, reference, transactionId. Use Symfony Validator for field validation.
- **Rationale**: Clear separation of input structure; validation ensures data integrity before mapping.
- **Alternatives considered**: Using entities directly (rejected for separation of concerns).

### 3. Mapping patterns for nested/related entities (BankAccount, Label)
- **Decision**: Use DataTransformer to resolve related entities (e.g., lookup BankAccount by account number, Label by regex/ID) during mapping.
- **Rationale**: Ensures relations are handled consistently; avoids direct entity exposure.
- **Alternatives considered**: Mapping in controller (rejected for testability and maintainability).

### 4. Handling idempotency and deduplication in DTO/entity mapping
- **Decision**: DataTransformer checks for existing Transfer entity by transactionId or composite fingerprint before creating new entity.
- **Rationale**: Guarantees idempotency and deduplication at mapping layer.
- **Alternatives considered**: Deduplication in repository/service (accepted as fallback, but mapping preferred for import flow).

### 5. API Platform configuration for DTOs (resource, input/output, serialization)
- **Decision**: Register DTOs as ApiResource, configure input/output with custom DataTransformer, use serialization groups for output.
- **Rationale**: API Platform supports DTOs as resources; custom transformer ensures correct mapping.
- **Alternatives considered**: Exposing entities directly (rejected for security and separation).

### 6. Best practices for Symfony, API Platform, Doctrine ORM in DTO/entity separation
- **Decision**: Follow API Platform DTO guidance, use DataTransformer for mapping, validate DTOs, keep entities internal.
- **Rationale**: Recommended by API Platform docs; improves maintainability, testability, and security.
- **Alternatives considered**: No separation (rejected for extensibility and maintainability).

---

All clarifications resolved. Proceed to Phase 1: update data-model.md, contracts, and quickstart.md.
