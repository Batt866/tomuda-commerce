#!/usr/bin/env bash
# Resume tomuda-commerce on Render (suspend-by-user).
# Usage:
#   RENDER_API_KEY=rnd_... ./scripts/render-resume.sh
# API key: Render Dashboard → Account Settings → API Keys

set -euo pipefail

SERVICE_NAME="${RENDER_SERVICE_NAME:-tomuda-commerce}"
HEALTH_URL="${RENDER_HEALTH_URL:-https://tomuda-commerce.onrender.com/api/health}"

if [ -z "${RENDER_API_KEY:-}" ]; then
  echo "✗ RENDER_API_KEY байхгүй."
  echo "  Render → Account Settings → API Keys → Create"
  echo "  Дараа нь: RENDER_API_KEY=rnd_... ./scripts/render-resume.sh"
  exit 1
fi

echo "→ Render service хайж байна: $SERVICE_NAME"
services_json="$(curl -fsS \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Accept: application/json" \
  "https://api.render.com/v1/services?limit=100")"

service_id="$(python3 - <<'PY' "$services_json" "$SERVICE_NAME"
import json, sys
data = json.loads(sys.argv[1])
name = sys.argv[2]
for item in data:
    svc = item.get("service") or item
    if svc.get("name") == name:
        print(svc.get("id", ""))
        break
PY
)"

if [ -z "$service_id" ]; then
  echo "✗ '$SERVICE_NAME' service олдсонгүй. Render account зөв эсэхийг шалгана уу."
  exit 1
fi

echo "→ Resume: $service_id"
http_code="$(curl -sS -o /tmp/render-resume.out -w "%{http_code}" -X POST \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Accept: application/json" \
  "https://api.render.com/v1/services/${service_id}/resume")"

if [ "$http_code" != "202" ] && [ "$http_code" != "200" ]; then
  echo "✗ Resume амжилтгүй (HTTP $http_code):"
  cat /tmp/render-resume.out
  exit 1
fi

echo "✓ Resume хүсэлт илгээгдлээ. Сервер асаж байна..."
for i in $(seq 1 24); do
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    echo "✓ Амжилттай: $HEALTH_URL"
    curl -fsS "$HEALTH_URL"
    echo
    exit 0
  fi
  echo "  ... хүлээж байна ($i/24)"
  sleep 10
done

echo "⚠ Resume илгээгдсэн ч health check хариулаагүй. Render Dashboard → Logs шалгана уу."
exit 1
