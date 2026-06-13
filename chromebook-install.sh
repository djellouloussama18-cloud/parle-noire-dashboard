#!/bin/bash
# ===================================
# Parle Noire POS - Chromebook Install
# ===================================
set -e

echo "==================================="
echo "  Parle Noire POS"
echo "  التثبيت على Chromebook Linux"
echo "==================================="
echo ""

# 1. Install Node.js
if command -v node &> /dev/null; then
  echo "[✓] Node.js موجود: $(node --version)"
else
  echo "[→] جاري تثبيت Node.js..."
  sudo apt-get update -qq
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  echo "[✓] Node.js: $(node --version)"
fi

# 2. Install backend dependencies
PROJECT_DIR="$(realpath "$(dirname "$0")")"
echo ""
echo "[→] جاري تثبيت الاعتماديات..."
cd "$PROJECT_DIR/backend"
npm install --production
cd "$PROJECT_DIR"
echo "[✓] الاعتماديات مثبتة"

# 3. Create app launcher entry
echo ""
echo "[→] جاري إنشاء أيقونة التطبيق..."
mkdir -p "$HOME/.local/share/applications"
mkdir -p "$HOME/.local/share/icons/hicolor/scalable/apps"

cat > "$HOME/.local/share/icons/hicolor/scalable/apps/parlenoire-pos.svg" << 'SVGEOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="24" fill="url(#bg)" stroke="#334155" stroke-width="2"/>
  <circle cx="64" cy="48" r="24" fill="#f97316" opacity="0.15"/>
  <text x="64" y="60" text-anchor="middle" font-size="52" fill="#f97316" font-family="sans-serif" font-weight="900">P</text>
  <text x="64" y="100" text-anchor="middle" font-size="13" fill="#64748b" font-family="sans-serif" font-weight="bold" letter-spacing="4">POS</text>
</svg>
SVGEOF

cat > "$HOME/.local/share/applications/parlenoire-pos.desktop" << DESKTOPFILE
[Desktop Entry]
Version=1.0
Type=Application
Name=Parle Noire POS
Comment=نظام نقطة البيع الاحترافي
Exec=bash "$PROJECT_DIR/start.sh"
Icon=$HOME/.local/share/icons/hicolor/scalable/apps/parlenoire-pos.svg
Terminal=false
Categories=Office;
StartupNotify=true
Actions=open-db;backup;

[Desktop Action open-db]
Name=فتح قاعدة البيانات
Exec=xdg-open "$PROJECT_DIR/database"

[Desktop Action backup]
Name=نسخ احتياطي
Exec=bash -c "cp '$PROJECT_DIR/database/pos_store.db' '$PROJECT_DIR/backups/pos_store-\$(date +%Y%m%d-%H%M%S).db'; echo '✅ تم'"
DESKTOPFILE

chmod +x "$HOME/.local/share/applications/parlenoire-pos.desktop"
chmod +x "$PROJECT_DIR/start.sh"

update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
gtk-update-icon-cache "$HOME/.local/share/icons" 2>/dev/null || true

echo ""
echo "══════════════════════════════════════"
echo "  ✅ تم التثبيت بنجاح!"
echo ""
echo "  📌 الآن اذهب إلى قائمة التطبيقات"
echo "     (Launcher) ← Linux apps"
echo "     وابحث عن 'Parle Noire POS'"
echo ""
echo "     انقر يمين ← Pin to shelf"
echo "     ليظهر في الشريط السفلي"
echo "══════════════════════════════════════"
echo ""
