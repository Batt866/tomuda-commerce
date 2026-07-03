# Tomuda Commerce

HTML, Tailwind CSS, vanilla JavaScript, Django, Django Ninja хувилбар.

**Production:** https://tomuda.jobbox.mn

## Ажиллуулах (локал)

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_tomuda
python manage.py runserver
```

Дараа нь `http://127.0.0.1:8000/` нээнэ.

## Утсан дээр суулгах (PWA)

### Android (Chrome)

1. https://tomuda.jobbox.mn нээнэ
2. **«App суулгах»** banner эсвэл Chrome цэс → App суулгах

### iPhone (Safari)

1. URL-аа Safari-аар нээнэ
2. **Хуваалцах** → **Нүүр дэлгэцэнд нэмэх**

## API

- `GET /api/health`
- `GET /api/meta`
- `GET /api/state`
- `POST /api/state`

## Server deploy

- `scripts/deploy-vps-ubuntu.sh` — VPS дээр автомат deploy
- `DEPLOY.md` — дэлгэрэнгүй заавар

## Mobile (Capacitor — сонголттой)

- `package.json`
- `capacitor.config.json`

PWA-гаар ихэнх тохиолдолд хангалттай.
