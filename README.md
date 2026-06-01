# Tomuda Commerce

HTML, Tailwind CSS, vanilla JavaScript, Django, Django Ninja хувилбар.

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

## Утсан дээр суулгах (App Store / Play Store шаардлаггүй)

Энэ апп **PWA** (Progressive Web App) — вэб хуудсыг утасныхаа **нүүр дэлгэцэнд** суулгаж, апп шиг ашиглана.

### Android (Chrome)

1. Deploy хийсэн HTTPS URL-аа нээнэ (жишээ: `https://tomuda-commerce.onrender.com`)
2. Доод талын **«Утсан дээр суулгах»** banner гарна → **Суулгах** дарна
3. Эсвэл Chrome цэс (⋮) → **App суулгах** / **Нүүр дэлгэцэнд нэмэх**

### iPhone (Safari)

1. HTTPS URL-аа Safari-аар нээнэ
2. Доод **Хуваалцах** (□↑) → **Нүүр дэлгэцэнд нэмэх**
3. **Нэмэх** дарна

~20 хэрэглэгч бүр өөрийн утсан дээр ижил URL-аас суулгана. Store бүртгэл хэрэггүй.

## API

- `GET /api/health`
- `GET /api/meta`
- `GET /api/state`
- `POST /api/state`

## Server deploy

Production deploy:

- `Procfile`
- `render.yaml` — Render дээр автомат deploy (PostgreSQL + ~20 хэрэглэгчид)
- `DEPLOY.md` — дэлгэрэнгүй заавар

## Mobile (Capacitor — сонголттой)

Store-оор гаргах шаардлагатай бол Capacitor ашиглаж болно:

- `package.json`
- `capacitor.config.json`

PWA-гаар ихэнх тохиолдолд хангалттай.
