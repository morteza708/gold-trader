# ✅ چک‌لیست Deployment

این چک‌لیست برای اطمینان از آماده‌سازی کامل پروژه برای deployment است.

## 📋 قبل از شروع Deployment

### سرور و دامنه
- [x] سرور لینوکس از پارس پک تهیه شده
- [x] دامنه `irangoldtrader.ir` خریداری شده
- [ ] IP سرور در دسترس است
- [ ] دسترسی SSH به سرور برقرار است

### تنظیمات پروژه
- [ ] فایل `.env` برای production ایجاد شده
- [ ] `DJANGO_SECRET_KEY` تولید و تنظیم شده
- [ ] `DJANGO_DEBUG=False` تنظیم شده
- [ ] `ALLOWED_HOSTS` شامل `irangoldtrader.ir,www.irangoldtrader.ir` است
- [ ] `CORS_ALLOWED_ORIGINS` شامل `https://irangoldtrader.ir,https://www.irangoldtrader.ir` است
- [ ] `DB_PASSWORD` قوی و امن تنظیم شده
- [ ] `NEXT_PUBLIC_API_URL` به `https://irangoldtrader.ir/api` تنظیم شده
- [ ] `KAVENEGAR_API_KEY` تنظیم شده

### فایل‌های Configuration
- [ ] `nginx/nginx.production.conf` بررسی شده
- [ ] `docker-compose.production.yml` بررسی شده
- [ ] فایل‌های پروژه روی سرور آپلود شده‌اند

## 🔧 مراحل Deployment

### مرحله 1: آماده‌سازی سرور
- [ ] سیستم به‌روزرسانی شده (`apt update && apt upgrade`)
- [ ] Docker نصب شده
- [ ] Docker Compose نصب شده
- [ ] Firewall تنظیم شده (پورت‌های 22, 80, 443 باز هستند)

### مرحله 2: تنظیم DNS
- [ ] A Record برای `irangoldtrader.ir` تنظیم شده
- [ ] CNAME برای `www.irangoldtrader.ir` تنظیم شده (اختیاری)
- [ ] DNS propagation بررسی شده (می‌تواند 24-48 ساعت طول بکشد)

### مرحله 3: تنظیم SSL
- [ ] Certbot نصب شده
- [ ] SSL Certificate دریافت شده
- [ ] Auto-renewal تنظیم شده

### مرحله 4: Docker Setup
- [ ] پروژه روی سرور clone/upload شده
- [ ] فایل `.env` در root پروژه ایجاد شده
- [ ] `docker-compose.production.yml` بررسی شده
- [ ] `nginx.production.conf` به `nginx.conf` کپی شده (یا در docker-compose تنظیم شده)

### مرحله 5: Build و Run
- [ ] Docker images build شده‌اند
- [ ] Services اجرا شده‌اند
- [ ] همه containers در حال اجرا هستند

### مرحله 6: Database Setup
- [ ] Migrations اجرا شده‌اند
- [ ] Superuser ایجاد شده
- [ ] Static files جمع‌آوری شده‌اند

### مرحله 7: تست
- [ ] HTTP به HTTPS redirect می‌شود
- [ ] HTTPS کار می‌کند
- [ ] Frontend قابل دسترسی است
- [ ] API endpoints کار می‌کنند
- [ ] Admin Panel قابل دسترسی است
- [ ] Django Admin قابل دسترسی است

## 🔐 امنیت

- [ ] Firewall فعال است
- [ ] SSL Certificate معتبر است
- [ ] `DJANGO_DEBUG=False` است
- [ ] Secret Key امن است
- [ ] Database Password قوی است
- [ ] فایل `.env` در `.gitignore` است

## 📊 Monitoring

- [ ] Logs بررسی شده‌اند
- [ ] Resource usage بررسی شده
- [ ] Backup strategy تنظیم شده

## 🚨 Troubleshooting

در صورت بروز مشکل:
1. Logs را بررسی کنید: `docker-compose logs`
2. وضعیت containers را بررسی کنید: `docker-compose ps`
3. راهنمای `DEPLOYMENT_GUIDE.md` را مطالعه کنید

---

**نکته:** این چک‌لیست را به صورت کامل پر کنید و هر مرحله را به دقت انجام دهید.

