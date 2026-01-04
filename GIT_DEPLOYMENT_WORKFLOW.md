# 🔄 راهنمای کامل Git Workflow و Deployment

این راهنما توضیح می‌دهد چطور کد را از لپ‌تاپ به سرور انتقال دهید و یک workflow ساده CI/CD داشته باشید.

---

## 📋 بررسی فایل .gitignore

قبل از هر چیز، مطمئن شوید که فایل‌های حساس و غیرضروری در Git commit نمی‌شوند.

### ✅ فایل‌هایی که باید ignore شوند (و ignore شده‌اند):

- ✅ `.env` - فایل‌های environment variables
- ✅ `node_modules/` - Dependencies
- ✅ `.next/` - Build files
- ✅ `__pycache__/` - Python cache
- ✅ `*.log` - Log files
- ✅ `/media` - Media files
- ✅ `/staticfiles` - Static files
- ✅ `*.db`, `*.sqlite3` - Database files
- ✅ SSL certificates

### ⚠️ فایل‌هایی که باید در Git باشند:

- ✅ `docker-compose.yml` و `docker-compose.production.yml`
- ✅ `Dockerfile` ها
- ✅ `nginx/nginx.conf` و `nginx/nginx.production.conf`
- ✅ `ENV_SETUP.md` (راهنمای تنظیمات)
- ✅ همه فایل‌های source code

---

## 🔍 بررسی قبل از Push به Git

### گام 1: بررسی وضعیت Git

```bash
# در لپ‌تاپ (در دایرکتوری پروژه)
cd /home/kakashi/gold-new

# بررسی وضعیت
git status

# بررسی فایل‌هایی که ignore شده‌اند
git status --ignored
```

### گام 2: بررسی که .env در Git نیست

```bash
# بررسی که .env commit نشده
git ls-files | grep .env

# اگر .env در لیست بود، باید آن را حذف کنید:
# git rm --cached .env
# git commit -m "Remove .env from git"
```

### گام 3: بررسی فایل‌های مهم

```bash
# بررسی که فایل‌های مهم commit شده‌اند
git ls-files | grep -E "(docker-compose|Dockerfile|nginx.conf|settings.py)"
```

---

## 🚀 Workflow انتقال کد از لپ‌تاپ به سرور

### روش 1: Git Pull (توصیه می‌شود) ⭐

این روش بهترین است چون:
- ✅ ساده و سریع
- ✅ تاریخچه تغییرات حفظ می‌شود
- ✅ می‌توانید branch های مختلف داشته باشید

#### در لپ‌تاپ:

```bash
# 1. تغییرات را commit کنید
git add .
git commit -m "توضیح تغییرات"

# 2. Push به Git repository
git push origin main
# یا اگر branch دیگری دارید:
# git push origin your-branch-name
```

#### در سرور:

```bash
# 1. وارد دایرکتوری پروژه شوید
cd /var/www/gold-trading

# 2. Pull آخرین تغییرات
git pull origin main

# 3. Restart services (اگر نیاز باشد)
docker-compose -f docker-compose.production.yml restart
# یا rebuild اگر Dockerfile تغییر کرده:
# docker-compose -f docker-compose.production.yml up -d --build
```

---

### روش 2: استفاده از Deployment Script (خودکار)

یک script ساده می‌سازیم که همه کارها را خودکار انجام دهد.

#### ایجاد Script در سرور:

```bash
# در سرور
nano /var/www/gold-trading/deploy.sh
```

محتوای script:

```bash
#!/bin/bash

# رنگ‌ها برای output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 شروع Deployment...${NC}"

# رفتن به دایرکتوری پروژه
cd /var/www/gold-trading || exit

# Pull آخرین تغییرات
echo -e "${YELLOW}📥 Pull کردن آخرین تغییرات از Git...${NC}"
git pull origin main

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ خطا در Pull کردن تغییرات${NC}"
    exit 1
fi

# بررسی که آیا Dockerfile تغییر کرده
echo -e "${YELLOW}🔍 بررسی تغییرات...${NC}"
CHANGED_FILES=$(git diff --name-only HEAD@{1} HEAD)

if echo "$CHANGED_FILES" | grep -qE "(Dockerfile|docker-compose|requirements|package.json)"; then
    echo -e "${YELLOW}🔨 تغییرات در Dependencies یا Dockerfile - Rebuild لازم است${NC}"
    docker-compose -f docker-compose.production.yml down
    docker-compose -f docker-compose.production.yml build --no-cache
    docker-compose -f docker-compose.production.yml up -d
else
    echo -e "${YELLOW}🔄 فقط Restart services...${NC}"
    docker-compose -f docker-compose.production.yml restart
fi

# اجرای migrations (اگر نیاز باشد)
echo -e "${YELLOW}🗄️ بررسی Migrations...${NC}"
docker-compose -f docker-compose.production.yml exec -T backend python manage.py migrate --noinput

# Collect static files
echo -e "${YELLOW}📦 Collecting static files...${NC}"
docker-compose -f docker-compose.production.yml exec -T backend python manage.py collectstatic --noinput

# بررسی وضعیت services
echo -e "${YELLOW}✅ بررسی وضعیت Services...${NC}"
docker-compose -f docker-compose.production.yml ps

echo -e "${GREEN}✅ Deployment با موفقیت انجام شد!${NC}"
```

اجازه اجرا:

```bash
chmod +x /var/www/gold-trading/deploy.sh
```

استفاده:

```bash
# در سرور
/var/www/gold-trading/deploy.sh
```

---

### روش 3: rsync (برای انتقال مستقیم بدون Git)

اگر می‌خواهید بدون Git انتقال دهید:

```bash
# در لپ‌تاپ
rsync -avz --exclude 'node_modules' \
           --exclude '.next' \
           --exclude '__pycache__' \
           --exclude '.git' \
           --exclude '.env' \
           --exclude '*.log' \
           /home/kakashi/gold-new/ \
           root@YOUR_SERVER_IP:/var/www/gold-trading/
```

---

## 🔐 تنظیم SSH Key برای Git (اختیاری اما توصیه می‌شود)

برای اینکه نیازی به وارد کردن username/password نباشد:

### در لپ‌تاپ:

```bash
# ایجاد SSH key (اگر ندارید)
ssh-keygen -t ed25519 -C "your_email@example.com"

# نمایش public key
cat ~/.ssh/id_ed25519.pub
```

### در GitHub/GitLab:

1. Settings → SSH and GPG keys
2. New SSH key
3. Public key را paste کنید

### در سرور (برای pull خودکار):

```bash
# ایجاد SSH key در سرور
ssh-keygen -t ed25519 -C "server@irangoldtrader.ir"

# اضافه کردن به GitHub/GitLab (همان مراحل بالا)
```

---

## 📝 Workflow پیشنهادی روزانه

### 1. توسعه در لپ‌تاپ:

```bash
# ایجاد branch جدید برای feature
git checkout -b feature/new-feature

# تغییرات
# ... کد می‌نویسید ...

# Commit
git add .
git commit -m "اضافه کردن feature جدید"

# Push
git push origin feature/new-feature
```

### 2. Merge به main:

```bash
# در GitHub/GitLab: Pull Request ایجاد کنید
# یا در لپ‌تاپ:
git checkout main
git merge feature/new-feature
git push origin main
```

### 3. Deploy به سرور:

```bash
# SSH به سرور
ssh root@YOUR_SERVER_IP

# اجرای deploy script
cd /var/www/gold-trading
./deploy.sh
```

---

## 🎯 CI/CD ساده با GitHub Actions (پیشرفته)

اگر می‌خواهید خودکار deploy شود:

### ایجاد `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Server

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Deploy to server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.SERVER_HOST }}
        username: ${{ secrets.SERVER_USER }}
        key: ${{ secrets.SERVER_SSH_KEY }}
        script: |
          cd /var/www/gold-trading
          git pull origin main
          docker-compose -f docker-compose.production.yml up -d --build
```

---

## ✅ چک‌لیست قبل از اولین Push

- [ ] `.env` در `.gitignore` است
- [ ] `node_modules/` ignore شده
- [ ] `.next/` ignore شده
- [ ] `__pycache__/` ignore شده
- [ ] فایل‌های مهم (Dockerfile, docker-compose) commit شده‌اند
- [ ] Repository در GitHub/GitLab ایجاد شده
- [ ] Remote origin تنظیم شده

---

## 🚨 مشکلات رایج و راه‌حل

### مشکل: `.env` به اشتباه commit شده

```bash
# حذف از Git (اما نگه داشتن در سیستم)
git rm --cached .env
git commit -m "Remove .env from git"
git push
```

### مشکل: فایل‌های بزرگ commit شده

```bash
# استفاده از Git LFS (برای فایل‌های بزرگ)
git lfs install
git lfs track "*.large-file"
```

### مشکل: Conflict در Pull

```bash
# در سرور
git stash  # ذخیره تغییرات محلی
git pull origin main
git stash pop  # بازگرداندن تغییرات
```

---

## 📚 منابع بیشتر

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Docker Compose](https://docs.docker.com/compose/)

---

**آخرین به‌روزرسانی:** 1404/10/17

