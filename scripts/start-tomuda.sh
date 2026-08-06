#!/bin/bash
# ТОМУДА — mini deploy (локал backend + HTTPS tunnel)
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
PORT=8011
LOG_DIR="$ROOT/logs"
PRODUCTION_URL="${PRODUCTION_URL:-https://tomudagroup.mn}"
mkdir -p "$LOG_DIR"

if [ -d ".venv" ]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate
fi

wait_http_ok() {
  local url="$1"
  local tries="${2:-30}"
  local i
  for i in $(seq 1 "$tries"); do
    if curl -sf --max-time 20 "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

local_lan_url() {
  local ip=""
  ip=$(ipconfig getifaddr en0 2>/dev/null || true)
  if [ -z "$ip" ]; then
    ip=$(ipconfig getifaddr en1 2>/dev/null || true)
  fi
  if [ -n "$ip" ]; then
    echo "http://${ip}:$PORT/"
  fi
}

echo "=== ТОМУДА mini deploy ==="
echo ""

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "✗ cloudflared олдсонгүй. Суулгах: brew install cloudflared"
  exit 1
fi

export ALLOWED_HOSTS="${ALLOWED_HOSTS:-*,localhost,127.0.0.1,.trycloudflare.com}"
export CSRF_TRUSTED_ORIGINS="${CSRF_TRUSTED_ORIGINS:-https://*.trycloudflare.com,http://127.0.0.1:$PORT,http://localhost:$PORT}"

if curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then
  echo "✓ Backend аль хэдийн ажиллаж байна (port $PORT)"
else
  echo "→ Backend асааж байна..."
  nohup python3 manage.py runserver "0.0.0.0:$PORT" >>"$LOG_DIR/backend.log" 2>&1 &
  echo $! >"$LOG_DIR/backend.pid"
  if ! wait_http_ok "http://127.0.0.1:$PORT/api/health" 20; then
    echo "✗ Backend асахгүй байна. logs/backend.log шалгана уу"
    exit 1
  fi
  echo "✓ Backend амжилттай ассан"
fi

if [ -f "$LOG_DIR/tunnel.pid" ]; then
  kill "$(cat "$LOG_DIR/tunnel.pid")" 2>/dev/null || true
fi
pkill -f "cloudflared tunnel --url http://127.0.0.1:$PORT" 2>/dev/null || true
pkill -f "cloudflared tunnel --protocol http2 --url http://127.0.0.1:$PORT" 2>/dev/null || true
sleep 1

echo "→ HTTPS tunnel асааж байна (1-2 минут хүлээнэ үү)..."
: >"$LOG_DIR/tunnel.log"
nohup cloudflared tunnel --protocol http2 --url "http://127.0.0.1:$PORT" >>"$LOG_DIR/tunnel.log" 2>&1 &
echo $! >"$LOG_DIR/tunnel.pid"

TUNNEL_URL=""
for _ in $(seq 1 45); do
  TUNNEL_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_DIR/tunnel.log" 2>/dev/null | tail -1 || true)
  if [ -n "$TUNNEL_URL" ]; then
    break
  fi
  sleep 2
done

TUNNEL_OK=false
if [ -n "$TUNNEL_URL" ]; then
  echo "→ Tunnel URL: $TUNNEL_URL"
  echo "→ DNS бэлэн болох хүртэл хүлээж байна..."
  if wait_http_ok "$TUNNEL_URL/api/health" 90; then
    TUNNEL_OK=true
    echo "✓ Mini deploy link (tunnel) — OK"
  else
    echo "⚠ Tunnel URL гарсан ч одоогоор холбогдож чадсангүй"
    echo "  Tunnel асаалттай байхад 1-2 минут хүлээгээд дахин нээнэ үү"
  fi
else
  echo "✗ Tunnel URL олдсонгүй. logs/tunnel.log шалгана уу"
fi

PRODUCTION_OK=false
LAN_URL="$(local_lan_url || true)"
echo ""
echo "→ Production шалгаж байна..."
if wait_http_ok "$PRODUCTION_URL/api/health" 8; then
  PRODUCTION_OK=true
  echo "✓ Production (24/7) — OK"
else
  echo "⚠ Production одоогоор хариулахгүй байна"
fi

cat > "$ROOT/DEPLOY-LINK.txt" <<EOF
ТОМУДА — Deploy link (HTTPS)
Шинэчлэгдсэн: $(date)

✅ ҮНДСЭН (24/7, утас/APK — энийг ашиглана):
$PRODUCTION_URL

EOF

if [ -n "$LAN_URL" ]; then
  cat >> "$ROOT/DEPLOY-LINK.txt" <<EOF
📱 Ижил Wi‑Fi (утас — хамгийн хурдан):
$LAN_URL

EOF
fi

if [ -n "$TUNNEL_URL" ]; then
  cat >> "$ROOT/DEPLOY-LINK.txt" <<EOF
🔧 MINI DEPLOY (локал tunnel — Mac асаалттай үед):
$TUNNEL_URL

EOF
fi

cat >> "$ROOT/DEPLOY-LINK.txt" <<EOF
Локал: http://127.0.0.1:$PORT/
GitHub: https://github.com/Batt866/tomuda-commerce

Дахин асаах: ./scripts/start-tomuda.sh
Шалгах: ./scripts/check-deploy-link.sh
EOF

echo ""
echo "============================================"
echo "  Production:     $PRODUCTION_URL"
if [ -n "$LAN_URL" ]; then
  echo "  Wi‑Fi (утас):   $LAN_URL"
fi
if [ -n "$TUNNEL_URL" ]; then
  echo "  Mini deploy:    $TUNNEL_URL"
fi
echo "  DEPLOY-LINK.txt шинэчлэгдлээ"
echo "============================================"
echo "Backend log: $LOG_DIR/backend.log"
echo "Tunnel log:  $LOG_DIR/tunnel.log"

if $PRODUCTION_OK || $TUNNEL_OK || [ -n "$LAN_URL" ]; then
  exit 0
fi

echo ""
echo "✗ Одоогоор ажиллах link олдсонгүй. Дээрх log-уудыг шалгана уу."
exit 1
