#!/bin/bash
# tomuda.mn домэйн нэмэх (tomuda.jobbox.mn-ийг орлуулах/зэрэгцүүлэх)
set -euo pipefail

PRIMARY_DOMAIN="${PRIMARY_DOMAIN:-tomuda.mn}"
OLD_DOMAIN="${OLD_DOMAIN:-tomuda.jobbox.mn}"
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

echo "=== tomuda.mn тохируулах ==="
echo "Primary: $PRIMARY_DOMAIN"
echo ""

# .env шинэчлэх
ENV_FILE="$APP_DIR/.env"
TMP_ENV="$(mktemp)"
grep -v '^ALLOWED_HOSTS=' "$ENV_FILE" | grep -v '^CSRF_TRUSTED_ORIGINS=' >"$TMP_ENV" || true
{
  cat "$TMP_ENV"
  echo "ALLOWED_HOSTS=${PRIMARY_DOMAIN},www.${PRIMARY_DOMAIN},${OLD_DOMAIN},${SERVER_IP},localhost,127.0.0.1"
  echo "CSRF_TRUSTED_ORIGINS=https://${PRIMARY_DOMAIN},https://www.${PRIMARY_DOMAIN},https://${OLD_DOMAIN}"
} >"$ENV_FILE"
rm -f "$TMP_ENV"
chmod 600 "$ENV_FILE"

# Nginx — хоёр домэйн зэрэг ажиллана
cat > /etc/nginx/sites-available/tomuda <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${PRIMARY_DOMAIN} www.${PRIMARY_DOMAIN} ${OLD_DOMAIN};

    client_max_body_size 50M;

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
echo "=== SSL (tomuda.mn) ==="
echo "DNS шалгах: ${PRIMARY_DOMAIN} A record → ${SERVER_IP}"
certbot --nginx -d "$PRIMARY_DOMAIN" -d "www.$PRIMARY_DOMAIN" \
  --non-interactive --agree-tos --register-unsafely-without-email --redirect \
  || echo "⚠ SSL амжилтгүй — DNS spread хүлээгээд дахин: certbot --nginx -d ${PRIMARY_DOMAIN} -d www.${PRIMARY_DOMAIN}"

# Хуучин subdomain-ийг шинэ рүү redirect (optional but nice)
if certbot certificates 2>/dev/null | grep -q "$OLD_DOMAIN"; then
  echo "✓ ${OLD_DOMAIN} SSL хэвээр байна"
fi

echo ""
echo "============================================"
echo "  ✓ Дууслаа"
echo "  Үндсэн URL: https://${PRIMARY_DOMAIN}"
echo "  Хуучин:     https://${OLD_DOMAIN} (redirect эсвэл зэрэг ажиллана)"
echo "============================================"
