#!/bin/bash
# ТОМУДА — Ubuntu 24.04 VPS deploy (jobbox.mn сервер дээр тусдаа домэйн/subdomain)
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/tomuda}"
APP_USER="${APP_USER:-www-data}"
# jobbox.mn дээр Jobbox апп байгаа тул default: дэд домэйн
DOMAIN="${DOMAIN:-tomuda.jobbox.mn}"
SERVER_IP="${SERVER_IP:-202.131.1.94}"
GUNICORN_PORT="${GUNICORN_PORT:-8010}"
REPO_URL="${REPO_URL:-https://github.com/Batt866/tomuda-commerce.git}"
BRANCH="${BRANCH:-main}"

echo "=== ТОМУДА VPS deploy ==="
echo "Domain: $DOMAIN"
echo "Port:   $GUNICORN_PORT (jobbox.mn-тэй зөрчилдөхгүй)"
echo "App:    $APP_DIR"
echo ""

if [ "$(id -u)" -ne 0 ]; then
  echo "✗ root эрхээр ажиллуулна уу: sudo bash $0"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
  python3 python3-venv python3-pip python3-dev \
  nginx postgresql postgresql-contrib \
  certbot python3-certbot-nginx \
  git curl build-essential libpq-dev

DB_PASS="$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='tomuda'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE USER tomuda WITH PASSWORD '${DB_PASS}';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='tomuda'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE tomuda OWNER tomuda;"
sudo -u postgres psql -c "ALTER USER tomuda WITH PASSWORD '${DB_PASS}';" >/dev/null

mkdir -p "$APP_DIR"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$APP_DIR"
else
  cd "$APP_DIR"
  git fetch origin "$BRANCH"
  git reset --hard "origin/$BRANCH"
fi
cd "$APP_DIR"

python3 -m venv .venv
source .venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt
curl -fsSL https://cdn.tailwindcss.com -o static/tomuda/vendor/tailwindcdn.js 2>/dev/null || true

SECRET_KEY="$(python3 -c 'import secrets; print(secrets.token_urlsafe(50))')"
mkdir -p media

cat > "$APP_DIR/.env" <<EOF
DEBUG=0
SECRET_KEY=${SECRET_KEY}
ALLOWED_HOSTS=${DOMAIN},${SERVER_IP},localhost,127.0.0.1
CSRF_TRUSTED_ORIGINS=https://${DOMAIN}
DATABASE_URL=postgres://tomuda:${DB_PASS}@127.0.0.1:5432/tomuda
MEDIA_ROOT=${APP_DIR}/media
SERVE_MEDIA=1
EOF
chmod 600 "$APP_DIR/.env"

set -a
# shellcheck disable=SC1091
source "$APP_DIR/.env"
set +a

python manage.py collectstatic --noinput
python manage.py migrate --noinput
python manage.py sanitize_state --apply || true
python manage.py seed_tomuda --only-if-empty || true
python manage.py sync_product_images --timeout 8 || true

chown -R "$APP_USER:$APP_USER" "$APP_DIR/media" "$APP_DIR/staticfiles" 2>/dev/null || true

cat > /etc/systemd/system/tomuda.service <<EOF
[Unit]
Description=Tomuda Django App
After=network.target postgresql.service

[Service]
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=${APP_DIR}/.venv/bin/gunicorn tomuda.wsgi:application \\
  --bind 127.0.0.1:${GUNICORN_PORT} \\
  --timeout 120 \\
  --workers 2 \\
  --threads 4 \\
  --preload
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/nginx/sites-available/tomuda <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

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

ln -sf /etc/nginx/sites-available/tomuda /etc/nginx/sites-enabled/tomuda
# jobbox.mn өөр nginx config-ийг УСТГАХГҮЙ
nginx -t
systemctl daemon-reload
systemctl enable tomuda
systemctl restart tomuda
systemctl reload nginx

echo ""
echo "=== HTTP шалгалт ==="
sleep 2
curl -sf "http://127.0.0.1:${GUNICORN_PORT}/api/health" && echo "" || echo "⚠ Gunicorn шалгалт амжилтгүй"

echo ""
echo "=== SSL (Let's Encrypt) ==="
echo "DNS шалгах: ${DOMAIN} → ${SERVER_IP} A record заасан байх ёстой"
if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect 2>/dev/null; then
  echo "✓ SSL амжилттай"
else
  echo "⚠ SSL одоогоор суусангүй. Datacom DNS-д A record нэмсний дараа:"
  echo "  certbot --nginx -d ${DOMAIN}"
fi

echo ""
echo "============================================"
echo "  ✓ ТОМУДА deploy дууслаа"
echo "  URL:  https://${DOMAIN}"
echo "  API:  https://${DOMAIN}/api/health"
echo "  jobbox.mn — өөрчлөгдөхгүй (тусдаа subdomain)"
echo "  Нэвтрэх (seed): admin@tomuda.mn / admin"
echo "  .env: ${APP_DIR}/.env"
echo "============================================"
