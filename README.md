# Bank Application

A modern bank transfer management application with CSV import, labeling, and statistics visualization.

## Features

- Import bank transfers from CSV files (starting with Belfius format)
- Automatic deduplication and idempotency
- Label management with parent-child relationships
- Auto-labeling based on bank accounts and regex patterns
- Statistics and visualizations
- OAuth2 authentication
- RESTful API with API Platform

## Tech Stack

### Backend
- PHP 8.5
- Symfony 8.x
- API Platform (JSON only)
- Doctrine ORM
- PostgreSQL
- OAuth2 (league/oauth2-server)
- Xdebug for debugging
- Linting: grumphp, phpstan, phpmd, phpcs, rector

### Frontend
- React 19
- TypeScript
- Vite 7
- TailwindCSS 4
- Vitest for testing
- ESLint & Prettier

### DevOps
- Docker Compose
- Tmuxinator for multi-container orchestration

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Tmuxinator (optional, for multi-pane terminal setup)

### Installation

1. Clone the repository:
```bash
cd /home/arnedesmedt/workspace/apps/bank
```

2. Copy environment files:
```bash
cp .env.example .env
cp backend/.env backend/.env.local
cp frontend/.env frontend/.env.local
```

3. Start the application:
```bash
docker compose up -d
```

Or use tmuxinator:
```bash
tmuxinator start -p devops/tmuxinator.yml
```

4. Run database migrations:
```bash
docker compose exec php bin/console doctrine:migrations:migrate
```

5. Generate OAuth2 keys (already done if using the repo):
```bash
docker compose exec php bin/console league:oauth2-server:generate-keypair
```

### Access

- Frontend: http://0.0.0.0:3000
- Backend API: http://0.0.0.0:8080
- Database: localhost:5432

### Development

#### Backend

```bash
# Install dependencies
cd backend && composer install

# Run linting
composer grumphp:run

# Run tests
composer test

# Generate migration
bin/console doctrine:migrations:generate

# Run migration
bin/console doctrine:migrations:migrate
```

#### Frontend

```bash
# Install dependencies
cd frontend && npm install

# Start dev server
npm run dev

# Run linting
npm run lint

# Run tests
npm test

# Format code
npm run format
```

## Project Structure

```
bank/
├── backend/              # Symfony backend
│   ├── docker/          # Docker configuration
│   ├── src/             # Application code
│   ├── config/          # Configuration files
│   ├── migrations/      # Database migrations
│   └── tests/           # Backend tests
├── frontend/            # React frontend
│   ├── src/             # Application code
│   └── tests/           # Frontend tests
├── devops/              # DevOps configuration
│   └── tmuxinator.yml   # Tmuxinator config
├── specs/               # Feature specifications
└── docker-compose.yml   # Docker Compose configuration
```

## Quality Gates

- PSR-12 coding standard (enforced by phpcs)
- PHPStan level max
- PHPMD rules (cleancode, codesize, naming, unusedcode)
- Rector PHP 8.5 rules
- ESLint and Prettier for frontend
- Integration and unit tests

## License

Proprietary

