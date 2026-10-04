#!/bin/bash
# Production VPS дээрх ТОМУДА-г GitHub main-ээс шинэчлэх.
# Push хийсний дараа сервер дээр энэ скриптийг ажиллуулна (root).
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/tomuda}"
BRANCH="${BRANCH:-main}"
SERVICE="${SERVICE:-tomuda}"

if [ "$(id -u)" -ne 0 ]; then
  echo "✗ root эрхээр ажиллуулна уу: sudo bash $0"
  exit 1
fi

if [ ! -d "$APP_DIR/.git" ]; then
  echo "✗ $APP_DIR git repo биш. Эхлээд deploy-vps-ubuntu.sh ажиллуулна."
  exit 1
fi

echo "=== ТОМУДА VPS update ==="
echo "App:    $APP_DIR"
echo "Branch: $BRANCH"
echo ""

cd "$APP_DIR"
git fetch origin "$BRANCH"
BEFORE="$(git rev-parse HEAD)"
git reset --hard "origin/$BRANCH"
AFTER="$(git rev-parse HEAD)"

echo "Git: $BEFORE → $AFTER"

if [ -f "$APP_DIR/.venv/bin/activate" ]; then
  # shellcheck disable=SC1091
  source "$APP_DIR/.venv/bin/activate"
fi
if [ -f "$APP_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$APP_DIR/.env"
  set +a
fi

pip install -q -r requirements.txt
python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py sync_product_images --timeout 8 || true
systemctl restart "$SERVICE"

echo ""
echo "=== Шалгалт ==="
sleep 2
curl -sf "http://127.0.0.1:${GUNICORN_PORT:-8010}/api/health" && echo "" || echo "⚠ health шалгалт амжилтгүй"
head -1 static/tomuda/sw.js || true
grep -oE 'app\.js\?v=[^" ]+|styles\.css\?v=[^" ]+' templates/dashboard.html | head -5 || true

echo ""
echo "✓ Update дууслаа. Утсан дээр hard refresh / апп дахин нээнэ үү."
echo "  https://tomudagroup.mn"
echo "  Nginx /media/ 404-ийг апп руу өгөх: error_page 404 = @tomuda_app;"
