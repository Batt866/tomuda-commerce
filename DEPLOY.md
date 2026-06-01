# TOMUDA — Deploy + утсан дээр суулгах

## 1. Render дээр deploy (20 хэрэглэгчид зориулсан)

### Алхам

1. **GitHub repo** үүсгэнэ (доорх командууд).
2. [render.com](https://render.com) → **New** → **Blueprint** → repo сонгоно.
3. `render.yaml` автоматаар PostgreSQL + web service үүсгэнэ.
4. Deploy дууссаны дараа URL гарна: `https://tomuda-commerce-xxxx.onrender.com`
5. Render Dashboard → Web Service → **Environment**:
   - `CSRF_TRUSTED_ORIGINS` = `https://tomuda-commerce-xxxx.onrender.com` (өөрийн URL)
6. URL-аа ~20 хэрэглэгчид илгээнэ — тус бүр утсан дээр суулгана.

### GitHub руу push

```bash
cd mongolian-e-commerce-app
git init
git add .
git commit -m "Tomuda PWA + Render deploy"
git branch -M main
git remote add origin https://github.com/YOUR_USER/tomuda-commerce.git
git push -u origin main
```

### Яагаад PostgreSQL?

Render free tier дээр SQLite файл redeploy бүрт устана. PostgreSQL (free) өгөгдөл хадгална — 20 хүн ашиглахад тохиромжтой.

---

## 2. Утсан дээр суулгах (PWA)

| Төхөөрөмж | Арга |
|-----------|------|
| **Android** | Chrome → URL нээх → «Суулгах» banner эсвэл цэс → App суулгах |
| **iPhone** | Safari → URL → Хуваалцах → Нүүр дэлгэцэнд нэмэх |

- App Store / Play Store **шаардлаггүй**
- HTTPS заавал (Render автоматаар өгнө)
- Суулгасны дараа нүүр дэлгэцийн icon-оор нээнэ

---

## 3. Manual VPS deploy

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export DEBUG=0
export SECRET_KEY="replace-with-long-random-secret"
export ALLOWED_HOSTS="your-domain.com"
export CSRF_TRUSTED_ORIGINS="https://your-domain.com"
# PostgreSQL бол:
# export DATABASE_URL="postgres://..."
python manage.py collectstatic --noinput
python manage.py migrate
python manage.py seed_tomuda
gunicorn tomuda.wsgi:application --bind 0.0.0.0:8000
```

Nginx + Let's Encrypt SSL заавал — PWA суулгахад HTTPS хэрэгтэй.

---

## 4. Capacitor (Store-оор гаргах бол)

PWA-гаар хангалттай бол Store шаардлаггүй. Хэрэв Play Store / App Store-д гаргах бол:

1. Backend deploy хийсний дараа `capacitor.config.json` дотор `server.url`-ийг өөрийн URL-аар солино.
2. `npm install && npm run cap:add:android && npm run cap:sync`

---

## 5. Шалгах

- `GET /api/health` → `{"status":"ok"}`
- Chrome DevTools → Application → Manifest + Service Worker идэвхтэй эсэх
- Утаснаас HTTPS URL нээж суулгах banner шалгах
