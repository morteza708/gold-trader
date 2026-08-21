"""
Management command to check gold price sync health.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from trades.models import GoldPrice


class Command(BaseCommand):
    help = (
        'بررسی سلامت همگام‌سازی قیمت از API. '
        'بر اساس last_synced_at (آخرین دریافت موفق) نه تغییر قیمت پایه.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--max-age',
            type=int,
            default=10,
            help='حداکثر سن آخرین همگام‌سازی به دقیقه (پیش‌فرض: 10)',
        )
        parser.add_argument(
            '--quiet',
            action='store_true',
            help='فقط در صورت مشکل خروجی نمایش بده',
        )

    def handle(self, *args, **options):
        max_age_minutes = options['max_age']
        quiet = options['quiet']

        current_price = GoldPrice.get_current_price()

        if not current_price:
            self.stderr.write(self.style.ERROR('❌ هیچ قیمتی در دیتابیس وجود ندارد!'))
            raise SystemExit(1)

        now = timezone.now()
        synced_at = current_price.last_synced_at or current_price.created_at
        age_minutes = (now - synced_at).total_seconds() / 60
        base_age_minutes = (now - current_price.created_at).total_seconds() / 60
        is_stale = age_minutes > max_age_minutes

        market_time = current_price.market_price_time or '—'

        if is_stale:
            self.stderr.write(self.style.ERROR(
                f'❌ همگام‌سازی متوقف شده است!\n'
                f'   آخرین همگام‌سازی: {synced_at.strftime("%Y-%m-%d %H:%M:%S")}\n'
                f'   سن همگام‌سازی: {age_minutes:.1f} دقیقه (حداکثر مجاز: {max_age_minutes})\n'
                f'   آخرین تغییر پایه: {current_price.created_at.strftime("%Y-%m-%d %H:%M:%S")} '
                f'({base_age_minutes:.1f} دقیقه پیش)\n'
                f'   زمان نرخ ویراگلد: {market_time}\n'
                f'   منبع: {current_price.source}\n'
                f'   قیمت: {current_price.buy_base_price:,} ریال'
            ))
            self.stderr.write(self.style.WARNING(
                '\n⚠️  احتمالاً Celery Worker/Beat مشکل دارد یا API در دسترس نیست.\n'
                '   بررسی: docker compose logs celery_worker celery_beat --tail=50'
            ))
            raise SystemExit(1)

        if not quiet:
            base_note = ''
            if base_age_minutes > max_age_minutes:
                base_note = (
                    f'\n   ℹ️  قیمت پایه از {base_age_minutes:.0f} دقیقه پیش تغییر نکرده '
                    f'(معمولاً بازار بسته یا نرخ ثابت ویراگلد)'
                )
            change_line = ''
            if current_price.market_change is not None:
                change_line = f'\n   تغییر بازار: {current_price.market_change:,} ریال'

            self.stdout.write(self.style.SUCCESS(
                f'✅ همگام‌سازی سالم است\n'
                f'   آخرین همگام‌سازی: {synced_at.strftime("%Y-%m-%d %H:%M:%S")} '
                f'({age_minutes:.1f} دقیقه پیش)\n'
                f'   آخرین تغییر پایه: {current_price.created_at.strftime("%Y-%m-%d %H:%M:%S")}\n'
                f'   زمان نرخ ویراگلد: {market_time}\n'
                f'   منبع: {current_price.source}\n'
                f'   قیمت خرید: {current_price.buy_base_price:,} ریال\n'
                f'   قیمت فروش: {current_price.sell_base_price:,} ریال'
                f'{change_line}{base_note}'
            ))

        raise SystemExit(0)
