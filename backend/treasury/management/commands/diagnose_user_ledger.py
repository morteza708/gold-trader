"""
تشخیص فقط‌خواندنی وضعیت کیف، معاملات، واریز/برداشت و دفتر عملیات یک کاربر.

مثال:
  python manage.py diagnose_user_ledger --phone 09382560128
  python manage.py diagnose_user_ledger --name "علیرضا نجفی"
"""
from __future__ import annotations

from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q, Sum

from accounts.models import CustomUser
from accounts.services import persian_to_english_numbers
from trades.models import Trade
from treasury.models import OperationalJournal
from wallet.models import DepositRequest, Wallet, WithdrawalRequest


class Command(BaseCommand):
    help = 'گزارش تشخیصی فقط‌خواندنی برای یک کاربر (کیف، معامله، مالی، دفتر)'

    def add_arguments(self, parser):
        parser.add_argument('--phone', type=str, default='', help='شماره موبایل')
        parser.add_argument('--name', type=str, default='', help='نام یا بخشی از نام')
        parser.add_argument('--user-id', type=int, default=0, help='شناسه کاربر')

    def handle(self, *args, **options):
        user = self._resolve_user(options)
        wallet, _ = Wallet.objects.get_or_create(user=user)

        self.stdout.write(self.style.MIGRATE_HEADING('=== هویت کاربر ==='))
        self.stdout.write(
            f'id={user.id} | {user.first_name} {user.last_name} | '
            f'{user.phone_number} | active={user.is_active}'
        )

        self.stdout.write(self.style.MIGRATE_HEADING('=== مانده کیف ==='))
        self.stdout.write(f'rial_balance={wallet.rial_balance} (ریال)')
        self.stdout.write(f'gold_balance={wallet.gold_balance} گرم')
        if hasattr(wallet, 'get_available_rial_balance'):
            self.stdout.write(f'available_rial={wallet.get_available_rial_balance()}')
        if hasattr(wallet, 'get_available_gold_balance'):
            self.stdout.write(f'available_gold={wallet.get_available_gold_balance()}')

        trades = Trade.objects.filter(user=user).order_by('created_at')
        self.stdout.write(self.style.MIGRATE_HEADING(f'=== معاملات ({trades.count()}) ==='))
        buy_g = Decimal('0')
        sell_g = Decimal('0')
        for t in trades:
            self.stdout.write(
                f'#{t.id} {t.trade_type} ch={getattr(t, "channel", "?")} '
                f'status={t.status} amount={t.amount} price={t.price} total={t.total} '
                f'invoice={t.invoice_number} at={t.created_at}'
            )
            if t.status == 'SUCCESS':
                if t.trade_type == 'BUY':
                    buy_g += Decimal(str(t.amount))
                elif t.trade_type == 'SELL':
                    sell_g += Decimal(str(t.amount))
        net_trade_gold = buy_g - sell_g
        self.stdout.write(f'SUM buy_gold={buy_g} sell_gold={sell_g} net_from_trades={net_trade_gold}')

        deposits = DepositRequest.objects.filter(user=user).order_by('created_at')
        self.stdout.write(self.style.MIGRATE_HEADING(f'=== واریزها ({deposits.count()}) ==='))
        for d in deposits:
            self.stdout.write(
                f'#{d.id} status={d.status} amount={d.amount} code={getattr(d, "request_code", "")} '
                f'at={d.created_at}'
            )
        dep_approved = deposits.filter(status__in=['APPROVED', 'COMPLETED']).aggregate(
            s=Sum('amount')
        )['s'] or Decimal('0')
        self.stdout.write(f'SUM deposits(APPROVED|COMPLETED)={dep_approved}')

        withdrawals = WithdrawalRequest.objects.filter(user=user).order_by('created_at')
        self.stdout.write(self.style.MIGRATE_HEADING(f'=== برداشت‌ها ({withdrawals.count()}) ==='))
        gold_out_active = Decimal('0')
        rial_completed = Decimal('0')
        for w in withdrawals:
            self.stdout.write(
                f'#{w.id} type={w.withdrawal_type} status={w.status} amount={w.amount} '
                f'code={w.request_code} at={w.created_at}'
            )
            if w.withdrawal_type == 'GOLD' and w.status in (
                'PENDING', 'APPROVED', 'COMPLETED', 'DELIVERED', 'SUCCESS'
            ):
                # در این پلتفرم از لحظه PENDING طلا از کیف کم می‌شود
                gold_out_active += Decimal(str(w.amount))
            if w.withdrawal_type == 'RIAL' and w.status in ('COMPLETED', 'APPROVED', 'SUCCESS'):
                rial_completed += Decimal(str(w.amount))
        self.stdout.write(f'SUM gold_withdrawals(active-ish)={gold_out_active}')
        self.stdout.write(f'SUM rial_withdrawals(completed-ish)={rial_completed}')

        journals = OperationalJournal.objects.filter(user=user).order_by('created_at')
        self.stdout.write(self.style.MIGRATE_HEADING(f'=== دفتر عملیات ({journals.count()}) ==='))
        for j in journals:
            self.stdout.write(
                f'#{j.id} {j.event_type} {j.asset} amount={j.amount} '
                f'bal_after={j.balance_after} ref={j.reference_type}:{j.reference_id} '
                f'note={j.note!r} at={j.created_at}'
            )

        self.stdout.write(self.style.MIGRATE_HEADING('=== تطبیق تقریبی طلا ==='))
        self.stdout.write(
            f'net_from_successful_trades={net_trade_gold} | '
            f'wallet.gold={wallet.gold_balance} | '
            f'diff(wallet - net_trades)={Decimal(str(wallet.gold_balance)) - net_trade_gold}'
        )
        self.stdout.write(
            'اگر wallet.gold << net_from_trades: طلا احتمالاً با برداشت/فروش دیگر/تعدیل خارج شده '
            'یا قبل از هوک خزانه جابه‌جا شده است.'
        )
        self.stdout.write(
            'اگر wallet.gold==0 و کاربر در «طلبکاران طلا» نیست: رفتار فعلی سیستم درست است '
            '(فقط gold_balance>0 نمایش داده می‌شود).'
        )
        self.stdout.write(self.style.SUCCESS('پایان گزارش (تغییری در دیتابیس انجام نشد).'))

    def _resolve_user(self, options) -> CustomUser:
        user_id = options.get('user_id') or 0
        phone = persian_to_english_numbers((options.get('phone') or '').strip())
        name = (options.get('name') or '').strip()

        if user_id:
            try:
                return CustomUser.objects.get(id=user_id)
            except CustomUser.DoesNotExist as exc:
                raise CommandError(f'کاربر id={user_id} یافت نشد') from exc

        qs = CustomUser.objects.all()
        if phone:
            qs = qs.filter(phone_number__icontains=phone)
        if name:
            parts = name.split()
            q = Q()
            for p in parts:
                q &= Q(first_name__icontains=p) | Q(last_name__icontains=p)
            qs = qs.filter(q)

        if not phone and not name:
            raise CommandError('یکی از --phone یا --name یا --user-id لازم است')

        users = list(qs[:10])
        if not users:
            raise CommandError('کاربری یافت نشد')
        if len(users) > 1:
            listing = ', '.join(f'{u.id}:{u.first_name} {u.last_name}/{u.phone_number}' for u in users)
            raise CommandError(f'چند کاربر پیدا شد؛ دقیق‌تر فیلتر کنید: {listing}')
        return users[0]
