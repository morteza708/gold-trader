#!/bin/bash

# 🚀 Deployment Script برای Gold Trading Platform
# این script را در سرور قرار دهید و اجرا کنید

# رنگ‌ها برای output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# تنظیمات
PROJECT_DIR="/var/www/gold-trader"
COMPOSE_FILE="docker-compose.production.yml"
GIT_BRANCH="main"

# تابع برای نمایش پیام
print_message() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# بررسی که در دایرکتوری درست هستیم
if [ ! -f "$PROJECT_DIR/$COMPOSE_FILE" ]; then
    print_error "فایل $COMPOSE_FILE در $PROJECT_DIR پیدا نشد!"
    exit 1
fi

cd "$PROJECT_DIR" || exit

print_message "شروع Deployment..."
echo ""

# 1. Pull آخرین تغییرات از Git
print_message "📥 Pull کردن آخرین تغییرات از Git..."
if git pull origin "$GIT_BRANCH"; then
    print_success "Pull با موفقیت انجام شد"
else
    print_error "خطا در Pull کردن تغییرات"
    exit 1
fi
echo ""

# 2. بررسی تغییرات
print_message "🔍 بررسی تغییرات..."
CHANGED_FILES=$(git diff --name-only HEAD@{1} HEAD 2>/dev/null || echo "")

NEED_REBUILD=false
if echo "$CHANGED_FILES" | grep -qE "(Dockerfile|docker-compose|requirements\.txt|package\.json|package-lock\.json)"; then
    NEED_REBUILD=true
    print_warning "تغییرات در Dependencies یا Dockerfile - Rebuild لازم است"
else
    print_message "تغییرات فقط در کد - Restart کافی است"
fi
echo ""

# 3. Build و Restart Services
if [ "$NEED_REBUILD" = true ]; then
    print_message "🔨 Rebuild کردن Docker images..."
    docker-compose -f "$COMPOSE_FILE" down
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    docker-compose -f "$COMPOSE_FILE" up -d
    print_success "Rebuild و Restart انجام شد"
else
    print_message "🔄 Restart کردن Services..."
    docker-compose -f "$COMPOSE_FILE" restart
    print_success "Restart انجام شد"
fi
echo ""

# 4. اجرای Migrations
print_message "🗄️ بررسی و اجرای Migrations..."
if docker-compose -f "$COMPOSE_FILE" exec -T backend python manage.py migrate --noinput; then
    print_success "Migrations اجرا شد"
else
    print_warning "خطا در اجرای Migrations (ممکن است service در حال راه‌اندازی باشد)"
fi
echo ""

# 5. Collect Static Files
print_message "📦 Collecting static files..."
if docker-compose -f "$COMPOSE_FILE" exec -T backend python manage.py collectstatic --noinput; then
    print_success "Static files جمع‌آوری شد"
else
    print_warning "خطا در Collect static files"
fi
echo ""

# 6. بررسی وضعیت Services
print_message "✅ بررسی وضعیت Services..."
docker-compose -f "$COMPOSE_FILE" ps
echo ""

# 7. بررسی Logs (اختیاری)
read -p "آیا می‌خواهید logs را ببینید؟ (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_message "📋 نمایش آخرین logs..."
    docker-compose -f "$COMPOSE_FILE" logs --tail=50
fi

echo ""
print_success "Deployment با موفقیت انجام شد! 🎉"

