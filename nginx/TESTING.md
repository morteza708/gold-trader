# راهنمای تست Nginx

## مراحل تست

### 1. Build و Run Nginx

```bash
# Build nginx image
docker-compose build nginx

# Start nginx service
docker-compose up -d nginx

# بررسی logs
docker-compose logs -f nginx
```

### 2. تست دسترسی

#### Frontend
```bash
# تست دسترسی به Frontend
curl http://localhost/

# یا در مرورگر:
# http://localhost
```

#### Backend API
```bash
# تست دسترسی به API
curl http://localhost/api/

# تست health check
curl http://localhost/health
```

#### Admin Panel
```bash
# تست دسترسی به Admin Panel
curl http://localhost/admin/

# یا در مرورگر:
# http://localhost/admin
```

### 3. تست Static Files

```bash
# تست static files
curl -I http://localhost/static/admin/css/base.css

# باید header های cache را ببینید:
# Cache-Control: public, immutable
# Expires: ...
```

### 4. تست Media Files

```bash
# تست media files (بعد از آپلود یک فایل)
curl -I http://localhost/media/...

# باید header های cache را ببینید:
# Cache-Control: public
# Expires: ...
```

### 5. تست Rate Limiting

```bash
# تست rate limiting برای API
for i in {1..35}; do
  curl -w "\n" http://localhost/api/
  sleep 1
done

# بعد از 30 request، باید 429 (Too Many Requests) دریافت کنید
```

### 6. تست Gzip Compression

```bash
# تست gzip compression
curl -H "Accept-Encoding: gzip" -I http://localhost/

# باید header زیر را ببینید:
# Content-Encoding: gzip
```

### 7. تست Security Headers

```bash
# تست security headers
curl -I http://localhost/

# باید header های زیر را ببینید:
# X-Frame-Options: SAMEORIGIN
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
# Referrer-Policy: strict-origin-when-cross-origin
# Content-Security-Policy: ...
```

### 8. تست Configuration

```bash
# تست syntax nginx
docker-compose exec nginx nginx -t

# باید ببینید:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

## مشکلات احتمالی

### مشکل 1: 502 Bad Gateway

**علت:** Backend یا Frontend در حال اجرا نیست

**راه‌حل:**
```bash
# بررسی وضعیت services
docker-compose ps

# Start همه services
docker-compose up -d
```

### مشکل 2: 404 Not Found برای Static Files

**علت:** Static files collect نشده است

**راه‌حل:**
```bash
# Collect static files
docker-compose exec backend python manage.py collectstatic --noinput

# Restart nginx
docker-compose restart nginx
```

### مشکل 3: 403 Forbidden برای Media Files

**علت:** مشکل permissions

**راه‌حل:**
```bash
# بررسی permissions
docker-compose exec nginx ls -la /var/www/media

# اگر نیاز باشد، permissions را تنظیم کنید
```

### مشکل 4: CORS Error

**علت:** CORS headers درست تنظیم نشده

**راه‌حل:**
- بررسی بخش `/api/` در `nginx.conf`
- بررسی `CORS_ALLOWED_ORIGINS` در Django settings

## بررسی Logs

```bash
# Logs Nginx
docker-compose logs nginx

# Logs با tail (real-time)
docker-compose logs -f nginx

# Logs فقط errors
docker-compose logs nginx | grep error

# Logs فقط access
docker-compose logs nginx | grep "GET\|POST"
```

## Performance Testing

### تست با Apache Bench (ab)

```bash
# نصب ab (اگر نصب نیست)
sudo apt-get install apache2-utils

# تست performance
ab -n 1000 -c 10 http://localhost/

# تست API
ab -n 100 -c 5 http://localhost/api/
```

### تست با curl (زمان پاسخ)

```bash
# تست زمان پاسخ
time curl http://localhost/

# تست با verbose
curl -v http://localhost/api/
```

## Checklist تست

- [ ] Frontend در دسترس است (http://localhost)
- [ ] Backend API در دسترس است (http://localhost/api/)
- [ ] Admin Panel در دسترس است (http://localhost/admin)
- [ ] Static files سرو می‌شوند
- [ ] Media files سرو می‌شوند
- [ ] Rate limiting کار می‌کند
- [ ] Gzip compression فعال است
- [ ] Security headers تنظیم شده‌اند
- [ ] Configuration syntax صحیح است
- [ ] Logs بدون error هستند

---

**آخرین به‌روزرسانی:** 1404/10/17

