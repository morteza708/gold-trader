# ✅ چک‌لیست کامل فایل .env برای Production

این چک‌لیست را قبل از قرار دادن `.env` روی سرور بررسی کنید.

---

## 🔐 متغیرهای اجباری Django

### ✅ DJANGO_SECRET_KEY
- [ ] **وجود دارد** و خالی نیست
- [ ] **طول مناسب** (حداقل 50 کاراکتر)
- [ ] **تصادفی و امن** است (نه مقدار پیش‌فرض)
- [ ] **تولید شده** با دستور Django یا Python secrets

**مثال صحیح:**
```env
DJANGO_SECRET_KEY=django-insecure-abc123... (حداقل 50 کاراکتر)
```

**مثال اشتباه:**
```env
DJANGO_SECRET_KEY=secret  ❌
DJANGO_SECRET_KEY=your-secret-key-here-change-in-production  ❌
```

---

### ✅ DJANGO_DEBUG
- [ ] **مقدار:** `False` (نه `True` یا `true`)
- [ ] **بدون فاصله** قبل و بعد

**مثال صحیح:**
```env
DJANGO_DEBUG=False
```

---

### ✅ ALLOWED_HOSTS
- [ ] **شامل دامنه اصلی:** `irangoldtrader.ir`
- [ ] **شامل www:** `www.irangoldtrader.ir` (اختیاری اما توصیه می‌شود)
- [ ] **بدون http/https** (فقط دامنه)
- [ ] **جدا شده با کاما** (بدون فاصله)

**مثال صحیح:**
```env
ALLOWED_HOSTS=irangoldtrader.ir,www.irangoldtrader.ir
```

**مثال اشتباه:**
```env
ALLOWED_HOSTS=https://irangoldtrader.ir  ❌
ALLOWED_HOSTS=irangoldtrader.ir, www.irangoldtrader.ir  ❌ (فاصله اضافی)
```

---

## 🗄️ متغیرهای Database

### ✅ DB_NAME
- [ ] **مقدار:** `gold_trading` (یا نام دلخواه)
- [ ] **بدون فاصله**

**مثال صحیح:**
```env
DB_NAME=gold_trading
```

---

### ✅ DB_USER
- [ ] **مقدار:** `postgres` (یا کاربر دلخواه)
- [ ] **بدون فاصله**

**مثال صحیح:**
```env
DB_USER=postgres
```

---

### ✅ DB_PASSWORD
- [ ] **وجود دارد** و خالی نیست
- [ ] **قوی است** (حداقل 16 کاراکتر)
- [ ] **شامل حروف، اعداد و کاراکترهای خاص**
- [ ] **نه مقدار پیش‌فرض** مثل `postgres`

**مثال صحیح:**
```env
DB_PASSWORD=MyStr0ng!P@ssw0rd#2024
```

**مثال اشتباه:**
```env
DB_PASSWORD=postgres  ❌
DB_PASSWORD=123456  ❌
DB_PASSWORD=YOUR_SECURE_DB_PASSWORD  ❌
```

---

### ✅ DB_HOST
- [ ] **مقدار:** `db` (نام service در docker-compose)
- [ ] **بدون فاصله**

**مثال صحیح:**
```env
DB_HOST=db
```

---

### ✅ DB_PORT
- [ ] **مقدار:** `5432` (پورت پیش‌فرض PostgreSQL)
- [ ] **بدون فاصله**

**مثال صحیح:**
```env
DB_PORT=5432
```

---

## 🔴 متغیرهای Redis

### ✅ REDIS_URL
- [ ] **مقدار:** `redis://redis:6379/0`
- [ ] **فرمت صحیح:** `redis://HOST:PORT/DB_NUMBER`

**مثال صحیح:**
```env
REDIS_URL=redis://redis:6379/0
```

---

### ✅ CELERY_BROKER_URL
- [ ] **مقدار:** `redis://redis:6379/0`
- [ ] **همان REDIS_URL** (معمولاً)

**مثال صحیح:**
```env
CELERY_BROKER_URL=redis://redis:6379/0
```

---

### ✅ CELERY_RESULT_BACKEND
- [ ] **مقدار:** `redis://redis:6379/0`
- [ ] **همان REDIS_URL** (معمولاً)

**مثال صحیح:**
```env
CELERY_RESULT_BACKEND=redis://redis:6379/0
```

---

## 🌐 متغیرهای CORS

### ✅ CORS_ALLOWED_ORIGINS
- [ ] **شامل URL اصلی:** `https://irangoldtrader.ir`
- [ ] **شامل www:** `https://www.irangoldtrader.ir` (اختیاری)
- [ ] **با https شروع می‌شود** (نه http)
- [ ] **بدون اسلش در انتها** (نه `https://irangoldtrader.ir/`)
- [ ] **جدا شده با کاما** (بدون فاصله)

**مثال صحیح:**
```env
CORS_ALLOWED_ORIGINS=https://irangoldtrader.ir,https://www.irangoldtrader.ir
```

**مثال اشتباه:**
```env
CORS_ALLOWED_ORIGINS=http://irangoldtrader.ir  ❌ (http به جای https)
CORS_ALLOWED_ORIGINS=https://irangoldtrader.ir/  ❌ (اسلش اضافی)
CORS_ALLOWED_ORIGINS=https://irangoldtrader.ir, https://www.irangoldtrader.ir  ❌ (فاصله اضافی)
```

---

## 📱 متغیرهای Frontend

### ✅ NEXT_PUBLIC_API_URL
- [ ] **مقدار:** `https://irangoldtrader.ir/api`
- [ ] **با https شروع می‌شود**
- [ ] **شامل `/api` در انتها**
- [ ] **بدون اسلش اضافی**

**مثال صحیح:**
```env
NEXT_PUBLIC_API_URL=https://irangoldtrader.ir/api
```

**مثال اشتباه:**
```env
NEXT_PUBLIC_API_URL=http://irangoldtrader.ir/api  ❌ (http به جای https)
NEXT_PUBLIC_API_URL=https://irangoldtrader.ir/api/  ❌ (اسلش اضافی)
NEXT_PUBLIC_API_URL=http://localhost/api  ❌ (برای production)
```

---

## 📞 متغیرهای API (اختیاری اما توصیه می‌شود)

### ✅ KAVENEGAR_API_KEY
- [ ] **وجود دارد** (حتی اگر placeholder باشد)
- [ ] **اگر دارید، مقدار واقعی** را قرار دهید

**مثال:**
```env
KAVENEGAR_API_KEY=your-actual-api-key-here
# یا موقتاً:
KAVENEGAR_API_KEY=placeholder-key-will-update-later
```

---

## 📋 چک‌لیست نهایی

### فرمت فایل
- [ ] **هر متغیر در یک خط** جداگانه
- [ ] **بدون فاصله** قبل و بعد از `=`
- [ ] **بدون کامنت** در انتهای خط (مگر با `#` در ابتدای خط)
- [ ] **بدون خط خالی** غیرضروری بین متغیرها

### امنیت
- [ ] **هیچ مقدار placeholder** باقی نمانده (`YOUR_...`, `your-...`)
- [ ] **DJANGO_SECRET_KEY** واقعی و امن است
- [ ] **DB_PASSWORD** قوی و امن است
- [ ] **DJANGO_DEBUG=False** است

### صحت مقادیر
- [ ] **همه URL ها با https** هستند (نه http)
- [ ] **دامنه‌ها صحیح** هستند (`irangoldtrader.ir`)
- [ ] **پورت‌ها صحیح** هستند (5432 برای DB، 6379 برای Redis)
- [ ] **نام service ها صحیح** هستند (`db` برای database، `redis` برای Redis)

---

## 🔍 مثال فایل .env کامل و صحیح

```env
# Django Settings
DJANGO_SECRET_KEY=django-insecure-abc123xyz789... (حداقل 50 کاراکتر)
DJANGO_DEBUG=False
ALLOWED_HOSTS=irangoldtrader.ir,www.irangoldtrader.ir

# Database Settings
DB_NAME=gold_trading
DB_USER=postgres
DB_PASSWORD=MyStr0ng!P@ssw0rd#2024
DB_HOST=db
DB_PORT=5432

# Redis Settings
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# CORS Settings
CORS_ALLOWED_ORIGINS=https://irangoldtrader.ir,https://www.irangoldtrader.ir

# Kavenegar SMS API
KAVENEGAR_API_KEY=your-kavenegar-api-key

# Frontend Settings
NEXT_PUBLIC_API_URL=https://irangoldtrader.ir/api
```

---

## ⚠️ خطاهای رایج

1. ❌ استفاده از `http://` به جای `https://` در production
2. ❌ فاصله اضافی در `ALLOWED_HOSTS` یا `CORS_ALLOWED_ORIGINS`
3. ❌ اسلش اضافی در انتهای URL ها
4. ❌ استفاده از `localhost` در production
5. ❌ `DJANGO_DEBUG=True` در production
6. ❌ Secret Key یا Password ضعیف
7. ❌ مقدار placeholder باقی مانده

---

**بعد از بررسی این چک‌لیست، فایل .env را روی سرور قرار دهید.**

