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

