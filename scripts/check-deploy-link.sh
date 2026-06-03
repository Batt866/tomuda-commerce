#!/bin/bash
# DEPLOY-LINK.txt доторх URL ажиллаж байгаа эсэхийг шалгах
set -e
cd "$(dirname "$0")/.."
LINK_FILE="DEPLOY-LINK.txt"
PORT=8011

url_from_file() {
  grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LINK_FILE" 2>/dev/null | head -1
}

echo "=== ТОМУДА deploy шалгалт ==="
echo ""

if curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then
  echo "✓ Локал backend (127.0.0.1:$PORT) — OK"
else
  echo "✗ Локал backend — ажиллахгүй байна"
  echo "  Засах: ./scripts/start-tomuda.sh"
fi

if pgrep -f "cloudflared tunnel --url http://127.0.0.1:$PORT" >/dev/null 2>&1; then
  echo "✓ cloudflared tunnel — ажиллаж байна"
else
  echo "✗ cloudflared tunnel — зогссон (хуучин HTTPS link ажиллахгүй)"
  echo "  Засах: ./scripts/start-tomuda.sh"
fi

URL="$(url_from_file)"
if [ -z "$URL" ]; then
  echo "✗ DEPLOY-LINK.txt дотор URL олдсонгүй"
  exit 1
fi

echo ""
echo "DEPLOY-LINK.txt: $URL"
if curl -sf "$URL/api/health" >/dev/null 2>&1; then
  echo "✓ HTTPS deploy link — OK"
  curl -sS "$URL/api/health"
  echo ""
else
  echo "✗ HTTPS deploy link — ажиллахгүй (хуучин эсвэл tunnel хаагдсан)"
  echo "  Засах: ./scripts/start-tomuda.sh"
  exit 1
fi

echo ""
echo "Render (тогтвортой): https://tomuda-commerce.onrender.com"
if curl -sf "https://tomuda-commerce.onrender.com/api/health" >/dev/null 2>&1; then
  echo "✓ Render deploy — OK"
else
  echo "✗ Render deploy — хийгдээгүй эсвэл унтраалттай (Dashboard → Blueprint)"
fi
