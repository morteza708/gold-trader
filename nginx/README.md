# Nginx Configuration

این پوشه شامل تنظیمات Nginx برای پروژه Gold Trading Platform است.

## ساختار فایل‌ها

- `nginx.conf`: فایل تنظیمات اصلی Nginx
- `Dockerfile`: Dockerfile برای ساخت image Nginx

## ویژگی‌ها

### ✅ Reverse Proxy
- Backend (Django): `http://backend:8000`
- Frontend (Next.js): `http://frontend:3000`

### ✅ Performance Optimization
- **Gzip Compression**: فشرده‌سازی فایل‌های استاتیک و داینامیک
- **Browser Caching**: کش برای static files (30 روز) و media files (7 روز)
- **Keepalive Connections**: بهبود عملکرد با keepalive

### ✅ Security Headers
- **X-Frame-Options**: جلوگیری از clickjacking
- **X-Content-Type-Options**: جلوگیری از MIME sniffing
- **X-XSS-Protection**: محافظت در برابر XSS
- **Referrer-Policy**: کنترل اطلاعات referrer
- **Content-Security-Policy**: کنترل منابع قابل بارگذاری
- **HSTS**: HTTP Strict Transport Security (برای HTTPS)

### ✅ Rate Limiting
- **API Endpoints**: 30 requests/minute
- **Authentication Endpoints**: 10 requests/minute
- **General Requests**: 100 requests/minute

### ✅ Static & Media Files
- Static files: `/static/` → `/app/staticfiles/`
- Media files: `/media/` → `/app/media/`
- Cache headers برای بهینه‌سازی

## استفاده

### Localhost (Development)

1. **Build و Run:**
   ```bash
   docker-compose up -d nginx
   ```

2. **دسترسی:**
   - Frontend: http://localhost
   - Backend API: http://localhost/api
   - Admin Panel: http://localhost/admin

### Production (بعد از تنظیم دامنه)

1. **فعال کردن HTTPS:**
   - کامنت‌های بخش HTTPS را در `nginx.conf` باز کنید
   - تنظیمات SSL را انجام دهید
   - دامنه را در `server_name` تنظیم کنید

2. **SSL Certificate:**
   ```bash
   # نصب Certbot
   sudo apt-get update
   sudo apt-get install certbot python3-certbot-nginx
   
   # دریافت certificate
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

3. **Auto-renewal:**
   ```bash
   # تست auto-renewal
   sudo certbot renew --dry-run
   ```

## تنظیمات مهم

### Rate Limiting Zones

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=100r/m;
```

### Upstream Servers

```nginx
upstream backend {
    server backend:8000;
    keepalive 32;
}

upstream frontend {
    server frontend:3000;
    keepalive 32;
}
```

## Troubleshooting

### بررسی Logs

```bash
# Logs Nginx
docker-compose logs nginx

# Logs با tail
docker-compose logs -f nginx
```

### تست Configuration

```bash
# تست syntax
docker-compose exec nginx nginx -t

# Reload configuration
docker-compose exec nginx nginx -s reload
```

### بررسی دسترسی

```bash
# Health check
curl http://localhost/health

# تست API
curl http://localhost/api/
```

## نکات مهم

1. **برای Production:**
   - حتماً HTTPS را فعال کنید
   - CSP را سخت‌تر کنید
   - Rate limiting را بررسی کنید

2. **برای Development:**
   - می‌توانید مستقیماً به backend (8000) و frontend (3000) دسترسی داشته باشید
   - یا از nginx استفاده کنید (port 80)

3. **Static Files:**
   - Static files از volume `backend_static` سرو می‌شوند
   - Media files از volume `backend_media` سرو می‌شوند

4. **CORS:**
   - CORS headers در nginx تنظیم شده است
   - اگر نیاز به تغییر دارید، بخش `/api/` را ویرایش کنید

## به‌روزرسانی برای Production

وقتی آماده production شدید:

1. کامنت‌های بخش HTTPS را باز کنید
2. `yourdomain.com` را با دامنه خود جایگزین کنید
3. SSL certificate را تنظیم کنید
4. CSP را سخت‌تر کنید (حذف `unsafe-inline` و `unsafe-eval`)

---

**آخرین به‌روزرسانی:** 1404/10/17

