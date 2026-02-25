.PHONY: help up down restart logs shell-php shell-frontend shell-db test lint

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

up: ## Start all containers
	docker compose up -d

down: ## Stop all containers
	docker compose down

restart: ## Restart all containers
	docker compose restart

logs: ## Show logs from all containers
	docker compose logs -f

logs-php: ## Show PHP container logs
	docker compose logs -f php

logs-frontend: ## Show frontend container logs
	docker compose logs -f frontend

logs-db: ## Show database container logs
	docker compose logs -f db

shell-php: ## Open shell in PHP container
	docker compose exec php sh

shell-frontend: ## Open shell in frontend container
	docker compose exec frontend sh

shell-db: ## Open PostgreSQL shell
	docker compose exec db psql -U bank_user -d bank_app

test-backend: ## Run backend tests
	docker compose exec -e XDEBUG_MODE=off php vendor/bin/phpunit

test-frontend: ## Run frontend tests
	docker compose exec frontend npm test

lint-backend: ## Run backend linting
	docker compose exec -e XDEBUG_MODE=off php vendor/bin/grumphp run

fix-backend: ## Auto-fix backend coding standards
	docker compose exec -e XDEBUG_MODE=off php vendor/bin/phpcbf src/ tests/

lint-frontend: ## Run frontend linting
	docker compose exec frontend npm run lint

format-frontend: ## Format frontend code
	docker compose exec frontend npm run format

migrate: ## Run database migrations
	docker compose exec -e XDEBUG_MODE=off php bin/console doctrine:migrations:migrate --no-interaction

migrate-create: ## Create a new migration
	docker compose exec -e XDEBUG_MODE=off php bin/console doctrine:migrations:generate

db-reset: ## Reset database (drop, create, migrate)
	docker compose exec -e XDEBUG_MODE=off php bin/console doctrine:database:drop --force --if-exists
	docker compose exec -e XDEBUG_MODE=off php bin/console doctrine:database:create
	docker compose exec -e XDEBUG_MODE=off php bin/console doctrine:migrations:migrate --no-interaction

install-backend: ## Install backend dependencies
	docker compose exec -e XDEBUG_MODE=off php composer install

install-frontend: ## Install frontend dependencies
	docker compose exec frontend npm install

install: install-backend install-frontend ## Install all dependencies

build: ## Build all Docker images
	docker compose build

clean: ## Clean up containers, volumes, and images
	docker compose down -v
	docker system prune -f

