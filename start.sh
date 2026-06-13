#!/bin/bash
# Parle Noire POS - Linux Launcher
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js غير مثبت. ثبته من: https://nodejs.org"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 تثبيت المكتبات..."
    npm install --silent
fi

if [ ! -d "frontend/node_modules" ]; then
    cd frontend && npm install --silent && cd ..
fi

# Build frontend if needed
if [ ! -d "frontend/dist" ]; then
    echo "🔨 بناء الواجهة..."
    cd frontend && npm run build && cd ..
fi

# Start server
echo "🚀 تشغيل Parle Noire POS على http://localhost:3001"
cd backend && node server.js
