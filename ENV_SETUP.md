# 🔐 راهنمای تنظیم فایل .env

این فایل شامل تنظیمات محیطی (Environment Variables) پروژه است.

## 📝 ایجاد فایل .env

```bash
# کپی کردن از فایل نمونه (اگر وجود دارد)
cp .env.example .env

# یا ایجاد فایل جدید
touch .env
```

## 🔧 تنظیمات برای Development (Localhost)

```env
# Django Settings
DJANGO_SECRET_KEY=your-secret-key-here-change-in-production
DJANGO_DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database Settings
DB_NAME=gold_trading
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=db
DB_PORT=5432

# Redis Settings
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# CORS Settings
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Kavenegar SMS API
KAVENEGAR_API_KEY=your-kavenegar-api-key

# Frontend Settings
NEXT_PUBLIC_API_URL=http://localhost/api
```

## 🚀 تنظیمات برای Production

```env
# Django Settings
DJANGO_SECRET_KEY=YOUR_VERY_SECURE_SECRET_KEY_HERE
DJANGO_DEBUG=False
ALLOWED_HOSTS=irangoldtrader.ir,www.irangoldtrader.ir

# Database Settings
DB_NAME=gold_trading
DB_USER=postgres
DB_PASSWORD=YOUR_SECURE_DB_PASSWORD
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

## 🔑 تولید Secret Key

برای تولید یک Secret Key امن برای Django:

```bash
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

یا:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
```

## ⚠️ نکات امنیتی

1. **هرگز** فایل `.env` را در Git commit نکنید
2. فایل `.env` باید در `.gitignore` باشد
3. `DJANGO_SECRET_KEY` را به صورت منظم تغییر دهید
4. `DB_PASSWORD` را قوی انتخاب کنید (حداقل 16 کاراکتر)
5. در production حتماً `DJANGO_DEBUG=False` باشد
6. API Key های خود را محافظت کنید

## 📋 چک‌لیست قبل از Deployment

- [ ] `DJANGO_SECRET_KEY` تغییر کرده و امن است
- [ ] `DJANGO_DEBUG=False` برای production
- [ ] `ALLOWED_HOSTS` شامل دامنه production است
- [ ] `CORS_ALLOWED_ORIGINS` شامل URL های production است
- [ ] `DB_PASSWORD` قوی و امن است
- [ ] `NEXT_PUBLIC_API_URL` به URL production اشاره می‌کند
- [ ] همه API Key ها تنظیم شده‌اند

---

**آخرین به‌روزرسانی:** 1404/10/17

