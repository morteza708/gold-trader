#!/bin/bash
# Celery Startup Script for Runflare
# این اسکریپت Celery را با Beat اجرا می‌کند و در صورت توقف، دوباره راه‌اندازی می‌کند

set -e

# رنگ‌ها برای خروجی
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# توقف پروسس‌های قبلی Celery
cleanup_celery() {
    log_info "در حال توقف پروسس‌های قبلی Celery..."
    pkill -f "celery -A config" 2>/dev/null || true
    sleep 2
    
    # اگر هنوز پروسسی باقی مانده، با force متوقف کن
    if pgrep -f "celery -A config" > /dev/null; then
        log_warn "پروسس‌های Celery هنوز فعال هستند، متوقف کردن اجباری..."
        pkill -9 -f "celery -A config" 2>/dev/null || true
        sleep 1
    fi
    
    log_info "پروسس‌های قبلی متوقف شدند"
}

# اجرای Celery
start_celery() {
    log_info "در حال اجرای Celery Worker با Beat..."
    
    # حذف فایل‌های قفل قدیمی Beat
    rm -f /tmp/celerybeat.pid 2>/dev/null || true
    rm -f /app/celerybeat-schedule 2>/dev/null || true
    rm -f celerybeat-schedule 2>/dev/null || true
    
    # اجرای Celery با Beat
    exec celery -A config worker -B \
        --loglevel=info \
        --concurrency=1 \
        --scheduler=celery.beat:PersistentScheduler \
        --schedule=/tmp/celerybeat-schedule
}

# Main
main() {
    log_info "=== شروع Celery Startup Script ==="
    
    # تغییر به دایرکتوری اصلی پروژه
    cd /app 2>/dev/null || cd "$(dirname "$0")/.." || {
        log_error "خطا در تغییر دایرکتوری"
        exit 1
    }
    
    cleanup_celery
    start_celery
}

main "$@"
