"""
هماهنگ‌سازی مانده کیف کاربران با اسناد سیستم.

پیش‌فرض dry-run است (هیچ تغییری نمی‌دهد).

مثال‌ها:
  python manage.py reconcile_wallets
  python manage.py reconcile_wallets --phone 09382560128
  python manage.py reconcile_wallets --apply
  python manage.py reconcile_wallets --phone 09382560128 --apply
"""
from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from accounts.services import persian_to_english_numbers
from treasury.reconciliation import apply_expectation, iter_customer_expectations
from treasury.services import maybe_notify_critical_coverage


class Command(BaseCommand):
    help = 'بازسازی/اصلاح مانده کیف از روی واریز، معامله و برداشت (پیش‌فرض: فقط گزارش)'

    def add_arguments(self, parser):
        parser.add_argument('--phone', type=str, default='', help='فقط یک موبایل')
        parser.add_argument('--user-id', type=int, default=0, help='فقط یک user id')
        parser.add_argument(
            '--apply',
            action='store_true',
            help='اعمال اصلاح روی کیف + ثبت تعدیل در دفتر عملیات',
        )

    def handle(self, *args, **options):
        phone = persian_to_english_numbers((options.get('phone') or '').strip()) or None
        user_id = options.get('user_id') or None
        apply = bool(options.get('apply'))

        if phone and user_id:
            raise CommandError('فقط یکی از --phone یا --user-id را بدهید')

        mode = 'APPLY' if apply else 'DRY-RUN'
        self.stdout.write(self.style.MIGRATE_HEADING(f'=== reconcile_wallets [{mode}] ==='))

        scanned = 0
        mismatched = 0
        fixed = 0

        for exp in iter_customer_expectations(user_id=user_id or None, phone=phone):
            scanned += 1
            if not exp.has_diff:
                continue

            mismatched += 1
            self.stdout.write(
                f'- user#{exp.user_id} {exp.name or "-"} / {exp.phone}\n'
                f'  rial actual={exp.actual_rial} expected={exp.expected_rial} delta={exp.delta_rial}\n'
                f'  gold actual={exp.actual_gold} expected={exp.expected_gold} delta={exp.delta_gold}'
            )

            if apply:
                apply_expectation(exp)
                fixed += 1
                self.stdout.write(self.style.SUCCESS('  → اصلاح شد و در دفتر ثبت گردید'))

        self.stdout.write('')
        self.stdout.write(f'scanned={scanned} mismatched={mismatched} fixed={fixed}')
        if not apply and mismatched:
            self.stdout.write(
                self.style.WARNING(
                    'فقط گزارش بود. برای اعمال: همین دستور را با --apply اجرا کنید.'
                )
            )
        if apply and fixed:
            maybe_notify_critical_coverage()
            self.stdout.write(
                self.style.WARNING(
                    'پوشش خزانه را در پنل چک کنید؛ افزایش تعهد طلا ممکن است نسبت پوشش را تغییر دهد.'
                )
            )
        self.stdout.write(self.style.SUCCESS('پایان.'))
