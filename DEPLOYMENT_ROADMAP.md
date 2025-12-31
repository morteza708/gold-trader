# 🚀 راهنمای کامل دیپلوی پروژه Gold Trading Platform

## 📋 فهرست مراحل

### ✅ **فاز 0: Git Setup** (امشب - انجام شده)
- [x] ایجاد `.gitignore`
- [x] `git init`
- [x] Commit اولیه
- [x] اتصال به GitHub
- [x] ایجاد branch strategy

---

### 🔵 **فاز 1: Docker Setup** (فردا - اولویت اول)

**هدف:** اجرای پروژه به صورت کامل با Docker روی سیستم محلی

#### مراحل:
1. **ایجاد Dockerfile برای Backend**
   - Base image: Python 3.12
   - نصب dependencies از requirements.txt
   - کپی فایل‌های پروژه
   - تنظیم working directory
   - Expose port 8000

2. **ایجاد Dockerfile برای Frontend**
   - Base image: Node.js 20
   - نصب dependencies
   - Build Next.js
   - Expose port 3000

3. **ایجاد docker-compose.yml**
   - **services:**
     - `db`: PostgreSQL 15
     - `redis`: Redis 7 (برای Celery)
     - `backend`: Django app
     - `frontend`: Next.js app
     - `celery_worker`: Celery worker
     - `celery_beat`: Celery beat scheduler
     - `nginx`: Reverse proxy (بعداً اضافه می‌شود)

4. **تنظیم Environment Variables**
   - ایجاد `.env.example`
   - ایجاد `.env` برای development
   - تنظیم `django-environ` در settings

5. **Volume Management**
   - PostgreSQL data volume
   - Redis data volume
   - Media files volume
   - Static files volume

6. **Network Configuration**
   - ایجاد custom network برای ارتباط بین services

**زمان تقریبی:** 2-3 ساعت

**نکات مهم:**
- قبل از اضافه کردن دامنه، همه چیز باید روی localhost کار کند
- تست کامل: Backend API، Frontend UI، Database، Redis
- بررسی logs برای هر service

---

### 🟢 **فاز 2: Code Review & Security** (بعد از Docker)

**هدف:** بررسی و بهبود کد، امنیت و عملکرد

#### مراحل:

1. **Linting & Formatting**
   - Backend: `black`, `flake8`, `pylint`
   - Frontend: `eslint`, `prettier`
   - ایجاد pre-commit hooks

2. **Security Audit**
   - بررسی Django security settings
   - CORS configuration
   - Rate limiting (django-ratelimit)
   - Input validation
   - SQL injection prevention
   - XSS prevention
   - CSRF protection
   - Security headers

3. **Query Optimization**
   - بررسی تمام query ها
   - استفاده از `select_related` و `prefetch_related`
   - بررسی database indexes
   - استفاده از `only()` و `defer()` برای فیلدهای خاص

4. **Logging Setup**
   - Structured logging
   - Log levels (DEBUG, INFO, WARNING, ERROR)
   - Log rotation
   - Error tracking (Sentry - بعداً)

5. **Error Handling**
   - Custom error pages (404, 500)
   - API error responses
   - Frontend error boundaries

**زمان تقریبی:** 2-3 ساعت

---

### 🟡 **فاز 3: Celery Integration** (بعد از Code Review)

**هدف:** اجرای background tasks برای SMS و معاملات هوشمند

#### مراحل:

1. **نصب و تنظیم Celery**
   - اضافه کردن `celery` و `redis` به requirements.txt
   - ایجاد `config/celery.py`
   - ایجاد `config/celeryconfig.py`
   - تنظیم در `settings.py`

2. **ایجاد Tasks**
   - `wallet/tasks.py`: ارسال SMS (async)
   - `trades/tasks.py`: بررسی و اجرای سفارشات هوشمند (periodic)
   - `trades/tasks.py`: به‌روزرسانی قیمت از API (در صورت نیاز)

3. **Celery Beat Configuration**
   - تنظیم periodic tasks
   - Schedule برای هر task

4. **Docker Integration**
   - اضافه کردن `celery_worker` service
   - اضافه کردن `celery_beat` service
   - تنظیم dependencies

5. **Testing**
   - تست async SMS sending
   - تست periodic order checking
   - بررسی logs

**زمان تقریبی:** 3-4 ساعت

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

### 🟠 **فاز 4: PWA Implementation** (بعد از Celery)

**هدف:** تبدیل پروژه به Progressive Web App با Push Notifications

#### مراحل:

1. **PWA Setup**
   - ایجاد `public/manifest.json`
   - تنظیم app icons (192x192, 512x512)
   - تنظیم theme colors
   - تنظیم display mode

2. **Service Worker**
   - ایجاد `public/sw.js`
   - Caching strategy:
     - Static assets: Cache First
     - API responses: Network First
     - Images: Cache First with fallback
   - Offline support
   - Background sync

3. **Push Notifications (Web Push API)**
   - تنظیم VAPID keys
   - Backend endpoint برای subscription
   - Backend endpoint برای ارسال notifications
   - Service Worker برای دریافت notifications
   - Frontend component برای request permission
   - Frontend component برای نمایش notifications

4. **Install Prompt**
   - ایجاد install button
   - قبل از install prompt نمایش

5. **Testing**
   - تست PWA در Chrome DevTools
   - تست Push Notifications
   - تست Offline mode
   - تست Install prompt

**زمان تقریبی:** 4-5 ساعت

**فایل‌های مورد نیاز:**
- `public/manifest.json`
- `public/sw.js`
- `public/icons/` (app icons)
- `backend/notifications/` (app جدید)
- `frontend/components/NotificationPermission.tsx`
- `frontend/components/InstallPrompt.tsx`

---

### 🔴 **فاز 5: Notification System** (بعد از PWA)

**هدف:** سیستم اعلانات کامل در پنل کاربری

#### مراحل:

1. **Backend - مدل Notification**
   - ایجاد `notifications/models.py`
   - فیلدها: user, title, message, type, is_read, created_at
   - Migration

2. **Backend - API Endpoints**
   - `GET /api/notifications/` - دریافت notifications
   - `PUT /api/notifications/<id>/read/` - Mark as read
   - `DELETE /api/notifications/<id>/` - Delete notification
   - `GET /api/notifications/unread-count/` - تعداد unread

3. **Backend - Integration**
   - ایجاد notification هنگام:
     - تایید درخواست واریز
     - تایید درخواست برداشت
     - رد درخواست
     - اجرای سفارش هوشمند
     - تغییر قیمت طلا (اختیاری)

4. **Frontend - Components**
   - `NotificationBell.tsx` - آیکون زنگ با badge
   - `NotificationList.tsx` - لیست notifications
   - `NotificationItem.tsx` - آیتم notification
   - `NotificationModal.tsx` - مودال notifications

5. **Frontend - Real-time Updates**
   - Polling هر 30 ثانیه (یا WebSocket در آینده)
   - Update badge count
   - نمایش toast برای notifications جدید

6. **Integration با Push Notifications**
   - ارسال push notification هنگام ایجاد notification جدید

**زمان تقریبی:** 3-4 ساعت

---

### 🟣 **فاز 6: Nginx Configuration** (بعد از Notification System)

**هدف:** Reverse proxy و بهینه‌سازی عملکرد

#### مراحل:

1. **Nginx Configuration**
   - Reverse proxy برای Backend (port 8000)
   - Reverse proxy برای Frontend (port 3000)
   - Static files serving
   - Media files serving

2. **SSL/TLS Setup** (بعد از اضافه کردن دامنه)
   - Let's Encrypt certificate
   - Auto-renewal
   - HTTP to HTTPS redirect

3. **Performance Optimization**
   - Gzip compression
   - Browser caching
   - Static files caching
   - API response caching (اختیاری)

4. **Security Headers**
   - Content Security Policy (CSP)
   - X-Frame-Options
   - X-Content-Type-Options
   - HSTS
   - Referrer-Policy

5. **Rate Limiting**
   - Rate limiting برای API endpoints
   - Rate limiting برای authentication

6. **Docker Integration**
   - اضافه کردن nginx service به docker-compose
   - تنظیم volumes برای SSL certificates

**زمان تقریبی:** 2-3 ساعت

**نکات:**
- Nginx را بعد از تست کامل Docker اضافه می‌کنیم
- SSL را بعد از اضافه کردن دامنه تنظیم می‌کنیم

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

### روز 1 (امشب):
- ✅ Git Setup

### روز 2:
- 🔵 فاز 1: Docker Setup (2-3 ساعت)
- تست کامل روی localhost

### روز 3:
- 🟢 فاز 2: Code Review & Security (2-3 ساعت)
- 🟡 فاز 3: Celery Integration (3-4 ساعت)

### روز 4:
- 🟠 فاز 4: PWA Implementation (4-5 ساعت)

### روز 5:
- 🔴 فاز 5: Notification System (3-4 ساعت)
- 🟣 فاز 6: Nginx Configuration (2-3 ساعت)

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

**آخرین به‌روزرسانی:** 1404/10/16
**نسخه:** 1.0

