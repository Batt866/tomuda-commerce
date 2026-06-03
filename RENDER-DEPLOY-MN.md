# ТОМУДА — Render дээр deploy хийх бүрэн заавар

Энэ заавар нь **Mac унтраасан ч** апп ажиллах **24/7 cloud** deploy-ийг тайлбарлана.  
Локал `trycloudflare` link нь зөвхөн түр туршилт — production-д **Render** ашиглана.

**GitHub repo:** https://github.com/Batt866/tomuda-commerce  
**Тохиргооны файл:** `render.yaml` (төсөлд бэлэн байгаа)

---

## Агуулга

1. [Юу хийгдэх вэ](#1-юу-хийгдэх-вэ)
2. [Урьдчилсан шаардлага](#2-урьдчилсан-шаардлага)
3. [GitHub руу код байршуулах](#3-github-руу-код-байршуулах)
4. [Render бүртгэл + GitHub холбох](#4-render-бүртгэл--github-холбох)
5. [Blueprint-ээр deploy](#5-blueprint-ээр-deploy)
6. [Deploy амжилттай эсэхийг шалгах](#6-deploy-амжилттай-эсэхийг-шалгах)
7. [Environment тохиргоо (CSRF)](#7-environment-тохиргоо-csrf)
8. [Ажилтнуудтай хуваалцах (PWA)](#8-ажилтнуудтай-хуваалцах-pwa)
9. [Код засаад дахин deploy](#9-код-засаад-дахин-deploy)
10. [Free tier — юу мэдэх вэ](#10-free-tier--юу-мэдэх-вэ)
11. [Алдаа засах](#11-алдаа-засах)
12. [Түгээмэл асуулт](#12-түгээмэл-асуулт)

---

## 1. Юу хийгдэх вэ

`render.yaml` ашиглахад Render автоматаар:

| Үүсэх зүйл | Нэр | Зориулалт |
|------------|-----|-----------|
| PostgreSQL (free) | `tomuda-db` | Захиалга, бараа, харилцагчийн өгөгдөл хадгалах |
| Web service (free) | `tomuda-commerce` | Django + API + PWA хөтөчөөр харуулах |

**Build үед автоматаар:**
```bash
pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate
python manage.py seed_tomuda
```

**Ажиллах үед:**
```bash
gunicorn tomuda.wsgi:application --bind 0.0.0.0:$PORT
```

Үр дүн: `https://tomuda-commerce.onrender.com` (эсвэл өөр домэйн) — **Mac шаардлаггүй**.

---

## 2. Урьдчилсан шаардлага

- GitHub account (`Batt866` эсвэл өөрийн account)
- Төслийн код GitHub дээр (`tomuda-commerce` repo)
- Интернет холболт
- Render.com дээр бүртгэл (үнэгүй)

**Шаардлагагүй:** өөрийн сервер, домэйн худалдан авах, Mac 24 цаг асаалттай байлгах.

---

## 3. GitHub руу код байршуулах

Хэрэв аль хэдийн push хийсэн бол энэ хэсгийг алгасаж [§5](#5-blueprint-ээр-deploy) руу очно.

### 3.1 Локал төсөлд

```bash
cd /Users/tsooj/Downloads/mongolian-e-commerce-app
```

### 3.2 Git эхлүүлэх (анх удаа бол)

```bash
git init
git add .
git commit -m "Tomuda: Django PWA + Render deploy"
git branch -M main
git remote add origin https://github.com/Batt866/tomuda-commerce.git
git push -u origin main
```

### 3.3 Дахин push (код зассаны дараа)

```bash
git add .
git commit -m "Тайлбар: юу өөрчилснийг бичнэ"
git push origin main
```

### 3.4 GitHub дээр шалгах

Браузераар нээ: https://github.com/Batt866/tomuda-commerce  

Дараах файлууд **main** branch дээр байх ёстой:
- `render.yaml`
- `requirements.txt`
- `manage.py`
- `static/tomuda/app.js`

---

## 4. Render бүртгэл + GitHub холбох

### Алхам 4.1 — Render нээх

1. https://render.com руу орно.
2. **Get Started for Free** дарна.
3. **Sign up with GitHub** сонгоно.
4. GitHub нэвтрэлт → **Authorize Render** (repo хандалт зөвшөөрнө).

### Алхам 4.2 — Зөвшөөрөл

- `tomuda-commerce` repo-д Render хандах эрх өгнө.
- Private repo бол бүх repo эсвэл зөвхөн `tomuda-commerce` сонгож болно.

---

## 5. Blueprint-ээр deploy

### Алхам 5.1 — Blueprint эхлүүлэх

1. https://dashboard.render.com нээнэ.
2. Баруун дээд **New +** товч.
3. **Blueprint** сонгоно.

### Алхам 5.2 — Repository сонгох

1. **Connect a repository** хэсэгт `Batt866/tomuda-commerce` хайж сонгоно.
2. Render `render.yaml` уншиж preview харуулна:

   - **Database:** `tomuda-db` (PostgreSQL, free)
   - **Web Service:** `tomuda-commerce` (Python 3.11, free)

3. Нэр, plan өөрчлөх шаардлагагүй (анх удаа free үлдээнэ).

### Алхам 5.3 — Үүсгэх

1. **Apply** эсвэл **Create Blueprint** дарна.
2. Хоёр resource үүсэхийг хүлээнэ (DB + Web).
3. Web service → **Logs** таб руу орно.

### Алхам 5.4 — Build log харах

Амжилттай бол дараах мөрүүд гарна (ойролцоогоор):

```
Installing dependencies...
Running build command...
Collecting static files...
Running migrations...
TOMUDA backend seed data updated.
Build successful
Starting service with gunicorn...
```

**Анхаар:** Build 5–15 минут үргэлжилж болно. Эхний удаа удаан байх нь хэвийн.

### Алхам 5.5 — Live болох

- Service статус: **Building** → **Deploying** → **Live**
- Дээд хэсэгт URL гарна, жишээ нь:

  ```
  https://tomuda-commerce.onrender.com
  ```

---

## 6. Deploy амжилттай эсэхийг шалгах

### 6.1 Health check

Хөтөч эсвэл утаснаас нээ:

```
https://tomuda-commerce.onrender.com/api/health
```

**Зөв хариу:**
```json
{"ok": true, "app": "tomuda"}
```

### 6.2 Апп нээх

```
https://tomuda-commerce.onrender.com/
```

Нэвтрэх хуудас (ТОМУДА лого) гарвал deploy амжилттай.

### 6.3 Нэвтрэх (анхны seed өгөгдөл)

Deploy бүрт `seed_tomuda` ажилладаг. Анхны demo нэвтрэлт (жишээ):

| Email | Нууц үг | Эрх |
|-------|---------|-----|
| `admin@tomuda.mn` | `admin` | Админ |
| `ht@tomuda.mn` | `hasan` | Борлуулалт |
| `aguulah@tomuda.mn` | `dulam` | Агуулах |

Production-д нууц үгээ заавал солино (апп дотор ажилтан засах боломжтой).

### 6.4 PWA / Service Worker

1. Chrome → F12 → **Application** → **Manifest** (алдаагүй эсэх)
2. **Service Workers** идэвхтэй эсэх
3. Утаснаас ижил URL → «Суулгах» banner

---

## 7. Environment тохиргоо (CSRF)

`render.yaml`-д урьдчилан тохируулсан:

| Хувьсагч | Утга |
|----------|------|
| `DEBUG` | `0` |
| `SECRET_KEY` | Render автоматаар үүсгэнэ |
| `ALLOWED_HOSTS` | `.onrender.com` |
| `CSRF_TRUSTED_ORIGINS` | `https://tomuda-commerce.onrender.com` |
| `DATABASE_URL` | PostgreSQL-ээс автоматаар |
| `PYTHON_VERSION` | `3.11` |

### URL өөр гарсан бол (чухал)

Заримдаа нэр давхцвал URL ингэж гарна:

```
https://tomuda-commerce-a1b2.onrender.com
```

**Засах:**

1. Dashboard → **tomuda-commerce** (web service)
2. Зүүн цэс **Environment**
3. `CSRF_TRUSTED_ORIGINS` олж засна:

   ```
   https://tomuda-commerce-a1b2.onrender.com
   ```

   (`/` төгсгөлгүй, `http` биш `https`)

4. **Save Changes**
5. Дээд тал **Manual Deploy** → **Deploy latest commit**

### Олон домэйн (ирээдүйд)

Таслалаар тусгаарлана:

```
https://tomuda-commerce.onrender.com,https://www.tomuda.mn
```

---

## 8. Ажилтнуудтай хуваалцах (PWA)

### Юу илгээх вэ

Зөвхөн **нэг HTTPS URL**, жишээ:

```
https://tomuda-commerce.onrender.com
```

`DEPLOY-LINK.txt` доторх trycloudflare link **бүү** хуваалц — Mac унтрахад ажиллахгүй.

### Android

1. Chrome-оор URL нээнэ
2. «Суулгах» banner эсвэл цэс → **App суулгах** / **Add to Home screen**
3. Нүүр дэлгэцийн icon-оор нээнэ

### iPhone

1. **Safari**-аар URL нээнэ (Instagram/Facebook доторх browser биш)
2. **Хуваалцах** → **Нүүр дэлгэцэнд нэмэх**

### APK (Play Store-гүй)

Render дээр static APK байршуулсан бол:

```
https://ТАНЫ-URL.onrender.com/static/tomuda/downloads/TOMUDA.apk
```

(APK файл repo-д байгаа эсэхийг шалгана.)

---

## 9. Код засаад дахин deploy

### Автомат deploy (ихэвчлэн)

1. Локал засвар хийнэ
2. `git push origin main`
3. Render Dashboard → **Events** — шинэ deploy эхэлнэ

### Гараар deploy

1. **tomuda-commerce** service
2. **Manual Deploy** → **Deploy latest commit**

### ⚠️ Seed-ийн тухай

Build бүрт `python manage.py seed_tomuda` ажиллана. Энэ нь `main` түлхүүрийн өгөгдлийг **demo seed-ээр дахин бичиж болно**. Production-д бодит өгөгдөл оруулсны дараа deploy-ийн өмнө seed-ийг build-ээс хасах эсвэл seed логикийг «зөвхөн хоосон үед» болгох шаардлагатай бол мэдэгдээрэй.

---

## 10. Free tier — юу мэдэх вэ

| Зүйл | Free tier |
|------|-----------|
| Mac унтрахад ажиллах уу | ✅ Тийм |
| HTTPS | ✅ Автомат |
| PostgreSQL | ✅ (free, хязгаартай) |
| 15 мин идэвхгүй | Web service «унтрана» |
| Эхний хүний хурд | 30–90 сек хүлээлт байж болно (cold start) |
| Сард төлбөр | $0 (free plan) |

**Cold start багасгах (сонголт):** [cron-job.org](https://cron-job.org) дээр 14 минут тутам:

```
GET https://tomuda-commerce.onrender.com/api/health
```

### Paid plan (хэрэв хэрэгтэй бол)

Render Dashboard → service → **Upgrade** — илүү тогтвортой, унтрахгүй instance.

---

## 11. Алдаа засах

### 11.1 `404` / `Not Found` / `x-render-routing: no-server`

**Шалтгаан:** Blueprint хийгдээгүй эсвэл service устсан.

**Засвар:** [§5](#5-blueprint-ээр-deploy) дахин хийнэ.

---

### 11.2 Build failed — `pip install` алдаа

**Logs**-оос улаан мөр уншина.

**Засвар:**
- `requirements.txt` repo-д байгаа эсэх
- `PYTHON_VERSION=3.11` environment-д байгаа эсэх

---

### 11.3 Build failed — `migrate` эсвэл `seed_tomuda`

**Засвар:**
- Logs-д Python traceback харагдана
- Локал шалгах:

  ```bash
  source .venv/bin/activate
  pip install -r requirements.txt
  python manage.py migrate
  python manage.py seed_tomuda
  ```

---

### 11.4 Апп нээгдэхгүй / цагаан хуудас

**Шалтгаан:** Static files цуглуугаагүй.

**Засвар:** Logs-д `collectstatic` амжилттай эсэх. Manual Deploy дахин.

---

### 11.5 Нэвтэрч чадахгүй / хадгалах ажиллахгүй

**Шалтгаан:** `CSRF_TRUSTED_ORIGINS` буруу.

**Засвар:** [§7](#7-environment-тохиргоо-csrf) — URL яг таарсан эсэх.

---

### 11.6 `502 Bad Gateway` / `503`

**Шалтгаан:** Gunicorn эхлээгүй эсвэл deploy дундуур.

**Засвар:** 2–3 минут хүлээгээд дахин нээ. Logs → `Starting gunicorn`.

---

### 11.7 Database connection алдаа

**Шалтгаан:** `DATABASE_URL` холбогдоогүй.

**Засвар:**
1. Blueprint-ээр `tomuda-db` үүссэн эсэх
2. Web service → **Environment** → `DATABASE_URL` байгаа эсэх
3. DB, Web нэг **Blueprint/Group**-д байгаа эсэх

---

### 11.8 Локал vs Render

| | Локал + tunnel | Render |
|--|----------------|--------|
| URL | `*.trycloudflare.com` | `*.onrender.com` |
| Mac | Заавал асаалттай | Хэрэггүй |
| Өгөгдөл | `db.sqlite3` | PostgreSQL |

Локал шалгалт:

```bash
./scripts/check-deploy-link.sh
```

---

## 12. Түгээмэл асуулт

**Render үнэгүй юу?**  
Тийм, free plan байна. Хязгаар, cold start байдаг.

**Домэйн (tomuda.mn) холбох уу?**  
Render Dashboard → service → **Settings** → **Custom Domain** → DNS заавар дагана.

**trycloudflare link хэрэгтэй юу?**  
Production-д хэрэггүй. Зөвхөн Mac дээр хөгжүүлэхэд.

**Өгөгдөл устана уу?**  
PostgreSQL дээр deploy бүрт автоматаар устдаггүй. SQLite локал файл өөр.

**Хэдэн хүн ашиглах вэ?**  
~20 хэрэглэгчид free tier ихэвчлэн хангалттай; их ачаалалд paid эсвэл VPS.

---

## Хурдан checklist

- [ ] GitHub `main` дээр `render.yaml` байна
- [ ] Render → Blueprint → `tomuda-commerce` → Apply
- [ ] Status **Live**
- [ ] `/api/health` → `{"ok":true}`
- [ ] `/` нэвтрэх хуудас нээгдэнэ
- [ ] `CSRF_TRUSTED_ORIGINS` = бодит URL
- [ ] Ажилтнуудад `https://....onrender.com` илгээгдсэн
- [ ] Утаснаас PWA суулгасан

---

## Тусламж

- Render docs: https://render.com/docs/blueprint-spec  
- Төслийн богино заавар: `DEPLOY.md`  
- Локал deploy link: `./scripts/start-tomuda.sh` (зөвхөн түр)

Алдааны Logs screenshot эсвэл улаан мөрийг илгээвэл тодорхой засвар зааж болно.
