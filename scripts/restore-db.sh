#!/bin/bash

# Script to restore database with proper foreign key constraint handling

set -e

BACKUP_FILE="$1"
if [ -z "$BACKUP_FILE" ]; then
    echo "Error: No backup file specified"
    echo "Usage: $0 <backup_file>"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file '$BACKUP_FILE' not found"
    exit 1
fi

echo "Restoring backup: $BACKUP_FILE"

# Create a temporary file with the proper restore commands
TEMP_FILE=$(mktemp)
trap "rm -f $TEMP_FILE" EXIT

# Add commands to disable foreign key constraints at the beginning
cat > "$TEMP_FILE" << 'EOF'
-- Disable foreign key constraints for restore
SET session_replication_role = replica;
SET client_min_messages = WARNING;
EOF

# Append the backup file
cat "$BACKUP_FILE" >> "$TEMP_FILE"

# Add commands to re-enable foreign key constraints at the end
cat >> "$TEMP_FILE" << 'EOF'
-- Re-enable foreign key constraints
SET session_replication_role = DEFAULT;
EOF

# Execute the restore
docker compose exec -T db psql -U bank_user -d bank_app < "$TEMP_FILE"

echo "Backup restored successfully"
