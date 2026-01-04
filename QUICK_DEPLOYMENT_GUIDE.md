# ⚡ راهنمای سریع Deployment - مرحله به مرحله

این راهنمای ساده برای انتقال کد از لپ‌تاپ به سرور است.

---

## 📋 مرحله 1: بررسی فایل‌ها قبل از Push به Git

### در لپ‌تاپ:

```bash
cd /home/kakashi/gold-new

# 1. بررسی وضعیت Git
git status

# 2. بررسی که .env در Git نیست (باید ignore شده باشد)
git ls-files | grep .env
# اگر چیزی نمایش داد، یعنی .env commit شده و باید حذف شود

# 3. بررسی فایل‌های مهم که باید commit شوند
git ls-files | grep -E "(docker-compose|Dockerfile|nginx.conf)"
```

### اگر .env به اشتباه commit شده:

```bash
# حذف از Git (اما نگه داشتن در سیستم)
git rm --cached .env
git commit -m "Remove .env from git"
```

---

## 🚀 مرحله 2: Push به Git Repository

### در لپ‌تاپ:

```bash
# 1. اضافه کردن تغییرات
git add .

# 2. Commit
git commit -m "توضیح تغییرات شما"

# 3. Push به Git
git push origin main
# یا اگر branch دیگری دارید:
# git push origin your-branch-name
```

---

## 📥 مرحله 3: Clone پروژه در سرور

### در سرور:

```bash
# 1. ایجاد دایرکتوری
mkdir -p /var/www
cd /var/www

# 2. Clone از Git (آدرس repository خود را جایگزین کنید)
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git gold-trading
# یا با SSH:
# git clone git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git gold-trading

# 3. رفتن به دایرکتوری پروژه
cd gold-trading
```

---

## 🔧 مرحله 4: تنظیم فایل .env در سرور

```bash
# در سرور
cd /var/www/gold-trading

# ایجاد فایل .env
nano .env
```

محتوای `.env` را از `ENV_SETUP.md` کپی کنید و تنظیمات production را وارد کنید.

---

## 🚀 مرحله 5: استفاده از Deployment Script

### نصب Script در سرور:

```bash
# کپی کردن script به سرور (اگر از Git clone کرده‌اید، خودش هست)
cd /var/www/gold-trading

# یا اگر script را جداگانه می‌خواهید:
# wget یا scp برای آپلود deploy.sh

# اجازه اجرا
chmod +x deploy.sh
```

### استفاده از Script:

```bash
# هر بار که می‌خواهید کد جدید را deploy کنید:
cd /var/www/gold-trading
./deploy.sh
```

این script خودکار:
- ✅ آخرین تغییرات را از Git pull می‌کند
- ✅ اگر Dockerfile تغییر کرده باشد، rebuild می‌کند
- ✅ Services را restart می‌کند
- ✅ Migrations را اجرا می‌کند
- ✅ Static files را collect می‌کند

---

## 🔄 Workflow روزانه (بعد از اولین Setup)

### در لپ‌تاپ (توسعه):

```bash
# 1. تغییرات را commit کنید
git add .
git commit -m "اضافه کردن feature جدید"

# 2. Push به Git
git push origin main
```

### در سرور (Deploy):

```bash
# SSH به سرور
ssh root@YOUR_SERVER_IP

# اجرای deploy script
cd /var/www/gold-trading
./deploy.sh
```

**همین!** 🎉

---

## 📝 خلاصه دستورات مهم

### در لپ‌تاپ:
```bash
git add .
git commit -m "تغییرات"
git push origin main
```

### در سرور:
```bash
cd /var/www/gold-trading
./deploy.sh
```

---

## ⚠️ نکات مهم

1. **هرگز `.env` را commit نکنید** - این فایل حساس است
2. **قبل از push، `git status` را چک کنید** - مطمئن شوید فایل‌های درست commit می‌شوند
3. **از `deploy.sh` استفاده کنید** - همه کارها را خودکار انجام می‌دهد
4. **بعد از deploy، logs را چک کنید** - مطمئن شوید همه چیز کار می‌کند

---

## 🆘 اگر مشکلی پیش آمد

### مشکل: Git pull خطا می‌دهد

```bash
# در سرور
cd /var/www/gold-trading
git stash  # ذخیره تغییرات محلی
git pull origin main
```

### مشکل: Docker services اجرا نمی‌شوند

```bash
# بررسی logs
docker-compose -f docker-compose.production.yml logs

# بررسی وضعیت
docker-compose -f docker-compose.production.yml ps
```

### مشکل: فایل .env وجود ندارد

```bash
# ایجاد فایل .env
cd /var/www/gold-trading
cp ENV_SETUP.md .env  # و سپس ویرایش کنید
nano .env
```

---

**سوال دارید؟** به `GIT_DEPLOYMENT_WORKFLOW.md` مراجعه کنید برای توضیحات کامل‌تر.

