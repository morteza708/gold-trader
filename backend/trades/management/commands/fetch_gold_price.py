from django.core.management.base import BaseCommand

from trades.tasks import fetch_viragold_price


class Command(BaseCommand):
    help = 'دریافت فوری قیمت گرم ۱۸ عیار / حواله از ویراگلد و ذخیره در صورت تغییر'

    def handle(self, *args, **options):
        result = fetch_viragold_price()
        if result.get('skipped'):
            self.stdout.write(self.style.WARNING(
                'رد شد: VIRAGOLD_API_TOKEN در محیط تنظیم نشده است.'
            ))
            return

        if result.get('ok'):
            if result.get('changed'):
                self.stdout.write(self.style.SUCCESS(
                    f"قیمت جدید ذخیره شد: {result.get('buy_base_price')} ریال"
                ))
            else:
                self.stdout.write(
                    f"قیمت بدون تغییر بود: {result.get('buy_base_price')} ریال"
                )
            return

        self.stderr.write(self.style.ERROR(
            f"خطا در دریافت قیمت: {result.get('error')}"
        ))
