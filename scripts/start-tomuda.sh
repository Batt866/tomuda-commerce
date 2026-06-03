#!/bin/bash
# ТОМУДА backend + HTTPS deploy link асаах
set -e
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
PORT=8011
LOG_DIR="$ROOT/logs"
mkdir -p "$LOG_DIR"

if [ -d ".venv" ]; then
  source .venv/bin/activate
fi

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "✗ cloudflared олдсонгүй. Суулгах: brew install cloudflared"
  exit 1
fi

# Backend асаах (аль хэдийн ажиллаж байвал алгасна)
if curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then
  echo "✓ Backend аль хэдийн ажиллаж байна (port $PORT)"
else
  echo "→ Backend асааж байна..."
  nohup python3 manage.py runserver "127.0.0.1:$PORT" >>"$LOG_DIR/backend.log" 2>&1 &
  echo $! >"$LOG_DIR/backend.pid"
  sleep 2
  if curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then
    echo "✓ Backend амжилттай ассан"
  else
    echo "✗ Backend асахгүй байна. logs/backend.log шалгана уу"
    exit 1
  fi
fi

# Хуучин tunnel зогсоох
if [ -f "$LOG_DIR/tunnel.pid" ]; then
  kill "$(cat "$LOG_DIR/tunnel.pid")" 2>/dev/null || true
fi
pkill -f "cloudflared tunnel --url http://127.0.0.1:$PORT" 2>/dev/null || true
sleep 1

# Шинэ tunnel (тус бүр шинэ URL өгнө)
echo "→ HTTPS tunnel асааж байна..."
: >"$LOG_DIR/tunnel.log"
nohup cloudflared tunnel --url "http://127.0.0.1:$PORT" >>"$LOG_DIR/tunnel.log" 2>&1 &
echo $! >"$LOG_DIR/tunnel.pid"

URL=""
for _ in $(seq 1 30); do
  URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_DIR/tunnel.log" | tail -1)
  if [ -n "$URL" ] && curl -sf "$URL/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if [ -z "$URL" ]; then
  echo "✗ Tunnel URL олдсонгүй. logs/tunnel.log шалгана уу"
  exit 1
fi

if ! curl -sf "$URL/api/health" >/dev/null 2>&1; then
  echo "✗ Tunnel URL гарсан ч ажиллахгүй байна: $URL"
  echo "  logs/tunnel.log шалгаад cloudflared ажиллаж байгаа эсэхийг нягтлана уу"
  exit 1
fi

# Capacitor APK-д ашиглах URL шинэчлэх
if [ -f "$ROOT/capacitor.config.json" ]; then
  python3 - "$URL" <<'PY'
import json, sys
path = "capacitor.config.json"
url = sys.argv[1]
with open(path, encoding="utf-8") as f:
    data = json.load(f)
data.setdefault("server", {})["url"] = url
data["server"]["cleartext"] = False
with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
    f.write("\n")
PY
fi

cat > "$ROOT/DEPLOY-LINK.txt" <<EOF
ТОМУДА — Deploy link (HTTPS)
Шинэчлэгдсэн: $(date)

$URL

Локал: http://127.0.0.1:$PORT/
GitHub: https://github.com/Batt866/tomuda-commerce

⚠️ Энэ link түр зуурын (trycloudflare). Компьютер + tunnel асаалттай байх үед л ажиллана.
Дахин асаах: ./scripts/start-tomuda.sh

Тогтвортой link (24/7): Render дээр deploy — DEPLOY.md харна уу.
EOF

echo ""
echo "============================================"
echo "  DEPLOY LINK: $URL"
echo "============================================"
echo "Backend log: $LOG_DIR/backend.log"
echo "Tunnel log:  $LOG_DIR/tunnel.log"
echo "Tunnel PID:  $(cat "$LOG_DIR/tunnel.pid")"
