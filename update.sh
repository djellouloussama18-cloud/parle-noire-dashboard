#!/bin/bash
# Backs up database then updates code only

cd "$(dirname "$0")"

echo "=== Parle Noire POS - Update ==="

# Step 1: Backup database
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_SOURCE="./database/pos_store.db"

if [ -f "$DB_SOURCE" ]; then
  cp "$DB_SOURCE" "$BACKUP_DIR/pos_store_$TIMESTAMP.db"
  echo "??? Database backed up: backups/pos_store_$TIMESTAMP.db"
else
  echo "?????? No database found to backup"
fi

# Step 2: Pull latest code (if git)
if [ -d ".git" ]; then
  echo "Pulling latest code..."
  git pull origin main
fi

# Step 3: Reinstall backend dependencies
cd backend
npm install --production
cd ..

# Step 4: Rebuild frontend
cd frontend
npm install
npm run build
cd ..

echo "??? Update complete! Restart with: bash start.sh"
