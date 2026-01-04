# 🔒 نکات مهم Nginx برای Production

این فایل شامل نکات و تنظیمات مهم برای deployment در production است.

## 📋 فهرست

1. [Rate Limiting](#rate-limiting)
2. [Security Headers](#security-headers)
3. [SSL/TLS Configuration](#ssltls-configuration)
4. [Performance Optimization](#performance-optimization)
5. [Monitoring & Logging](#monitoring--logging)

---

## 🚦 Rate Limiting

### وضعیت فعلی (Development):
- ✅ Rate limiting برای development غیرفعال/کم است
- ✅ `api_limit`: 200 req/min
- ✅ `auth_limit`: 50 req/min
- ✅ `general_limit`: 500 req/min

### تنظیمات Production:

#### 1. به‌روزرسانی `nginx-complete.conf`:

```nginx
# Rate limiting zones (برای production)
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=100r/m;
```

#### 2. فعال کردن Rate Limiting در `nginx.conf`:

```nginx
# API endpoints (Backend)
location /api/ {
    limit_req zone=api_limit burst=10 nodelay;
    limit_req_status 429;
    # ...
}

# Authentication endpoints
location ~ ^/api/(accounts|auth)/ {
    limit_req zone=auth_limit burst=5 nodelay;
    limit_req_status 429;
    # ...
}

# Django Admin
location ^~ /admin {
    limit_req zone=general_limit burst=20 nodelay;
    # ...
}
```

#### 3. Rate Limiting برای Admin API:

```nginx
# API Admin endpoints
location ~ ^/admin/(settings|users|trades|finance|notifications)/ {
    limit_req zone=api_limit burst=20 nodelay;
    limit_req_status 429;
    # ...
}
```

---

## 🔐 Security Headers

### تنظیمات فعلی (Development):
- CSP با `unsafe-inline` و `unsafe-eval` (برای development)
- HSTS غیرفعال
- X-Frame-Options: `SAMEORIGIN`

### تنظیمات Production:

#### 1. Content Security Policy (سخت‌تر):

```nginx
# در nginx.conf برای production:
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://yourdomain.com wss://yourdomain.com; frame-ancestors 'none';" always;
```

**نکات:**
- حذف `unsafe-inline` و `unsafe-eval` از script-src
- اضافه کردن دامنه واقعی به connect-src
- تغییر `frame-ancestors` به `'none'` (اگر نیاز نباشد)

#### 2. HSTS (فعال کردن):

```nginx
# فقط برای HTTPS (بعد از تنظیم SSL):
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

#### 3. X-Frame-Options:

```nginx
# برای production (اگر نیاز نباشد):
add_header X-Frame-Options "DENY" always;
```

---

## 🔒 SSL/TLS Configuration

### مراحل تنظیم SSL:

#### 1. نصب Certbot:

```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx
```

#### 2. دریافت Certificate:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

#### 3. فعال کردن Auto-renewal:

```bash
sudo certbot renew --dry-run
```

#### 4. Uncomment کردن HTTPS Server Block:

در `nginx/nginx.conf`، بخش HTTPS server را uncomment کنید و تنظیمات را به‌روزرسانی کنید:
- `server_name`: دامنه واقعی
- `ssl_certificate`: مسیر certificate
- `ssl_certificate_key`: مسیر private key

---

## ⚡ Performance Optimization

### 1. Static Files:

```bash
# در backend container:
python manage.py collectstatic --noinput
```

### 2. Gzip Compression (فعال است):

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript;
```

### 3. Browser Caching:

```nginx
# Static files
location /static/ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}

# Media files
location /media/ {
    expires 7d;
    add_header Cache-Control "public";
}
```

### 4. Keepalive Connections:

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

---

## 📊 Monitoring & Logging

### 1. Access Logs:

```nginx
access_log /var/log/nginx/access.log main;
```

### 2. Error Logs:

```nginx
error_log /var/log/nginx/error.log notice;
```

### 3. Log Rotation:

ایجاد فایل `/etc/logrotate.d/nginx`:

```
/var/log/nginx/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 `cat /var/run/nginx.pid`
    endscript
}
```

---

## 🔍 Checklist برای Production

قبل از deployment:

- [ ] Rate limiting فعال شده
- [ ] Security headers سخت‌تر شده
- [ ] SSL certificate دریافت شده
- [ ] HTTPS server block فعال شده
- [ ] ALLOWED_HOSTS به‌روزرسانی شده
- [ ] CORS_ALLOWED_ORIGINS به‌روزرسانی شده
- [ ] Static files collect شده
- [ ] Log rotation تنظیم شده
- [ ] Monitoring setup شده
- [ ] Backup strategy تعریف شده

---

## 🚨 نکات امنیتی

1. **هرگز secrets را در فایل‌های config commit نکنید**
2. **از environment variables استفاده کنید**
3. **Rate limiting را برای production فعال کنید**
4. **Security headers را سخت‌تر کنید**
5. **SSL certificate را auto-renew کنید**
6. **Logs را به صورت منظم بررسی کنید**
7. **Firewall را تنظیم کنید (فقط ports 80 و 443 باز باشند)**

---

**آخرین به‌روزرسانی:** 1404/10/17
**نسخه:** 1.0

