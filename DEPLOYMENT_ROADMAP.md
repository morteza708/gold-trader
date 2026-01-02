# 🚀 راهنمای کامل دیپلوی پروژه Gold Trading Platform

## 📋 فهرست مراحل

### ✅ **فاز 0: Git Setup** (انجام شده)
- [x] ایجاد `.gitignore`
- [x] `git init`
- [x] Commit اولیه
- [x] اتصال به GitHub
- [x] ایجاد branch strategy

---

### 🔵 **فاز 1: Docker Setup** (اولویت اول - آماده برای اجرا)

**هدف:** اجرای پروژه به صورت کامل با Docker روی سیستم محلی

#### وضعیت فعلی:
- ✅ Dockerfile برای Backend ایجاد شده
- ✅ Dockerfile برای Frontend ایجاد شده
- ✅ docker-compose.yml ایجاد شده
- ✅ `.env.example` ایجاد شده
- ✅ DOCKER_SETUP.md راهنما موجود است

#### مراحل باقی‌مانده:
1. **ایجاد فایل `.env` از `.env.example`**
   ```bash
   cp .env.example .env
   ```
   سپس مقادیر را تنظیم کنید (مخصوصاً `DJANGO_SECRET_KEY` و `KAVENEGAR_API_KEY`)

2. **Build و Run Docker Containers**
   ```bash
   # Build images
   docker-compose build
   
   # Start all services
   docker-compose up -d
   
   # مشاهده logs
   docker-compose logs -f
   ```

3. **اجرای Migrations و ایجاد Superuser**
   ```bash
   # Migration
   docker-compose exec backend python manage.py migrate
   
   # ایجاد superuser
   docker-compose exec backend python manage.py createsuperuser
   ```

4. **تست کامل**
   - تست Backend API: http://localhost:8000/api
   - تست Frontend: http://localhost:3000
   - تست Admin Panel: http://localhost:8000/admin
   - تست Database connection
   - تست Redis connection

**زمان تقریبی:** 30 دقیقه - 1 ساعت

**نکات مهم:**
- قبل از اضافه کردن دامنه، همه چیز باید روی localhost کار کند
- تست کامل: Backend API، Frontend UI، Database، Redis
- بررسی logs برای هر service

---

### ✅ **فاز 2: Code Review & Security** (تکمیل شده)

**هدف:** بررسی و بهبود کد، امنیت و عملکرد

#### ✅ انجام شده:

1. **✅ Security Settings**
   - ✅ افزودن Security Headers (SECURE_SSL_REDIRECT, HSTS, X_FRAME_OPTIONS)
   - ✅ تنظیمات CSRF و Session برای production
   - ✅ ALLOWED_HOSTS از environment variable

2. **✅ Rate Limiting**
   - ✅ نصب django-ratelimit
   - ✅ Rate limiting برای endpoint های مهم:
     - OTP endpoints: 5-10 requests/minute
     - Trade endpoints: 30 requests/minute
     - Wallet endpoints: 10 requests/minute
   - ✅ Custom exception handler برای Rate Limiting

3. **✅ Query Optimization**
   - ✅ بهینه‌سازی query ها با select_related و prefetch_related
   - ✅ بهبود query های Wallet, Trades, Accounts

4. **✅ Logging Setup**
   - ✅ Structured logging configuration
   - ✅ Log rotation (5 MB, 5 backups)
   - ✅ Logger های جداگانه برای هر app
   - ✅ جایگزینی print با logging

5. **✅ Error Handling**
   - ✅ Custom exception handler برای DRF
   - ✅ بهبود error messages (بدون نمایش جزئیات به کاربر)
   - ✅ استفاده از logging برای error tracking

**زمان صرف شده:** ~2 ساعت

---

### ✅ **فاز 3: Celery Integration** (تکمیل شده)

**هدف:** اجرای background tasks برای SMS و معاملات هوشمند

#### ✅ انجام شده:

1. **✅ نصب و تنظیم Celery**
   - ✅ اضافه کردن `celery` و `redis` به requirements.txt
   - ✅ ایجاد `config/celery.py`
   - ✅ تنظیم در `settings.py` با environment variables
   - ✅ تنظیم Celery در `config/__init__.py`

2. **✅ ایجاد Tasks**
   - ✅ `wallet/tasks.py`: ارسال SMS (async) با retry mechanism
   - ✅ `wallet/tasks.py`: ارسال دسته‌ای SMS
   - ✅ `trades/tasks.py`: بررسی و اجرای سفارشات هوشمند (periodic)

3. **✅ Celery Beat Configuration**
   - ✅ تنظیم periodic task در `settings.py`
   - ✅ Schedule: هر 30 ثانیه برای بررسی سفارشات

4. **✅ Docker Integration**
   - ✅ فعال کردن `celery_worker` service
   - ✅ فعال کردن `celery_beat` service
   - ✅ تنظیم dependencies و health checks

5. **✅ به‌روزرسانی Views**
   - ✅ تبدیل تمام SMS ارسال‌ها به async
   - ✅ استفاده از `send_sms_async.delay()` در تمام views
   - ✅ حفظ منطق پروژه (فقط async شدن SMS)

**زمان صرف شده:** ~3 ساعت

**Tasks پیشنهادی:**
```python
# wallet/tasks.py
@shared_task
def send_sms_async(phone_number, template, tokens):
    """ارسال SMS به صورت async"""

# trades/tasks.py
@shared_task
def check_and_execute_pending_orders():
    """بررسی و اجرای سفارشات هوشمند (هر 30 ثانیه)"""

@shared_task
def update_gold_price_from_api():
    """به‌روزرسانی قیمت از API (در صورت نیاز)"""
```

---

### ✅ **فاز 4: PWA Implementation** (تکمیل شده)

**هدف:** تبدیل پروژه به Progressive Web App با Push Notifications

#### ✅ انجام شده:

1. **✅ PWA Setup**
   - ✅ ایجاد `public/manifest.json` با تنظیمات کامل
   - ✅ تنظیم theme colors (#D4AF37)
   - ✅ تنظیم display mode (standalone)
   - ✅ تنظیم shortcuts برای معاملات و کیف پول
   - ✅ README برای icons (نیاز به اضافه کردن icon ها)

2. **✅ Service Worker**
   - ✅ ایجاد `public/sw.js` با caching strategy:
     - Static assets: Cache First
     - API responses: Network First
     - Images: Cache First with fallback
   - ✅ Offline support
   - ✅ Background sync support
   - ✅ Push notification handling

3. **✅ Push Notifications (Web Push API)**
   - ✅ ایجاد app `notifications` در Backend
   - ✅ مدل `PushSubscription` برای ذخیره subscriptions
   - ✅ API endpoints:
     - `POST /api/notifications/push/subscribe/` - ثبت subscription
     - `POST /api/notifications/push/unsubscribe/` - حذف subscription
     - `GET /api/notifications/push/subscriptions/` - لیست subscriptions
   - ✅ Service Worker برای دریافت notifications
   - ✅ Frontend component `NotificationPermission` برای request permission

4. **✅ Install Prompt**
   - ✅ ایجاد `InstallPrompt` component
   - ✅ نمایش خودکار هنگام beforeinstallprompt
   - ✅ ذخیره dismiss برای 7 روز

5. **✅ Integration**
   - ✅ اضافه کردن Service Worker Registration به layout
   - ✅ اضافه کردن InstallPrompt به layout
   - ✅ تنظیم metadata در layout.tsx
   - ✅ تنظیم headers در next.config.ts

**زمان صرف شده:** ~3 ساعت

**نکات:**
- Icon ها باید به `public/icons/` اضافه شوند (راهنمایی در README موجود است)
- برای ارسال Push Notifications، نیاز به VAPID keys و کتابخانه `pywebpush` است (برای فاز 5)

**فایل‌های مورد نیاز:**
- `public/manifest.json`
- `public/sw.js`
- `public/icons/` (app icons)
- `backend/notifications/` (app جدید)
- `frontend/components/NotificationPermission.tsx`
- `frontend/components/InstallPrompt.tsx`

---

### ✅ **فاز 5: Notification System** (تکمیل شده)

**هدف:** سیستم اعلانات کامل در پنل کاربری

#### ✅ انجام شده:

1. **✅ Backend - مدل Notification**
   - ✅ ایجاد `notifications/models.py` با مدل `Notification`
   - ✅ فیلدها: user, title, message, type, is_read, read_at, created_at, related_object_type, related_object_id, metadata
   - ✅ Migration اجرا شده

2. **✅ Backend - API Endpoints**
   - ✅ `GET /api/notifications/` - دریافت notifications با فیلتر (is_read, type, limit)
   - ✅ `PUT /api/notifications/<id>/read/` - Mark as read
   - ✅ `PUT /api/notifications/mark-all-read/` - Mark all as read
   - ✅ `DELETE /api/notifications/<id>/` - Delete notification
   - ✅ `GET /api/notifications/unread-count/` - تعداد unread
   - ✅ Rate limiting برای تمام endpoints

3. **✅ Backend - Integration**
   - ✅ ایجاد notification هنگام:
     - ✅ تایید درخواست واریز (`admin_approve_deposit`, `admin_approve_deposit_new_flow`)
     - ✅ رد درخواست واریز (`admin_reject_deposit`)
     - ✅ تایید درخواست برداشت (`admin_approve_withdrawal`, `admin_approve_deposit_new_flow`)
     - ✅ رد درخواست برداشت (`admin_reject_withdrawal`)
     - ✅ تکمیل برداشت طلا (`admin_approve_withdrawal_gold`)
     - ✅ اجرای سفارش هوشمند (`TradeService.execute_limit_order`)

4. **✅ Backend - Services**
   - ✅ `notifications/services.py` با تابع `create_notification`
   - ✅ `send_push_notification_async` برای آماده‌سازی Push Notifications (آینده)

5. **✅ Frontend - API Functions**
   - ✅ `lib/api/notifications.ts` با تمام API functions

6. **✅ Frontend - Components**
   - ✅ `NotificationBell.tsx` - آیکون زنگ با badge و polling
   - ✅ `NotificationModal.tsx` - مودال notifications با قابلیت‌های:
     - نمایش لیست notifications
     - Mark as read
     - Mark all as read
     - Delete notification
     - نمایش آیکون و رنگ بر اساس نوع

7. **✅ Frontend - Real-time Updates**
   - ✅ Polling هر 30 ثانیه برای به‌روزرسانی unread count
   - ✅ Update badge count به صورت خودکار
   - ✅ Integration در dashboard layout

8. **✅ Admin Panel**
   - ✅ ثبت `Notification` در Django Admin
   - ✅ فیلتر و جستجو

**زمان صرف شده:** ~4 ساعت

**نکات:**
- Push Notifications (Web Push API) در فاز بعدی کامل می‌شود
- در حال حاضر notification ها در UI نمایش داده می‌شوند
- Polling هر 30 ثانیه انجام می‌شود (می‌توان در آینده به WebSocket تغییر داد)

---

### ✅ **فاز 6: Nginx Configuration** (تکمیل شده)

**هدف:** Reverse proxy و بهینه‌سازی عملکرد

#### ✅ انجام شده:

1. **✅ Nginx Configuration**
   - ✅ Reverse proxy برای Backend (port 8000)
   - ✅ Reverse proxy برای Frontend (port 3000)
   - ✅ Static files serving
   - ✅ Media files serving
   - ✅ فایل `nginx.conf` با تنظیمات کامل
   - ✅ Dockerfile برای Nginx

2. **✅ SSL/TLS Setup** (آماده برای production)
   - ✅ تنظیمات HTTPS در nginx.conf (کامنت شده)
   - ✅ آماده برای Let's Encrypt certificate
   - ✅ HTTP to HTTPS redirect (آماده)

3. **✅ Performance Optimization**
   - ✅ Gzip compression
   - ✅ Browser caching (30 روز برای static, 7 روز برای media)
   - ✅ Static files caching
   - ✅ Keepalive connections

4. **✅ Security Headers**
   - ✅ Content Security Policy (CSP)
   - ✅ X-Frame-Options
   - ✅ X-Content-Type-Options
   - ✅ X-XSS-Protection
   - ✅ HSTS (آماده برای HTTPS)
   - ✅ Referrer-Policy

5. **✅ Rate Limiting**
   - ✅ Rate limiting برای API endpoints (30 req/min)
   - ✅ Rate limiting برای authentication (10 req/min)
   - ✅ Rate limiting برای general requests (100 req/min)

6. **✅ Docker Integration**
   - ✅ اضافه کردن nginx service به docker-compose
   - ✅ تنظیم volumes برای static و media files
   - ✅ تنظیم dependencies

**زمان صرف شده:** ~2 ساعت

**فایل‌های ایجاد شده:**
- `nginx/nginx.conf` - تنظیمات اصلی Nginx
- `nginx/Dockerfile` - Dockerfile برای Nginx
- `nginx/README.md` - راهنمای استفاده
- `nginx/TESTING.md` - راهنمای تست

**نکات:**
- ✅ Nginx برای localhost آماده است
- ⏳ SSL را بعد از اضافه کردن دامنه تنظیم می‌کنیم (فاز 7)

---

### 🟤 **فاز 7: Domain Setup** (بعد از تست کامل Docker)

**هدف:** اضافه کردن دامنه به پروژه

#### زمان مناسب:
**بعد از اینکه:**
- ✅ Docker setup کامل شد
- ✅ همه services به درستی کار می‌کنند
- ✅ تست کامل روی localhost انجام شد
- ✅ Nginx configuration آماده شد

#### مراحل:

1. **DNS Configuration**
   - تنظیم A record به IP سرور
   - تنظیم CNAME برای www (اختیاری)

2. **Docker Configuration**
   - به‌روزرسانی ALLOWED_HOSTS در Django
   - به‌روزرسانی CORS_ALLOWED_ORIGINS
   - به‌روزرسانی Nginx server_name

3. **SSL Certificate**
   - نصب Certbot
   - دریافت Let's Encrypt certificate
   - تنظیم auto-renewal

4. **Testing**
   - تست دسترسی با دامنه
   - تست SSL certificate
   - تست همه endpoints

**زمان تقریبی:** 1-2 ساعت

**نکات مهم:**
- دامنه را فقط بعد از تست کامل Docker اضافه می‌کنیم
- قبل از اضافه کردن دامنه، همه چیز باید روی localhost کار کند

---

### ⚪ **فاز 8: CI/CD Pipeline** (بعد از Domain Setup)

**هدف:** Automated testing و deployment

#### مراحل:

1. **GitHub Actions Setup**
   - ایجاد `.github/workflows/ci.yml`
   - Automated testing
   - Code quality checks
   - Security scanning

2. **Docker Build & Push**
   - Build Docker images
   - Push to Docker Hub یا GitHub Container Registry
   - Tag management

3. **Deployment Automation**
   - SSH deployment script
   - Docker compose pull & up
   - Database migration
   - Static files collection

4. **Testing**
   - تست CI/CD pipeline
   - تست deployment

**زمان تقریبی:** 2-3 ساعت

---

### 🔵 **فاز 9: Monitoring & Error Tracking** (بعد از CI/CD)

**هدف:** Monitoring و error tracking با Sentry

#### مراحل:

1. **Sentry Setup**
   - ایجاد account در Sentry
   - نصب `sentry-sdk` در Backend
   - نصب `@sentry/nextjs` در Frontend
   - تنظیم DSN

2. **Error Tracking**
   - Backend error tracking
   - Frontend error tracking
   - Performance monitoring

3. **Alerts**
   - Email alerts برای errors
   - Slack integration (اختیاری)

**زمان تقریبی:** 1-2 ساعت

**نکات:**
- این فاز را بعد از دیپلوی کامل انجام می‌دهیم
- می‌توانیم بعداً اضافه کنیم

---

### 🟢 **فاز 10: Server Deployment** (بعد از تست کامل)

**هدف:** دیپلوی روی سرور لینوکس

#### پیش‌نیازها:
- ✅ تمام فازهای قبلی کامل شده
- ✅ تست کامل روی سیستم محلی
- ✅ Docker images آماده
- ✅ دامنه تنظیم شده

#### مراحل:

1. **Server Preparation**
   - نصب Docker و Docker Compose
   - نصب Nginx
   - تنظیم firewall
   - ایجاد user برای deployment

2. **Project Setup**
   - Clone repository
   - تنظیم environment variables
   - تنظیم volumes
   - تنظیم permissions

3. **Database Migration**
   - اجرای migrations
   - ایجاد superuser
   - Import initial data (در صورت نیاز)

4. **Service Startup**
   - Start Docker services
   - بررسی logs
   - تست endpoints

5. **Nginx Configuration**
   - تنظیم reverse proxy
   - تنظیم SSL
   - تست دسترسی

6. **Monitoring**
   - بررسی resource usage
   - بررسی logs
   - تست performance

**زمان تقریبی:** 3-4 ساعت

---

## 📅 Timeline پیشنهادی

### ✅ انجام شده:
- ✅ Git Setup
- ✅ Docker Setup (Dockerfile ها و docker-compose.yml آماده است)

### 🔵 **گام بعدی (الان):**
- 🔵 فاز 1: تست و راه‌اندازی Docker (30 دقیقه - 1 ساعت)
  1. ایجاد `.env` از `.env.example`
  2. Build و Run containers
  3. اجرای migrations
  4. ایجاد superuser
  5. تست کامل روی localhost

### روز 3:
- 🟢 فاز 2: Code Review & Security (2-3 ساعت)
- 🟡 فاز 3: Celery Integration (3-4 ساعت)

### روز 4:
- ✅ فاز 4: PWA Implementation (تکمیل شده)

### روز 5:
- ✅ فاز 5: Notification System (تکمیل شده)
- 🟣 فاز 6: Nginx Configuration (بعدی)

### روز 6:
- 🟤 فاز 7: Domain Setup (1-2 ساعت)
- تست کامل با دامنه

### روز 7:
- ⚪ فاز 8: CI/CD Pipeline (2-3 ساعت)
- 🔵 فاز 9: Monitoring (1-2 ساعت)

### روز 8:
- 🟢 فاز 10: Server Deployment (3-4 ساعت)
- تست نهایی

---

## 📝 Checklist برای هر فاز

قبل از شروع هر فاز:
- [ ] بررسی مستندات
- [ ] آماده کردن environment
- [ ] Backup از داده‌های مهم

بعد از اتمام هر فاز:
- [ ] تست کامل functionality
- [ ] بررسی logs
- [ ] بررسی performance
- [ ] Update مستندات
- [ ] Commit changes به Git

---

## 🔐 Environment Variables

### Backend (.env):
```env
# Django
DEBUG=False
SECRET_KEY=your-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1,yourdomain.com

# Database
DB_NAME=gold_trading
DB_USER=postgres
DB_PASSWORD=your-password
DB_HOST=db
DB_PORT=5432

# Redis
REDIS_URL=redis://redis:6379/0

# Celery
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# Kavenegar
KAVENEGAR_API_KEY=your-api-key

# Media & Static
MEDIA_ROOT=/app/media
STATIC_ROOT=/app/staticfiles
```

### Frontend (.env.local):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

---

## 🚨 نکات مهم

1. **همیشه backup بگیرید** قبل از تغییرات بزرگ
2. **تست کنید** بعد از هر تغییر
3. **Logs را بررسی کنید** برای debugging
4. **Environment variables** را در `.gitignore` قرار دهید
5. **Secrets** را هرگز commit نکنید
6. **Database migrations** را قبل از deployment اجرا کنید
7. **Static files** را collect کنید قبل از deployment

---

## 📚 منابع مفید

- [Docker Documentation](https://docs.docker.com/)
- [Django Deployment Checklist](https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Celery Documentation](https://docs.celeryproject.org/)
- [PWA Guide](https://web.dev/progressive-web-apps/)
- [Nginx Configuration](https://nginx.org/en/docs/)

---

---

## 🎯 وضعیت فعلی پروژه (1404/10/17)

### ✅ **انجام شده:**
- ✅ Git Setup کامل
- ✅ Docker Setup (Dockerfile ها و docker-compose.yml آماده)
- ✅ `.env.example` ایجاد شده
- ✅ DOCKER_SETUP.md راهنما موجود

### 🔵 **گام بعدی (اولویت اول):**
**فاز 1: تست و راه‌اندازی Docker**

#### مراحل:
1. **ایجاد فایل `.env`:**
   ```bash
   cp .env.example .env
   ```
   سپس ویرایش کنید و مقادیر را تنظیم کنید:
   - `DJANGO_SECRET_KEY`: از [Django Secret Key Generator](https://djecrety.ir/) استفاده کنید
   - `KAVENEGAR_API_KEY`: کلید API کاوه نگار خود را وارد کنید
   - سایر مقادیر را بررسی کنید

2. **Build و Run:**
   ```bash
   docker-compose build
   docker-compose up -d
   ```

3. **اجرای Migrations:**
   ```bash
   docker-compose exec backend python manage.py migrate
   ```

4. **ایجاد Superuser:**
   ```bash
   docker-compose exec backend python manage.py createsuperuser
   ```

5. **تست:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/api
   - Admin Panel: http://localhost:8000/admin

### 🟢 **بعد از تست موفق Docker:**
- فاز 2: Code Review & Security (2-3 ساعت)
- فاز 3: Celery Integration (3-4 ساعت)

---

**آخرین به‌روزرسانی:** 1404/10/17
**نسخه:** 1.1

