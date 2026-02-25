#!/bin/bash

# JWT Keys Permissions Fix Script
# This script fixes the permissions on JWT keys so they're readable by PHP-FPM

set -e

echo "Fixing JWT key permissions..."

# Change to project root (backend/scripts -> backend -> project root)
cd "$(dirname "$0")/../.."

# Fix permissions
chmod 644 backend/config/jwt/private.pem
chmod 644 backend/config/jwt/public.pem

echo "Permissions fixed:"
ls -la backend/config/jwt/

echo ""
echo "Restarting PHP container..."
docker compose restart php

echo ""
echo "Waiting for container to be ready..."
sleep 5

echo ""
echo "Testing OAuth endpoint..."
curl -X POST http://localhost:8080/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=bank_app&username=john@example.com&password=password123"

echo ""
echo ""
echo "Done! If you see an access_token above, OAuth2 is working correctly."


