#!/bin/bash
# DEPLOY-LINK.txt доторх URL ажиллаж байгаа эсэхийг шалгах
set -e
cd "$(dirname "$0")/.."
LINK_FILE="DEPLOY-LINK.txt"
PORT=8011

RENDER_URL="https://tomuda-commerce.onrender.com"

url_from_file() {
  grep -oE 'https://[a-z0-9-]+\.(trycloudflare\.com|onrender\.com)' "$LINK_FILE" 2>/dev/null | head -1
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
  URL="$RENDER_URL"
fi

echo ""
echo "Шалгаж байна: $URL"
if curl -sf "$URL/api/health" >/dev/null 2>&1; then
  echo "✓ Deploy link — OK"
  curl -sS "$URL/api/health"
  echo ""
else
  echo "✗ Deploy link — ажиллахгүй"
  if [[ "$URL" == *trycloudflare.com* ]]; then
    echo "  trycloudflare link хуучирсан. Засах: ./scripts/start-tomuda.sh"
    echo "  Эсвэл тогтвортой link: $RENDER_URL"
  else
    echo "  Render сервер сэргэж байж болно — 1–2 минут хүлээгээд дахин шалгана уу"
  fi
fi

echo ""
echo "Render (APK / утас): $RENDER_URL"
if curl -sf "$RENDER_URL/api/health" >/dev/null 2>&1; then
  echo "✓ Render deploy — OK"
else
  echo "✗ Render deploy — унтраалттай эсвэл сэргэж байна (Dashboard → Blueprint)"
fi
