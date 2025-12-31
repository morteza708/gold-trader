# 📦 راهنمای اتصال پروژه به GitHub

## مراحل اتصال به GitHub

### 1. تنظیم Git (اگر قبلاً انجام نشده)

```bash
# تنظیم نام و ایمیل (یک بار برای همه پروژه‌ها)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# یا فقط برای این پروژه
cd /home/kakashi/gold-new
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### 2. تغییر نام branch به main (اختیاری)

```bash
git branch -m master main
```

### 3. اضافه کردن فایل‌ها به Git

```bash
# بررسی وضعیت
git status

# اضافه کردن همه فایل‌ها (به جز موارد در .gitignore)
git add .

# یا اضافه کردن فایل به فایل
git add .gitignore
git add DEPLOYMENT_ROADMAP.md
git add PROJECT_OVERVIEW.md
git add backend/
git add frontend/
```

### 4. Commit اولیه

```bash
git commit -m "Initial commit: Gold Trading Platform

- Complete backend (Django + DRF)
- Complete frontend (Next.js + TypeScript)
- Trade system with margin profit calculation
- Wallet system with multi-account deposits
- PWA ready structure
- Docker ready structure"
```

### 5. ایجاد Repository در GitHub

1. به [GitHub](https://github.com) بروید
2. روی **"New repository"** کلیک کنید
3. نام repository را وارد کنید (مثلاً `gold-trading-platform`)
4. **Public** یا **Private** انتخاب کنید
5. **DO NOT** initialize with README, .gitignore, or license (چون ما قبلاً داریم)
6. روی **"Create repository"** کلیک کنید

### 6. اتصال به GitHub

```bash
# اضافه کردن remote origin (URL را با URL واقعی GitHub خود جایگزین کنید)
git remote add origin https://github.com/YOUR_USERNAME/gold-trading-platform.git

# یا با SSH
git remote add origin git@github.com:YOUR_USERNAME/gold-trading-platform.git

# بررسی remote
git remote -v
```

### 7. Push به GitHub

```bash
# Push به branch main
git push -u origin main

# یا اگر branch شما master است
git push -u origin master
```

### 8. ایجاد Branch Strategy (پیشنهادی)

```bash
# ایجاد branch develop برای development
git checkout -b develop
git push -u origin develop

# برگشت به main
git checkout main
```

---

## Branch Strategy پیشنهادی

- **main**: کد production-ready
- **develop**: کد development
- **feature/***: برای features جدید (مثلاً `feature/docker-setup`)
- **hotfix/***: برای bug fixes فوری

### مثال استفاده:

```bash
# ایجاد feature branch
git checkout develop
git checkout -b feature/docker-setup

# کار روی feature
# ... تغییرات ...

# Commit
git add .
git commit -m "Add Docker configuration"

# Push
git push -u origin feature/docker-setup

# Merge به develop (از GitHub یا local)
git checkout develop
git merge feature/docker-setup
```

---

## دستورات مفید Git

```bash
# بررسی وضعیت
git status

# مشاهده تغییرات
git diff

# مشاهده history
git log --oneline --graph

# تغییر branch
git checkout branch-name

# ایجاد branch جدید
git checkout -b new-branch-name

# حذف branch
git branch -d branch-name

# Pull تغییرات از GitHub
git pull origin main

# Push تغییرات به GitHub
git push origin main

# مشاهده remote
git remote -v

# تغییر remote URL
git remote set-url origin NEW_URL
```

---

## نکات مهم

1. **هرگز `.env` را commit نکنید** - در `.gitignore` قرار دارد
2. **هرگز `venv/` یا `node_modules/` را commit نکنید** - در `.gitignore` قرار دارد
3. **Commit messages را واضح بنویسید**
4. **قبل از push، تست کنید**
5. **از branch strategy استفاده کنید**

---

## Troubleshooting

### اگر remote را اشتباه اضافه کردید:
```bash
git remote remove origin
git remote add origin CORRECT_URL
```

### اگر می‌خواهید branch را تغییر دهید:
```bash
git branch -m old-name new-name
```

### اگر می‌خواهید آخرین commit را تغییر دهید:
```bash
git commit --amend -m "New message"
```

---

**آماده برای ادامه!** 🚀

