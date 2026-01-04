# 🚀 راهنمای کامل Deployment روی سرور پارس پک

این راهنما برای دیپلوی پروژه Gold Trading Platform روی سرور لینوکس پارس پک با دامنه `irangoldtrader.ir` است.

---

## 📋 پیش‌نیازها

### ✅ چک‌لیست قبل از شروع:

- [x] سرور لینوکس از پارس پک تهیه شده
- [x] دامنه `irangoldtrader.ir` خریداری شده
- [x] دسترسی root یا sudo به سرور
- [x] IP عمومی سرور در دسترس است
- [x] پروژه روی localhost تست شده و آماده است

---

## 🔧 مرحله 1: آماده‌سازی سرور

### 1.1 اتصال به سرور

```bash
ssh root@YOUR_SERVER_IP
# یا
ssh your_username@YOUR_SERVER_IP
```

### 1.2 به‌روزرسانی سیستم

```bash
sudo apt update
sudo apt upgrade -y
```

### 1.3 نصب Docker و Docker Compose

```bash
# نصب Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# اضافه کردن کاربر به گروه docker (اگر root نیستید)
sudo usermod -aG docker $USER

# نصب Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# بررسی نصب
docker --version
docker-compose --version
```

### 1.4 تنظیم Firewall

```bash
# نصب UFW (اگر نصب نیست)
sudo apt install ufw -y

# تنظیم قوانین
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# فعال کردن firewall
sudo ufw enable
sudo ufw status
```

### 1.5 ایجاد کاربر برای deployment (اختیاری اما توصیه می‌شود)

```bash
# ایجاد کاربر جدید
sudo adduser deploy
sudo usermod -aG docker deploy
sudo usermod -aG sudo deploy

# اتصال با کاربر جدید
su - deploy
```

---

## 🌐 مرحله 2: تنظیم DNS

### 2.1 تنظیم A Record

در پنل مدیریت دامنه (پارس پک یا هر ارائه‌دهنده دیگر):

1. وارد پنل مدیریت دامنه شوید
2. به بخش DNS Management بروید
3. یک **A Record** اضافه کنید:
   - **Type**: A
   - **Name**: @ (یا خالی بگذارید)
   - **Value**: IP سرور شما
   - **TTL**: 3600 (یا پیش‌فرض)

4. (اختیاری) یک **CNAME** برای www اضافه کنید:
   - **Type**: CNAME
   - **Name**: www
   - **Value**: irangoldtrader.ir
   - **TTL**: 3600

### 2.2 بررسی DNS Propagation

```bash
# بررسی DNS
dig irangoldtrader.ir
nslookup irangoldtrader.ir

# یا از سایت‌های آنلاین استفاده کنید:
# https://dnschecker.org
```

**نکته:** ممکن است 24-48 ساعت طول بکشد تا DNS به‌طور کامل propagate شود.

---

## 📦 مرحله 3: آماده‌سازی پروژه

### 3.1 Clone کردن پروژه

```bash
# ایجاد دایرکتوری برای پروژه
mkdir -p /var/www
cd /var/www

# Clone کردن از Git (یا آپلود فایل‌ها)
git clone YOUR_REPO_URL gold-trading
# یا اگر فایل‌ها را آپلود می‌کنید:
# scp -r /path/to/gold-new root@YOUR_SERVER_IP:/var/www/gold-trading

cd gold-trading
```

### 3.2 تنظیم فایل .env

```bash
# کپی کردن فایل نمونه
cp .env.example .env

# ویرایش فایل .env
nano .env
```

**محتویات فایل `.env` برای production:**

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

**⚠️ نکات مهم:**
- `DJANGO_SECRET_KEY` را با یک کلید امن و تصادفی جایگزین کنید
- `DB_PASSWORD` را با یک رمز عبور قوی جایگزین کنید
- `DJANGO_DEBUG=False` برای production

### 3.3 تولید Secret Key

```bash
# در سرور یا localhost
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

---

## 🔒 مرحله 4: تنظیم SSL با Let's Encrypt

### 4.1 نصب Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 4.2 دریافت Certificate

**⚠️ مهم:** قبل از این مرحله، مطمئن شوید که:
- DNS به درستی تنظیم شده و propagate شده است
- پورت 80 باز است
- Nginx هنوز اجرا نشده است (یا اگر اجرا شده، باید موقتاً متوقف شود)

```bash
# دریافت certificate
sudo certbot certonly --standalone -d irangoldtrader.ir -d www.irangoldtrader.ir

# یا اگر می‌خواهید از nginx استفاده کنید (بعد از تنظیم nginx):
# sudo certbot --nginx -d irangoldtrader.ir -d www.irangoldtrader.ir
```

### 4.3 تنظیم Auto-renewal

```bash
# تست auto-renewal
sudo certbot renew --dry-run

# بررسی cron job (به صورت خودکار تنظیم می‌شود)
sudo systemctl status certbot.timer
```

---

## 🐳 مرحله 5: تنظیم Docker و Nginx

### 5.1 به‌روزرسانی تنظیمات Nginx

فایل `nginx/nginx.conf` را ویرایش کنید:

```bash
nano nginx/nginx.conf
```

**تغییرات لازم:**

1. **HTTP Server Block:**
   - `server_name` را به `irangoldtrader.ir www.irangoldtrader.ir` تغییر دهید
   - Redirect به HTTPS را فعال کنید

2. **HTTPS Server Block:**
   - کامنت‌ها را باز کنید
   - `server_name` را تنظیم کنید
   - مسیرهای SSL certificate را تنظیم کنید

### 5.2 به‌روزرسانی docker-compose.yml

فایل `docker-compose.yml` را بررسی کنید. باید پورت 443 برای HTTPS باز باشد:

```yaml
nginx:
  ports:
    - "80:80"
    - "443:443"  # این خط باید uncomment شود
```

### 5.3 Build و Run

```bash
# Build images
docker-compose build

# اجرای services
docker-compose up -d

# بررسی وضعیت
docker-compose ps

# مشاهده logs
docker-compose logs -f
```

---

## 🗄️ مرحله 6: تنظیم Database

### 6.1 اجرای Migrations

```bash
# اجرای migrations
docker-compose exec backend python manage.py migrate

# ایجاد superuser
docker-compose exec backend python manage.py createsuperuser

# جمع‌آوری static files
docker-compose exec backend python manage.py collectstatic --noinput
```

### 6.2 Import داده‌های اولیه (در صورت نیاز)

```bash
# اگر فایل fixture دارید
docker-compose exec backend python manage.py loaddata initial_data.json
```

---

## ✅ مرحله 7: تست و بررسی

### 7.1 بررسی Services

```bash
# بررسی وضعیت همه services
docker-compose ps

# بررسی logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs nginx
docker-compose logs celery_worker
docker-compose logs celery_beat
```

### 7.2 تست دسترسی

```bash
# تست HTTP (باید به HTTPS redirect شود)
curl -I http://irangoldtrader.ir

# تست HTTPS
curl -I https://irangoldtrader.ir

# تست API
curl https://irangoldtrader.ir/api/health

# تست Frontend
curl https://irangoldtrader.ir
```

### 7.3 بررسی SSL Certificate

```bash
# بررسی certificate
sudo certbot certificates

# تست SSL
openssl s_client -connect irangoldtrader.ir:443 -servername irangoldtrader.ir
```

---

## 🔧 مرحله 8: بهینه‌سازی و Monitoring

### 8.1 تنظیم Log Rotation

```bash
# بررسی log files
docker-compose logs --tail=100

# تنظیم log rotation در docker-compose.yml (اگر نیاز باشد)
```

### 8.2 Monitoring Resource Usage

```bash
# بررسی استفاده از منابع
docker stats

# بررسی disk usage
df -h
docker system df
```

### 8.3 تنظیم Backup

```bash
# ایجاد script برای backup
nano /var/www/gold-trading/backup.sh
```

**محتویات backup.sh:**

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/gold-trading"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker-compose exec -T db pg_dump -U postgres gold_trading > $BACKUP_DIR/db_$DATE.sql

# Backup media files
tar -czf $BACKUP_DIR/media_$DATE.tar.gz /var/www/gold-trading/backend/media

# حذف backup های قدیمی‌تر از 7 روز
find $BACKUP_DIR -type f -mtime +7 -delete
```

```bash
chmod +x backup.sh

# اضافه کردن به crontab (هر روز ساعت 2 صبح)
crontab -e
# اضافه کنید:
# 0 2 * * * /var/www/gold-trading/backup.sh
```

---

## 🚨 عیب‌یابی (Troubleshooting)

### مشکل: DNS resolve نمی‌شود

```bash
# بررسی DNS
dig irangoldtrader.ir
nslookup irangoldtrader.ir

# بررسی firewall
sudo ufw status
```

### مشکل: SSL Certificate دریافت نمی‌شود

```bash
# بررسی پورت 80
sudo netstat -tulpn | grep :80

# بررسی logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

### مشکل: Services اجرا نمی‌شوند

```bash
# بررسی logs
docker-compose logs

# بررسی وضعیت containers
docker-compose ps

# Restart services
docker-compose restart
```

### مشکل: Database Connection Error

```bash
# بررسی database
docker-compose exec db psql -U postgres -d gold_trading

# بررسی environment variables
docker-compose exec backend env | grep DB
```

---

## 📝 دستورات مفید

### مدیریت Services

```bash
# Start
docker-compose up -d

# Stop
docker-compose stop

# Restart
docker-compose restart

# Stop و Remove
docker-compose down

# Rebuild
docker-compose up -d --build

# مشاهده logs
docker-compose logs -f [service_name]
```

### مدیریت Database

```bash
# دسترسی به database
docker-compose exec db psql -U postgres -d gold_trading

# Backup
docker-compose exec db pg_dump -U postgres gold_trading > backup.sql

# Restore
docker-compose exec -T db psql -U postgres gold_trading < backup.sql
```

### مدیریت Django

```bash
# اجرای migrations
docker-compose exec backend python manage.py migrate

# ایجاد superuser
docker-compose exec backend python manage.py createsuperuser

# Shell
docker-compose exec backend python manage.py shell

# Collectstatic
docker-compose exec backend python manage.py collectstatic --noinput
```

---

## 🔐 نکات امنیتی

1. **هرگز** فایل `.env` را در Git commit نکنید
2. **Secret Key** را به صورت منظم تغییر دهید
3. **Database Password** را قوی انتخاب کنید
4. **Firewall** را فعال نگه دارید
5. **SSL Certificate** را به صورت منظم بررسی کنید
6. **Backup** را به صورت منظم انجام دهید
7. **Logs** را به صورت منظم بررسی کنید

---

## 📞 پشتیبانی

در صورت بروز مشکل:
1. Logs را بررسی کنید
2. مستندات را مطالعه کنید
3. با تیم پشتیبانی تماس بگیرید

---

**آخرین به‌روزرسانی:** 1404/10/17

