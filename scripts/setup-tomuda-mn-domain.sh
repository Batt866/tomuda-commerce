#!/bin/bash
# Үндсэн домэйныг tomudagroup.mn болгох (хуучин домэйнүүдийг зэрэгцээ үлдээнэ)
set -euo pipefail

PRIMARY_DOMAIN="${PRIMARY_DOMAIN:-tomudagroup.mn}"
OLD_DOMAINS="${OLD_DOMAINS:-tomuda.jobbox.mn,tomuda.mn,www.tomuda.mn}"
SERVER_IP="${SERVER_IP:-202.131.1.94}"
APP_DIR="${APP_DIR:-/var/www/tomuda}"
GUNICORN_PORT="${GUNICORN_PORT:-8010}"

if [ "$(id -u)" -ne 0 ]; then
  echo "✗ root эрхээр ажиллуулна уу"
  exit 1
fi

if [ ! -f "$APP_DIR/.env" ]; then
  echo "✗ $APP_DIR/.env олдсонгүй"
  exit 1
fi

echo "=== ${PRIMARY_DOMAIN} тохируулах ==="
echo "Primary: $PRIMARY_DOMAIN"
echo ""

ALL_HOSTS="${PRIMARY_DOMAIN},www.${PRIMARY_DOMAIN},${OLD_DOMAINS},${SERVER_IP},localhost,127.0.0.1"
CSRF_ORIGINS="https://${PRIMARY_DOMAIN},https://www.${PRIMARY_DOMAIN}"
NGINX_NAMES="${PRIMARY_DOMAIN} www.${PRIMARY_DOMAIN}"
IFS=',' read -r -a _old_arr <<< "$OLD_DOMAINS"
for _d in "${_old_arr[@]}"; do
  _d="$(echo "$_d" | tr -d '[:space:]')"
  [ -z "$_d" ] && continue
  CSRF_ORIGINS="${CSRF_ORIGINS},https://${_d}"
  NGINX_NAMES="${NGINX_NAMES} ${_d}"
done

ENV_FILE="$APP_DIR/.env"
TMP_ENV="$(mktemp)"
grep -v '^ALLOWED_HOSTS=' "$ENV_FILE" | grep -v '^CSRF_TRUSTED_ORIGINS=' >"$TMP_ENV" || true
{
  cat "$TMP_ENV"
  echo "ALLOWED_HOSTS=${ALL_HOSTS}"
  echo "CSRF_TRUSTED_ORIGINS=${CSRF_ORIGINS}"
} >"$ENV_FILE"
rm -f "$TMP_ENV"
chmod 600 "$ENV_FILE"

cat > /etc/nginx/sites-available/tomuda <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${NGINX_NAMES};

    client_max_body_size 50M;

    location /media/ {
        alias ${APP_DIR}/media/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        try_files \$uri @tomuda_app;
    }

    location @tomuda_app {
        proxy_pass http://127.0.0.1:${GUNICORN_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }

    location / {
        proxy_pass http://127.0.0.1:${GUNICORN_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
}
EOF

nginx -t
systemctl reload nginx
systemctl restart tomuda

echo ""
echo "=== SSL (${PRIMARY_DOMAIN}) ==="
echo "DNS шалгах: ${PRIMARY_DOMAIN} болон www.${PRIMARY_DOMAIN} A record → ${SERVER_IP}"
certbot --nginx -d "$PRIMARY_DOMAIN" -d "www.$PRIMARY_DOMAIN" \
  --non-interactive --agree-tos --register-unsafely-without-email --redirect \
  || echo "⚠ SSL амжилтгүй — DNS spread хүлээгээд дахин: certbot --nginx -d ${PRIMARY_DOMAIN} -d www.${PRIMARY_DOMAIN}"

echo ""
echo "============================================"
echo "  ✓ Дууслаа"
echo "  Үндсэн URL: https://${PRIMARY_DOMAIN}"
echo "  Хуучин:     ${OLD_DOMAINS} (зэрэг ажиллана)"
echo "============================================"
