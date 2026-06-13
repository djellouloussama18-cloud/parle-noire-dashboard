#!/bin/bash
set -e
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

echo "📦 تثبيت Parle Noire POS..."

# Detect package manager
if command -v apt &> /dev/null; then
    PKG="apt"
elif command -v dnf &> /dev/null; then
    PKG="dnf"
elif command -v pacman &> /dev/null; then
    PKG="pacman"
else
    echo "⚠️  مدير الحزم غير معروف. تأكد من تثبيت Node.js v18+ يدوياً."
fi

# Install Node.js if missing
if ! command -v node &> /dev/null; then
    echo "❌ Node.js غير مثبت. يرجى تثبيته أولاً."
    exit 1
fi

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Build frontend
cd frontend && npm run build && cd ..

# Make scripts executable
chmod +x start.sh install.sh

echo "✅ تم التثبيت بنجاح! شغل: ./start.sh"
