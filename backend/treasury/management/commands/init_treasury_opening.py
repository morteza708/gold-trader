from django.core.management.base import BaseCommand
from django.db import transaction

from treasury.models import CompanyTreasury, OperationalJournal
from treasury.services import record_journal, _q6
from wallet.models import Wallet


class Command(BaseCommand):
    help = (
        'ایجاد رکورد خزانه و ثبت مانده افتتاحیه برای کیف‌های غیرصفر '
        '(موجودی کاربران تغییر نمی‌کند)'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='حتی اگر ردیف افتتاحیه از قبل وجود دارد، دوباره ثبت نکن (پیش‌فرض: رد کردن کیف‌های دارای OPENING)',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        treasury = CompanyTreasury.get_solo()
        self.stdout.write(self.style.SUCCESS(f'خزانه شرکت آماده است (موجودی فعلی: {treasury.gold_balance} گرم)'))

        created = 0
        skipped = 0
        wallets = Wallet.objects.select_related('user').all()
        for wallet in wallets:
            has_opening = OperationalJournal.objects.filter(
                user=wallet.user,
                event_type=OperationalJournal.EventType.OPENING,
            ).exists()
            if has_opening and not options['force']:
                skipped += 1
                continue

            if wallet.rial_balance and wallet.rial_balance != 0:
                record_journal(
                    asset=OperationalJournal.Asset.RIAL,
                    amount=_q6(wallet.rial_balance),
                    event_type=OperationalJournal.EventType.OPENING,
                    user=wallet.user,
                    balance_after=_q6(wallet.rial_balance),
                    reference_type='wallet',
                    reference_id=wallet.id,
                    note='مانده افتتاحیه ریال',
                )
                created += 1

            if wallet.gold_balance and wallet.gold_balance != 0:
                record_journal(
                    asset=OperationalJournal.Asset.GOLD,
                    amount=_q6(wallet.gold_balance),
                    event_type=OperationalJournal.EventType.OPENING,
                    user=wallet.user,
                    balance_after=_q6(wallet.gold_balance),
                    reference_type='wallet',
                    reference_id=wallet.id,
                    note='مانده افتتاحیه طلا',
                )
                created += 1

        self.stdout.write(self.style.SUCCESS(
            f'ثبت شد: {created} ردیف افتتاحیه — رد شد: {skipped} کیف (قبلاً افتتاحیه داشتند)'
        ))
        self.stdout.write(
            'توجه: موجودی طلای شرکت را از پنل «خزانه و حسابرسی» → ورود به خزانه وارد کنید.'
        )
