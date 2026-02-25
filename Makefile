# Determine the project root directory (where this Makefile is located)
# If this is a symlink, resolve to the actual location
MAKEFILE_PATH := $(abspath $(lastword $(MAKEFILE_LIST)))
ROOT_DIR := $(shell dirname "$(shell readlink -f "$(MAKEFILE_PATH)" 2>/dev/null || echo "$(MAKEFILE_PATH)")")

.PHONY: help up down restart logs shell-php shell-frontend shell-db test lint

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

up: ## Start all containers
	cd $(ROOT_DIR) && docker compose up -d

down: ## Stop all containers
	cd $(ROOT_DIR) && docker compose down

restart: ## Restart all containers
	cd $(ROOT_DIR) && docker compose restart

logs: ## Show logs from all containers
	cd $(ROOT_DIR) && docker compose logs -f

logs-php: ## Show PHP container logs
	cd $(ROOT_DIR) && docker compose logs -f php

logs-frontend: ## Show frontend container logs
	cd $(ROOT_DIR) && docker compose logs -f frontend

logs-db: ## Show database container logs
	cd $(ROOT_DIR) && docker compose logs -f db

shell-php: ## Open shell in PHP container
	cd $(ROOT_DIR) && docker compose exec php sh

shell-frontend: ## Open shell in frontend container
	cd $(ROOT_DIR) && docker compose exec frontend sh

shell-db: ## Open PostgreSQL shell
	cd $(ROOT_DIR) && docker compose exec db psql -U bank_user -d bank_app

test-backend: ## Run backend tests
	cd $(ROOT_DIR) && docker compose exec -e XDEBUG_MODE=off php vendor/bin/phpunit

test-frontend: ## Run frontend tests
	cd $(ROOT_DIR) && docker compose exec frontend npm test

lint-backend: ## Run backend linting
	cd $(ROOT_DIR) && docker compose exec -e XDEBUG_MODE=off php vendor/bin/grumphp run

fix-backend: ## Auto-fix backend coding standards
	cd $(ROOT_DIR) && docker compose exec -e XDEBUG_MODE=off php vendor/bin/phpcbf src/ tests/

lint-frontend: ## Run frontend linting
	cd $(ROOT_DIR) && docker compose exec frontend npm run lint

format-frontend: ## Format frontend code
	cd $(ROOT_DIR) && docker compose exec frontend npm run format

migrate: ## Run database migrations
	cd $(ROOT_DIR) && docker compose exec -e XDEBUG_MODE=off php bin/console doctrine:migrations:migrate --no-interaction

migrate-create: ## Create a new migration
	cd $(ROOT_DIR) && docker compose exec -e XDEBUG_MODE=off php bin/console doctrine:migrations:generate

db-reset: ## Reset database (drop, create, migrate)
	cd $(ROOT_DIR) && docker compose exec -e XDEBUG_MODE=off php bin/console doctrine:database:drop --force --if-exists
	cd $(ROOT_DIR) && docker compose exec -e XDEBUG_MODE=off php bin/console doctrine:database:create
	cd $(ROOT_DIR) && docker compose exec -e XDEBUG_MODE=off php bin/console doctrine:migrations:migrate --no-interaction

fixtures-load: ## Load development fixtures
	cd $(ROOT_DIR) && docker compose exec -e XDEBUG_MODE=off php bin/console foundry:load-fixtures --no-interaction
	cd $(ROOT_DIR) && docker compose exec -e XDEBUG_MODE=off php bin/console doctrine:fixtures:load --no-interaction

install-backend: ## Install backend dependencies
	cd $(ROOT_DIR) && docker compose exec -e XDEBUG_MODE=off php composer install

install-frontend: ## Install frontend dependencies
	cd $(ROOT_DIR) && docker compose exec frontend npm install

install: install-backend install-frontend ## Install all dependencies

jwt-keys: ## Generate JWT keys for OAuth2
	@mkdir -p $(ROOT_DIR)/config/jwt
	@openssl genrsa -passout pass:15075cead7b248538ab5ffb826b7139c -out $(ROOT_DIR)/config/jwt/private.pem -aes256 4096
	@openssl rsa -pubout -passin pass:15075cead7b248538ab5ffb826b7139c -in $(ROOT_DIR)/config/jwt/private.pem -out $(ROOT_DIR)/config/jwt/public.pem
	@chmod 644 $(ROOT_DIR)/config/jwt/private.pem
	@chmod 644 $(ROOT_DIR)/config/jwt/public.pem
	@echo "JWT keys generated successfully with correct permissions"

build: ## Build all Docker images
	cd $(ROOT_DIR) && docker compose build

clean: ## Clean up containers, volumes, and images
	cd $(ROOT_DIR) && docker compose down -v
	cd $(ROOT_DIR) && docker system prune -f

