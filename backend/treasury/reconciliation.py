"""
بازسازی مانده موردانتظار کیف از اسناد سیستم و اصلاح اختلاف‌ها.

منبع حقیقت:
- واریز APPROVED/COMPLETED → +ریال
- معامله SUCCESS خرید/فروش پلتفرم یا دستی با تسویه کیف → ±ریال و ±طلا
- معامله SUCCESS دستی خارج‌ازسامانه → فقط ±طلا
- برداشت غیر REJECTED → −ریال یا −طلا (چون در ایجاد درخواست از کیف کم می‌شود)
"""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction

from accounts.models import CustomUser, UserRole
from trades.models import Trade
from wallet.models import DepositRequest, Wallet, WithdrawalRequest

from . import services
from .models import OperationalJournal

ZERO = Decimal('0')
GOLD_EPS = Decimal('0.0005')


def _q0(value) -> Decimal:
    return Decimal(str(value)).quantize(Decimal('1'), rounding=ROUND_HALF_UP)


def _q6(value) -> Decimal:
    return Decimal(str(value)).quantize(Decimal('0.000001'), rounding=ROUND_HALF_UP)


@dataclass
class WalletExpectation:
    user_id: int
    phone: str
    name: str
    actual_rial: Decimal
    actual_gold: Decimal
    expected_rial: Decimal
    expected_gold: Decimal
    delta_rial: Decimal
    delta_gold: Decimal

    @property
    def has_diff(self) -> bool:
        return abs(self.delta_rial) >= Decimal('1') or abs(self.delta_gold) > GOLD_EPS


def reconstruct_expected_balances(user: CustomUser) -> tuple[Decimal, Decimal]:
    """بازمانده ریال/طلای موردانتظار صرفاً از اسناد."""
    rial = ZERO
    gold = ZERO

    deposits = DepositRequest.objects.filter(
        user=user,
        status__in=['APPROVED', 'COMPLETED'],
    ).only('amount', 'status')
    for d in deposits:
        rial += _q0(d.amount)

    trades = Trade.objects.filter(user=user, status='SUCCESS').only(
        'trade_type', 'amount', 'total', 'channel', 'settlement_mode'
    )
    for t in trades:
        amount = _q6(t.amount)
        total = _q0(t.total)
        offplatform = (
            getattr(t, 'channel', Trade.CHANNEL_PLATFORM) == Trade.CHANNEL_MANUAL
            and getattr(t, 'settlement_mode', Trade.SETTLEMENT_WALLET)
            == Trade.SETTLEMENT_OFFPLATFORM
        )
        if t.trade_type == 'BUY':
            gold += amount
            if not offplatform:
                rial -= total
        elif t.trade_type == 'SELL':
            gold -= amount
            if not offplatform:
                rial += total

    withdrawals = WithdrawalRequest.objects.filter(user=user).exclude(
        status='REJECTED'
    ).only('withdrawal_type', 'amount', 'status')
    for w in withdrawals:
        if w.withdrawal_type == 'RIAL':
            rial -= _q0(w.amount)
        else:
            gold -= _q6(w.amount)

    return _q0(rial), _q6(gold)


def build_expectation(user: CustomUser, wallet: Wallet | None = None) -> WalletExpectation:
    if wallet is None:
        wallet, _ = Wallet.objects.get_or_create(user=user)
    expected_rial, expected_gold = reconstruct_expected_balances(user)
    actual_rial = _q0(wallet.rial_balance)
    actual_gold = _q6(wallet.gold_balance)
    name = f'{user.first_name or ""} {user.last_name or ""}'.strip()
    return WalletExpectation(
        user_id=user.id,
        phone=user.phone_number or '',
        name=name,
        actual_rial=actual_rial,
        actual_gold=actual_gold,
        expected_rial=expected_rial,
        expected_gold=expected_gold,
        delta_rial=expected_rial - actual_rial,
        delta_gold=expected_gold - actual_gold,
    )


def iter_customer_expectations(*, user_id: int | None = None, phone: str | None = None):
    qs = CustomUser.objects.filter(role=UserRole.CUSTOMER).order_by('id')
    if user_id:
        qs = qs.filter(id=user_id)
    if phone:
        qs = qs.filter(phone_number=phone)

    wallets = {
        w.user_id: w
        for w in Wallet.objects.filter(user_id__in=qs.values_list('id', flat=True))
    }
    for user in qs.iterator(chunk_size=200):
        yield build_expectation(user, wallets.get(user.id))


@transaction.atomic
def apply_expectation(exp: WalletExpectation, *, created_by=None) -> Wallet:
    """
    کیف را به مانده اسناد می‌رساند و ردیف تعدیل در دفتر ثبت می‌کند.
    فقط برای اختلاف واقعی؛ idempotent پس از یک‌بار اعمال.
    """
    if not exp.has_diff:
        return Wallet.objects.select_for_update().get(user_id=exp.user_id)

    wallet = Wallet.objects.select_for_update().get(user_id=exp.user_id)
    # دوباره محاسبه زیر قفل
    user = CustomUser.objects.get(id=exp.user_id)
    fresh = build_expectation(user, wallet)
    if not fresh.has_diff:
        return wallet

    note_base = (
        'اصلاح یکپارچگی کیف از روی اسناد (واریز/معامله/برداشت). '
        f'قبل: ریال={fresh.actual_rial} طلا={fresh.actual_gold} | '
        f'بعد: ریال={fresh.expected_rial} طلا={fresh.expected_gold}'
    )

    updates = []
    if abs(fresh.delta_rial) >= Decimal('1'):
        wallet.rial_balance = fresh.expected_rial
        updates.append('rial_balance')
        services.record_journal(
            asset=OperationalJournal.Asset.RIAL,
            amount=fresh.delta_rial,
            event_type=OperationalJournal.EventType.ADJUSTMENT,
            user=user,
            balance_after=_q6(fresh.expected_rial),
            reference_type='wallet_reconcile',
            reference_id=wallet.id,
            note=note_base,
            created_by=created_by,
        )

    if abs(fresh.delta_gold) > GOLD_EPS:
        wallet.gold_balance = fresh.expected_gold
        updates.append('gold_balance')
        services.record_journal(
            asset=OperationalJournal.Asset.GOLD,
            amount=fresh.delta_gold,
            event_type=OperationalJournal.EventType.ADJUSTMENT,
            user=user,
            balance_after=_q6(fresh.expected_gold),
            reference_type='wallet_reconcile',
            reference_id=wallet.id,
            note=note_base,
            created_by=created_by,
        )

    if updates:
        updates.append('updated_at')
        wallet.save(update_fields=updates)

    return wallet
