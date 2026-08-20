"""
Management command to check gold price sync health.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from trades.models import GoldPrice


class Command(BaseCommand):
    help = 'بررسی سلامت سیستم قیمت‌گذاری و هشدار در صورت قدیمی بودن قیمت'

    def add_arguments(self, parser):
        parser.add_argument(
            '--max-age',
            type=int,
            default=10,
            help='حداکثر سن قیمت به دقیقه (پیش‌فرض: 10 دقیقه، چون قیمت هر 2 دقیقه به‌روز می‌شود)'
        )
        parser.add_argument(
            '--quiet',
            action='store_true',
            help='فقط در صورت مشکل خروجی نمایش بده'
        )

    def handle(self, *args, **options):
        max_age_minutes = options['max_age']
        quiet = options['quiet']
        
        current_price = GoldPrice.get_current_price()
        
        if not current_price:
            self.stderr.write(self.style.ERROR('❌ هیچ قیمتی در دیتابیس وجود ندارد!'))
            return
        
        now = timezone.now()
        age = now - current_price.created_at
        age_minutes = age.total_seconds() / 60
        
        is_stale = age_minutes > max_age_minutes
        
        if is_stale:
            self.stderr.write(self.style.ERROR(
                f'❌ قیمت قدیمی است!\n'
                f'   آخرین به‌روزرسانی: {current_price.created_at.strftime("%Y-%m-%d %H:%M:%S")}\n'
                f'   سن: {age_minutes:.1f} دقیقه (حداکثر مجاز: {max_age_minutes} دقیقه)\n'
                f'   منبع: {current_price.source}\n'
                f'   قیمت: {current_price.buy_base_price:,} ریال'
            ))
            self.stderr.write(self.style.WARNING(
                '\n⚠️  احتمالاً Celery Beat متوقف شده است!\n'
                '   راه‌حل: bash /app/scripts/start_celery.sh'
            ))
        elif not quiet:
            self.stdout.write(self.style.SUCCESS(
                f'✅ سیستم قیمت‌گذاری سالم است\n'
                f'   آخرین به‌روزرسانی: {current_price.created_at.strftime("%Y-%m-%d %H:%M:%S")}\n'
                f'   سن: {age_minutes:.1f} دقیقه\n'
                f'   منبع: {current_price.source}\n'
                f'   قیمت خرید: {current_price.buy_base_price:,} ریال\n'
                f'   قیمت فروش: {current_price.sell_base_price:,} ریال\n'
                f'   تغییر بازار: {current_price.market_change:,} ریال' if current_price.market_change else ''
            ))
        
        # خروجی برای استفاده در اسکریپت‌ها
        if is_stale:
            exit(1)
        exit(0)
