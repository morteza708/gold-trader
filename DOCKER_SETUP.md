# 🐳 راهنمای Docker Setup

## 📋 پیش‌نیازها

- Docker (نسخه 20.10 یا بالاتر)
- Docker Compose (نسخه 2.0 یا بالاتر)

## 🚀 راه‌اندازی سریع

### 1. ایجاد فایل `.env`

از `.env.example` کپی کنید و مقادیر را تنظیم کنید:

```bash
cp .env.example .env
```

سپس فایل `.env` را ویرایش کنید:

```env
# Django Settings
DJANGO_SECRET_KEY=your-secret-key-here-change-in-production
DJANGO_DEBUG=True

# Database Configuration
DB_NAME=gold_trading
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=db
DB_PORT=5432

# Redis Configuration
REDIS_URL=redis://redis:6379/0

# Celery Configuration
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# Kavenegar SMS API
KAVENEGAR_API_KEY=your-kavenegar-api-key

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000/api

# Allowed Hosts (comma-separated)
ALLOWED_HOSTS=localhost,127.0.0.1
```

### 2. Build و Run

```bash
# Build images
docker-compose build

# Start all services
docker-compose up -d

# مشاهده logs
docker-compose logs -f
```

### 3. ایجاد Superuser

```bash
docker-compose exec backend python manage.py createsuperuser
```

### 4. دسترسی به سرویس‌ها

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api
- **Admin Panel**: http://localhost:8000/admin
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 📝 دستورات مفید

### مشاهده وضعیت سرویس‌ها
```bash
docker-compose ps
```

### مشاهده logs
```bash
# همه سرویس‌ها
docker-compose logs -f

# یک سرویس خاص
docker-compose logs -f backend
docker-compose logs -f frontend
```

### اجرای دستورات Django
```bash
# Migration
docker-compose exec backend python manage.py migrate

# Collect static files
docker-compose exec backend python manage.py collectstatic

# Shell
docker-compose exec backend python manage.py shell

# Create superuser
docker-compose exec backend python manage.py createsuperuser
```

### توقف سرویس‌ها
```bash
# توقف (حفظ داده‌ها)
docker-compose stop

# توقف و حذف containers
docker-compose down

# توقف و حذف containers + volumes (حذف داده‌ها)
docker-compose down -v
```

### Rebuild
```bash
# Rebuild همه images
docker-compose build --no-cache

# Rebuild یک service خاص
docker-compose build --no-cache backend
```

### دسترسی به Shell
```bash
# Backend
docker-compose exec backend bash

# Frontend
docker-compose exec frontend sh

# Database
docker-compose exec db psql -U postgres -d gold_trading
```

## 🔧 تنظیمات

### تغییر Ports

در `docker-compose.yml` می‌توانید ports را تغییر دهید:

```yaml
ports:
  - "3001:3000"  # Frontend روی port 3001
  - "8001:8000"  # Backend روی port 8001
```

### Environment Variables

متغیرهای محیطی را در فایل `.env` تنظیم کنید. این فایل در `.gitignore` است و commit نمی‌شود.

### Volumes

داده‌های پایدار در volumes ذخیره می‌شوند:
- `postgres_data`: داده‌های PostgreSQL
- `redis_data`: داده‌های Redis
- `backend_static`: فایل‌های static Django
- `backend_media`: فایل‌های media (آپلود شده)

## 🐛 Troubleshooting

### مشکل: Port در حال استفاده است
```bash
# بررسی port
lsof -i :3000
lsof -i :8000

# تغییر port در docker-compose.yml
```

### مشکل: Database connection error
```bash
# بررسی وضعیت database
docker-compose ps db

# بررسی logs
docker-compose logs db

# Restart database
docker-compose restart db
```

### مشکل: Frontend build error
```bash
# پاک کردن cache
docker-compose down
docker system prune -a

# Rebuild
docker-compose build --no-cache frontend
docker-compose up -d
```

### مشکل: Permission denied
```bash
# تغییر ownership
sudo chown -R $USER:$USER .

# یا در docker-compose.yml اضافه کنید:
user: "${UID}:${GID}"
```

## 📚 مراحل بعدی

بعد از راه‌اندازی Docker:
1. ✅ تست کامل همه endpoints
2. ✅ بررسی logs
3. ✅ تست Celery (بعد از فاز 3)
4. ✅ اضافه کردن Nginx (بعد از فاز 6)
5. ✅ اضافه کردن دامنه (بعد از تست کامل)

## 🔐 نکات امنیتی

1. **هرگز `.env` را commit نکنید**
2. **در production `DEBUG=False` تنظیم کنید**
3. **`SECRET_KEY` قوی و منحصر به فرد استفاده کنید**
4. **Database password قوی تنظیم کنید**
5. **فقط ports مورد نیاز را expose کنید**

---

**آخرین به‌روزرسانی:** 1404/10/16

