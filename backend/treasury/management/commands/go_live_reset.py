"""
ریست امن داده‌های مالی برای شروع رسمی پلتفرم — بدون حذف کاربران.

نگه می‌دارد:
  CustomUser, CustomerProfile, BankCard, Wallet (ردیف‌ها), SystemSettings,
  DepositAccount, SitePage, GoldPrice

حذف می‌کند:
  لینک واریز-برداشت، فیش واریز، تخصیص حساب واریز، خرید معلق، سفارش هوشمند،
  معاملات (شامل فاکتور دستی)، درخواست واریز/برداشت، اعلان‌ها،
  حرکت خزانه، دفتر عملیات

صفر می‌کند:
  موجودی و قفل‌های Wallet، موجودی و میانگین هزینه CompanyTreasury، فیلد OTP کاربران

استفاده:
  python manage.py go_live_reset --dry-run
  python manage.py go_live_reset --confirm GO_LIVE_RESET
"""
from __future__ import annotations

from decimal import Decimal

from django.contrib.sessions.models import Session
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q

from accounts.models import CustomUser
from notifications.models import Notification, PushSubscription
from trades.models import Order, PendingPurchase, Trade
from treasury.models import CompanyTreasury, OperationalJournal, VaultMovement
from wallet.models import (
    BankCard,
    DepositAccountAssignment,
    DepositReceipt,
    DepositRequest,
    DepositWithdrawalLink,
    Wallet,
    WithdrawalRequest,
)

CONFIRM_PHRASE = 'GO_LIVE_RESET'
ZERO = Decimal('0')


class Command(BaseCommand):
    help = (
        'پاک‌سازی داده‌های مالی تست برای شروع رسمی — کاربران و تنظیمات حفظ می‌شوند. '
        'حتماً اول --dry-run بزنید.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='فقط شمارش و گزارش؛ هیچ تغییری اعمال نمی‌شود',
        )
        parser.add_argument(
            '--confirm',
            type=str,
            default='',
            help=f'برای اجرای واقعی باید دقیقاً برابر {CONFIRM_PHRASE} باشد',
        )
        parser.add_argument(
            '--clear-push',
            action='store_true',
            help='حذف PushSubscription دستگاه‌ها (پیش‌فرض: نگه داشته می‌شود)',
        )
        parser.add_argument(
            '--keep-tokens',
            action='store_true',
            help='توکن‌های JWT را نگه دار (پیش‌فرض: پاک می‌شوند تا همه دوباره لاگین کنند)',
        )
        parser.add_argument(
            '--clear-sessions',
            action='store_true',
            help='پاک کردن سشن‌های Django (شامل ادمین جنگو)',
        )

    def handle(self, *args, **options):
        dry_run = bool(options['dry_run'])
        confirm = (options.get('confirm') or '').strip()
        clear_push = bool(options['clear_push'])
        clear_tokens = not bool(options['keep_tokens'])
        clear_sessions = bool(options['clear_sessions'])

        if not dry_run and confirm != CONFIRM_PHRASE:
            raise CommandError(
                f'برای اجرای واقعی:\n'
                f'  python manage.py go_live_reset --confirm {CONFIRM_PHRASE}\n'
                f'ابتدا گزارش:\n'
                f'  python manage.py go_live_reset --dry-run'
            )

        if dry_run and confirm:
            self.stdout.write(self.style.WARNING('حالت dry-run؛ --confirm نادیده گرفته شد.'))

        plan = self._collect_plan(
            clear_push=clear_push,
            clear_tokens=clear_tokens,
            clear_sessions=clear_sessions,
        )
        self._print_plan(plan, dry_run=dry_run)

        user_count_before = CustomUser.objects.count()
        self.stdout.write(f'کاربران حفظ‌شونده: {user_count_before}')

        if dry_run:
            self.stdout.write(self.style.SUCCESS('Dry-run تمام شد — دیتابیس تغییر نکرد.'))
            return

        with transaction.atomic():
            results = self._execute(
                clear_push=clear_push,
                clear_tokens=clear_tokens,
                clear_sessions=clear_sessions,
            )
            user_count_after = CustomUser.objects.count()
            if user_count_after != user_count_before:
                raise CommandError(
                    f'امنیت: تعداد کاربران تغییر کرد '
                    f'({user_count_before} → {user_count_after}). Rollback.'
                )

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('ریست با موفقیت انجام شد.'))
        for label, n in results.items():
            self.stdout.write(f'  • {label}: {n}')
        self.stdout.write('')
        self.stdout.write(
            self.style.WARNING(
                'بعد از ریست: موجودی واقعی خزانه را از پنل تنظیم کنید، '
                'قیمت فعال را چک کنید، و یک بار لاگین OTP را تست کنید.'
            )
        )

    def _otp_users_qs(self):
        return CustomUser.objects.filter(
            Q(otp_code__isnull=False) | Q(otp_code_created__isnull=False)
        )

    def _collect_plan(self, *, clear_push: bool, clear_tokens: bool, clear_sessions: bool) -> dict:
        from trades.models import GoldPrice
        from settings.models import DepositAccount

        plan = {
            'DepositWithdrawalLink': DepositWithdrawalLink.objects.count(),
            'DepositReceipt': DepositReceipt.objects.count(),
            'DepositAccountAssignment': DepositAccountAssignment.objects.count(),
            'PendingPurchase': PendingPurchase.objects.count(),
            'Order': Order.objects.count(),
            'Trade': Trade.objects.count(),
            'DepositRequest': DepositRequest.objects.count(),
            'WithdrawalRequest': WithdrawalRequest.objects.count(),
            'Notification': Notification.objects.count(),
            'VaultMovement': VaultMovement.objects.count(),
            'OperationalJournal': OperationalJournal.objects.count(),
            'Wallet rows (zero balances)': Wallet.objects.count(),
            'CompanyTreasury (zero gold/avg)': 1,
            'CustomUser OTP to clear': self._otp_users_qs().count(),
        }
        if clear_push:
            plan['PushSubscription'] = PushSubscription.objects.count()
        if clear_tokens:
            try:
                from rest_framework_simplejwt.token_blacklist.models import (
                    BlacklistedToken,
                    OutstandingToken,
                )

                plan['BlacklistedToken'] = BlacklistedToken.objects.count()
                plan['OutstandingToken'] = OutstandingToken.objects.count()
            except Exception:
                plan['JWT tokens'] = '(unavailable)'
        if clear_sessions:
            plan['Session'] = Session.objects.count()

        plan['_KEEP_users'] = CustomUser.objects.count()
        plan['_KEEP_wallets_rows'] = Wallet.objects.count()
        plan['_KEEP_bank_cards'] = BankCard.objects.count()
        plan['_KEEP_gold_prices'] = GoldPrice.objects.count()
        plan['_KEEP_deposit_accounts'] = DepositAccount.objects.count()
        return plan

    def _print_plan(self, plan: dict, *, dry_run: bool) -> None:
        mode = 'DRY-RUN' if dry_run else 'EXECUTE'
        self.stdout.write(self.style.MIGRATE_HEADING(f'=== go_live_reset [{mode}] ==='))
        self.stdout.write('حذف / ریست:')
        for key, value in plan.items():
            if key.startswith('_KEEP_'):
                continue
            self.stdout.write(f'  - {key}: {value}')
        self.stdout.write('حفظ می‌شود:')
        self.stdout.write(f"  - Users: {plan.get('_KEEP_users', 0)}")
        self.stdout.write(f"  - Wallet rows (موجودی صفر): {plan.get('_KEEP_wallets_rows', 0)}")
        self.stdout.write(f"  - BankCard: {plan.get('_KEEP_bank_cards', 0)}")
        self.stdout.write(f"  - GoldPrice: {plan.get('_KEEP_gold_prices', 0)}")
        self.stdout.write(f"  - DepositAccount: {plan.get('_KEEP_deposit_accounts', 0)}")
        self.stdout.write('  - SystemSettings / SitePage / CustomerProfile')
        self.stdout.write('')

    def _execute(self, *, clear_push: bool, clear_tokens: bool, clear_sessions: bool) -> dict:
        results: dict[str, int] = {}

        def wipe(label: str, qs) -> None:
            deleted, _details = qs.delete()
            results[label] = deleted

        # ترتیب حذف با رعایت FK
        wipe('DepositWithdrawalLink', DepositWithdrawalLink.objects.all())
        wipe('DepositReceipt', DepositReceipt.objects.all())
        wipe('DepositAccountAssignment', DepositAccountAssignment.objects.all())
        wipe('PendingPurchase', PendingPurchase.objects.all())
        wipe('Order', Order.objects.all())
        wipe('Trade', Trade.objects.all())
        wipe('DepositRequest', DepositRequest.objects.all())
        wipe('WithdrawalRequest', WithdrawalRequest.objects.all())
        wipe('Notification', Notification.objects.all())
        wipe('VaultMovement', VaultMovement.objects.all())
        wipe('OperationalJournal', OperationalJournal.objects.all())

        if clear_push:
            wipe('PushSubscription', PushSubscription.objects.all())

        if clear_tokens:
            try:
                from rest_framework_simplejwt.token_blacklist.models import (
                    BlacklistedToken,
                    OutstandingToken,
                )

                wipe('BlacklistedToken', BlacklistedToken.objects.all())
                wipe('OutstandingToken', OutstandingToken.objects.all())
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'JWT clear skipped: {e}'))

        if clear_sessions:
            wipe('Session', Session.objects.all())

        results['Wallet zeroed'] = Wallet.objects.update(
            rial_balance=ZERO,
            gold_balance=ZERO,
            pending_withdrawal_rial=ZERO,
            pending_withdrawal_gold=ZERO,
            pending_trade_rial=ZERO,
        )

        treasury = CompanyTreasury.get_solo()
        treasury.gold_balance = ZERO
        treasury.avg_cost_per_gram = ZERO
        treasury.save(update_fields=['gold_balance', 'avg_cost_per_gram', 'updated_at'])
        results['CompanyTreasury zeroed'] = 1

        results['OTP fields cleared'] = self._otp_users_qs().update(
            otp_code=None,
            otp_code_created=None,
        )

        leftovers = {
            'Trade': Trade.objects.count(),
            'Order': Order.objects.count(),
            'PendingPurchase': PendingPurchase.objects.count(),
            'DepositRequest': DepositRequest.objects.count(),
            'WithdrawalRequest': WithdrawalRequest.objects.count(),
            'DepositReceipt': DepositReceipt.objects.count(),
            'DepositWithdrawalLink': DepositWithdrawalLink.objects.count(),
            'OperationalJournal': OperationalJournal.objects.count(),
            'VaultMovement': VaultMovement.objects.count(),
            'non_zero_wallets': Wallet.objects.exclude(
                rial_balance=ZERO,
                gold_balance=ZERO,
                pending_withdrawal_rial=ZERO,
                pending_withdrawal_gold=ZERO,
                pending_trade_rial=ZERO,
            ).count(),
        }
        bad = {k: v for k, v in leftovers.items() if v}
        if bad:
            raise CommandError(f'بعد از ریست هنوز داده باقی مانده: {bad}')

        return results
