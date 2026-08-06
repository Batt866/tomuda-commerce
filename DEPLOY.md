# TOMUDA — Deploy + утсан дээр суулгах

## 1. VPS дээр deploy (production)

**Одоогийн production:** https://tomudagroup.mn

### Шинэ сервер дээр суулгах

```bash
# Mac → серверт скрипт илгээх
scp scripts/deploy-vps-ubuntu.sh root@SERVER_IP:/root/

# Сервер дээр
ssh root@SERVER_IP
bash /root/deploy-vps-ubuntu.sh

# Өөр домэйн:
DOMAIN=shop.example.mn bash /root/deploy-vps-ubuntu.sh
```

`tomudagroup.mn` тохируулах (одоо ажиллаж буй сервер дээр):

```bash
bash scripts/setup-tomuda-mn-domain.sh
```

### Шинэчлэх

```bash
cd /var/www/tomuda && git pull
source .venv/bin/activate && set -a && source .env && set +a
pip install -r requirements.txt
python manage.py migrate && python manage.py collectstatic --noinput
systemctl restart tomuda
```

---

## 2. Локал хөгжүүлэлт

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_tomuda
python manage.py runserver
```

`http://127.0.0.1:8000/` нээнэ.

---

## 3. Утсан дээр суулгах (PWA)

| Төхөөрөмж | Арга |
|-----------|------|
| **Android** | Chrome → https://tomudagroup.mn → «App суулгах» |
| **iPhone** | Safari → Хуваалцах → Нүүр дэлгэцэнд нэмэх |

HTTPS заавал. App Store / Play Store шаардлаггүй.

---

## 4. Локал түр tunnel (хөгжүүлэлт)

```bash
./scripts/start-tomuda.sh
cat DEPLOY-LINK.txt
```

---

## 5. Шалгах

```bash
./scripts/check-deploy-link.sh
curl -s https://tomudagroup.mn/api/health
```

---

## 6. Capacitor (Store — сонголттой)

`capacitor.config.json` дотор `server.url`-ийг production URL-аар солино:

```bash
npm install && npm run cap:sync
```
