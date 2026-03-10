# quickstart.md

## Backend
1. Clone repo and checkout `001-csv-import-transfers` branch.
2. Run `docker-compose up -d` to start backend, db, and Xdebug containers.
3. Configure `.env` for database and OAuth2 provider.
4. Run `composer install`.
5. Run `grumphp run` for linting.
6. Run tests: `phpunit` for unit/integration tests.
7. API available at `/api` (JSON only, docs disabled).
8. All endpoints are defined using API Platform API Resource attributes (#[ApiResource], #[Post], #[GetCollection], etc.).
9. CSV import endpoint uses TransferImportDTO as input, mapped to Transfer entity via DataTransformer (see API Platform DTO guidance).
10. TransferOutputDTO is used for output; entities are not exposed directly.

## Frontend
1. Navigate to `frontend/`.
2. Run `npm install`.
3. Run `npm run dev` to start Vite dev server.
4. Configure OAuth2 client in `.env`.
5. Lint: `npm run lint`.
6. Test: `npm run test`.

## DevOps
1. Use `devops/tmuxinator.yml` to start all containers and show logs in terminal.

## Authentication
- OAuth2: Configure provider in backend and frontend `.env` files.

## Debugging
- Xdebug enabled in backend container (port 9003).

## CSV Import
- Upload CSV via frontend; backend parses, deduplicates, persists, auto-labels transfers.
- CSV import endpoint is a custom API Platform operation (#[Post]) handled by a custom controller/DataTransformer.
- Input: TransferImportDTO; Output: TransferOutputDTO.
- Errors and progress shown in frontend UI.

## Edge Cases
- Unsupported CSV format: error message.
- Internal transfers: excluded from statistics/labeling.
- Multiple label matches: all applied.
- Missing Transaction ID: use fingerprint for idempotency.

---

Entities and DTOs are separated. Mapping is handled by Symfony's object mapper/DataTransformer. API Platform exposes DTOs as resources; entities are internal.
