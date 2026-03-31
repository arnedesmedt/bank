# Determine the project root directory (where this Makefile is located)
# If this is a symlink, resolve to the actual location
MAKEFILE_PATH := $(abspath $(lastword $(MAKEFILE_LIST)))
ROOT_DIR := $(shell dirname "$(shell readlink -f "$(MAKEFILE_PATH)" 2>/dev/null || echo "$(MAKEFILE_PATH)")")

.PHONY: help up up-no-migrate down restart logs shell-php shell-frontend shell-db shell-worker test lint migrate-test messenger-consume messenger-failed-show messenger-failed-retry messenger-failed-reset worker-restart migrate-run migrate-service db-backup db-restore fixtures-load fixtures-service

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

up: ## Start all containers
	cd $(ROOT_DIR) && docker compose up -d

up-no-migrate: ## Start all containers except migration service
	cd $(ROOT_DIR) && docker compose up -d --scale migrate=0

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

logs-worker: ## Show worker container logs
	cd $(ROOT_DIR) && docker compose logs -f worker

logs-migrate: ## Show migration service logs
	cd $(ROOT_DIR) && docker compose logs -f migrate

shell-php: ## Open shell in PHP container
	cd $(ROOT_DIR) && docker compose exec php sh

shell-frontend: ## Open shell in frontend container
	cd $(ROOT_DIR) && docker compose exec frontend sh

shell-db: ## Open PostgreSQL shell
	cd $(ROOT_DIR) && docker compose exec db psql -U bank_user -d bank_app

shell-worker: ## Open shell in worker container
	cd $(ROOT_DIR) && docker compose exec worker sh

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

migrate-run: ## Run migration service manually (includes migrations only)
	cd $(ROOT_DIR) && docker compose up migrate --remove-orphans

fixtures-load: ## Load development fixtures (same as fixtures-service)
	cd $(ROOT_DIR) && docker compose up fixtures --remove-orphans

fixtures-service: ## Start fixtures service only (loads development fixtures)
	cd $(ROOT_DIR) && docker compose up -d fixtures

migrate-service: ## Start migration service only (includes migrations only)
	cd $(ROOT_DIR) && docker compose up -d migrate

migrate-create: ## Create a new migration
	cd $(ROOT_DIR) && docker compose exec -e XDEBUG_MODE=off php bin/console doctrine:migrations:generate

db-reset: ## Reset database (drop, create, migrate)
	cd $(ROOT_DIR) && docker compose exec -e XDEBUG_MODE=off php bin/console doctrine:database:drop --force --if-exists
	cd $(ROOT_DIR) && docker compose exec -e XDEBUG_MODE=off php bin/console doctrine:database:create
	cd $(ROOT_DIR) && docker compose exec -e XDEBUG_MODE=off php bin/console doctrine:migrations:migrate --no-interaction

fixtures-load: ## Load development fixtures
	cd $(ROOT_DIR) && docker compose exec -e XDEBUG_MODE=off php bin/console doctrine:fixtures:load --no-interaction
	cd $(ROOT_DIR) && docker compose exec -e XDEBUG_MODE=off php bin/console foundry:load-stories --no-interaction --append

messenger-test: ## Test the messenger system
	cd $(ROOT_DIR) && docker compose exec -e XDEBUG_MODE=off php bin/console app:test-messenger

messenger-consume: ## Manually consume messages (for testing)
	cd $(ROOT_DIR) && docker compose exec -e XDEBUG_MODE=off php bin/console messenger:consume async -vv

messenger-failed-show: ## Show failed messages
	cd $(ROOT_DIR) && docker compose exec -e XDEBUG_MODE=off php bin/console messenger:failed:show

messenger-failed-retry: ## Retry failed messages
	cd $(ROOT_DIR) && docker compose exec -e XDEBUG_MODE=off php bin/console messenger:failed:retry

messenger-failed-reset: ## Reset failed messages
	cd $(ROOT_DIR) && docker compose exec -e XDEBUG_MODE=off php bin/console messenger:failed:reset

worker-restart: ## Restart the worker container
	cd $(ROOT_DIR) && docker compose restart worker

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

db-backup: ## Create a backup of the bank_db database
	@mkdir -p $(ROOT_DIR)/backups
	@echo "Creating backup: $(ROOT_DIR)/backups/bank_db_backup_$$(date +%Y%m%d_%H%M%S).sql"
	@if ! cd $(ROOT_DIR) && docker compose ps db | grep -q "Up"; then \
		echo "Error: Database container is not running"; \
		echo "Please start the containers first: make up"; \
		exit 1; \
	fi
	@cd $(ROOT_DIR) && docker compose exec -T db pg_dump -U bank_user -d bank_app > backups/bank_db_backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "Backup created successfully"

db-restore: ## Restore a backup of the bank_db database (usage: make db-restore [BACKUP_FILE=backups/bank_db_backup_20231201_120000.sql])
	@if ! cd $(ROOT_DIR) && docker compose ps db | grep -q "Up"; then \
		echo "Error: Database container is not running"; \
		echo "Please start the containers first: make up"; \
		exit 1; \
	fi
	@if [ -z "$(BACKUP_FILE)" ]; then \
		LATEST_BACKUP=$$(ls -t $(ROOT_DIR)/backups/bank_db_backup_*.sql 2>/dev/null | head -1); \
		if [ -z "$$LATEST_BACKUP" ]; then \
			echo "Error: No backup files found in $(ROOT_DIR)/backups/"; \
			echo "Please create a backup first using: make db-backup"; \
			echo "Or specify a backup file: make db-restore BACKUP_FILE=path/to/backup.sql"; \
			exit 1; \
		fi; \
		echo "No backup file specified, using latest: $$LATEST_BACKUP"; \
		echo "Restoring backup: $$LATEST_BACKUP"; \
		cd $(ROOT_DIR) && docker compose exec -T db psql -U bank_user -d bank_app < "$$LATEST_BACKUP"; \
	else \
		if [ ! -f "$(BACKUP_FILE)" ]; then \
			echo "Error: Backup file '$(BACKUP_FILE)' not found"; \
			exit 1; \
		fi; \
		echo "Restoring backup: $(BACKUP_FILE)"; \
		cd $(ROOT_DIR) && docker compose exec -T db psql -U bank_user -d bank_app < "$(BACKUP_FILE)"; \
	fi
	@echo "Backup restored successfully"

