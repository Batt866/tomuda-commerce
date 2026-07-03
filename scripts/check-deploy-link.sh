#!/bin/bash
# DEPLOY-LINK.txt доторх URL ажиллаж байгаа эсэхийг шалгах
cd "$(dirname "$0")/.."
LINK_FILE="DEPLOY-LINK.txt"
PORT=8011
PRODUCTION_URL="${PRODUCTION_URL:-https://tomuda.jobbox.mn}"

wait_http_ok() {
  local url="$1"
  local tries="${2:-5}"
  local i
  for i in $(seq 1 "$tries"); do
    if curl -sf --max-time 25 "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 3
  done
  return 1
}

tunnel_url_from_file() {
  grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LINK_FILE" 2>/dev/null | head -1
}

echo "=== ТОМУДА deploy шалгалт ==="
echo ""

if curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then
  echo "✓ Локал backend (127.0.0.1:$PORT) — OK"
else
  echo "✗ Локал backend — ажиллахгүй"
  echo "  Засах: ./scripts/mini-deploy.sh"
fi

if pgrep -f "cloudflared tunnel.*http://127.0.0.1:$PORT" >/dev/null 2>&1; then
  echo "✓ cloudflared tunnel — ажиллаж байна"
else
  echo "✗ cloudflared tunnel — зогссон"
  echo "  Засах: ./scripts/mini-deploy.sh"
fi

TUNNEL_URL="$(tunnel_url_from_file)"
if [ -n "$TUNNEL_URL" ]; then
  echo ""
  echo "Mini deploy: $TUNNEL_URL"
  if wait_http_ok "$TUNNEL_URL/api/health" 3; then
    echo "✓ Mini deploy link — OK"
    curl -sS "$TUNNEL_URL/api/health"
    echo ""
  else
    echo "✗ Mini deploy link — ажиллахгүй (tunnel хаагдсан эсвэл DNS хараахан бэлэн биш)"
    echo "  Засах: ./scripts/mini-deploy.sh"
  fi
fi

echo ""
echo "Production: $PRODUCTION_URL"
if wait_http_ok "$PRODUCTION_URL/api/health" 6; then
  echo "✓ Production deploy — OK"
  curl -sS "$PRODUCTION_URL/api/health"
  echo ""
else
  echo "✗ Production — хариулахгүй байна"
fi
