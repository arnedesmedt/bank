# Backend Testing

## Running Tests

### All Tests
```bash
# From project root
make test-backend

# Or from backend directory
cd backend
make test-backend
```

### Authentication Tests
```bash
docker compose exec php vendor/bin/phpunit tests/Api/AuthenticationTest.php
```

### Run Specific Test
```bash
docker compose exec php vendor/bin/phpunit --filter testUserCanLogin
```

### With Coverage
```bash
docker compose exec -e XDEBUG_MODE=coverage php vendor/bin/phpunit --coverage-html coverage/
```

## Load Development Fixtures

Populate development database with test data:

```bash
# From project root
make fixtures-load

# Or from backend directory
cd backend
make fixtures-load
```

⚠️ **Warning:** This will purge all existing data!

Test users created:
- `john@example.com` / `password123`
- `jane@example.com` / `password456`
- `admin@example.com` / `admin123` (admin)

## Documentation

See `/specs/001-csv-import-transfers/documentation/TESTING_SETUP.md` for complete documentation.


