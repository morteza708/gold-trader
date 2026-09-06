"""
سرویس خزانه و دفتر عملیات
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from .models import CompanyTreasury, OperationalJournal, VaultMovement

ZERO = Decimal('0')
Q6 = Decimal('0.000001')


class TreasuryError(Exception):
    """خطای قابل نمایش به کاربر/ادمین"""

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def _q6(value: Decimal | int | float | str) -> Decimal:
    return Decimal(str(value)).quantize(Q6, rounding=ROUND_HALF_UP)


def _q0(value: Decimal | int | float | str) -> Decimal:
    return Decimal(str(value)).quantize(Decimal('1'), rounding=ROUND_HALF_UP)


def get_customer_gold_liability() -> Decimal:
    """جمع طلای موجود در کیف کاربران (بدهی شرکت به مشتریان)"""
    from wallet.models import Wallet

    total = Wallet.objects.aggregate(s=Sum('gold_balance'))['s']
    return _q6(total or ZERO)


def get_pending_gold_delivery() -> Decimal:
    """طلای برداشت‌شده در انتظار تحویل حضوری (APPROVED)"""
    from wallet.models import WithdrawalRequest

    total = WithdrawalRequest.objects.filter(
        withdrawal_type='GOLD',
        status='APPROVED',
    ).aggregate(s=Sum('amount'))['s']
    return _q6(total or ZERO)


def get_coverage_snapshot(treasury: CompanyTreasury | None = None) -> dict[str, Any]:
    treasury = treasury or CompanyTreasury.get_solo()
    vault = _q6(treasury.gold_balance)
    liability = get_customer_gold_liability()
    pending_delivery = get_pending_gold_delivery()
    obligated = liability + pending_delivery

    if obligated <= ZERO:
        cover_ratio = Decimal('9.9999') if vault >= ZERO else ZERO
    else:
        cover_ratio = (vault / obligated).quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)

    warning = treasury.warning_cover_ratio
    critical = treasury.critical_cover_ratio

    if cover_ratio < critical:
        status = 'critical'
        status_label = 'بحرانی'
    elif cover_ratio < warning:
        status = 'warning'
        status_label = 'هشدار'
    else:
        status = 'ok'
        status_label = 'عادی'

    buy_blocked = bool(
        treasury.auto_block_user_buy and status == 'critical'
    )

    shortfall = max(ZERO, obligated - vault)

    return {
        'company_gold_balance': vault,
        'avg_cost_per_gram': _q0(treasury.avg_cost_per_gram),
        'customer_gold_liability': liability,
        'pending_gold_delivery': pending_delivery,
        'obligated_gold': obligated,
        'cover_ratio': cover_ratio,
        'cover_percent': (cover_ratio * Decimal('100')).quantize(Decimal('0.01')),
        'status': status,
        'status_label': status_label,
        'buy_blocked': buy_blocked,
        'auto_block_user_buy': treasury.auto_block_user_buy,
        'warning_cover_ratio': treasury.warning_cover_ratio,
        'critical_cover_ratio': treasury.critical_cover_ratio,
        'shortfall_gold': shortfall,
        'updated_at': treasury.updated_at,
    }


def assert_user_buy_allowed() -> None:
    snap = get_coverage_snapshot()
    if snap['buy_blocked']:
        raise TreasuryError(
            'به‌دلیل کمبود موجودی طلای شرکت، خرید موقتاً غیرفعال است. '
            'لطفاً بعداً دوباره تلاش کنید.'
        )


def assert_gold_delivery_allowed(amount: Decimal) -> None:
    treasury = CompanyTreasury.get_solo()
    amount = _q6(amount)
    if treasury.gold_balance < amount:
        raise TreasuryError(
            f'موجودی طلای شرکت ({treasury.gold_balance} گرم) برای تحویل '
            f'{amount} گرم کافی نیست. ابتدا طلا به خزانه اضافه کنید.'
        )


@transaction.atomic
def record_journal(
    *,
    asset: str,
    amount: Decimal,
    event_type: str,
    user=None,
    unit_price: Decimal | None = None,
    balance_after: Decimal | None = None,
    reference_type: str = '',
    reference_id: int | None = None,
    note: str = '',
    created_by=None,
) -> OperationalJournal:
    return OperationalJournal.objects.create(
        asset=asset,
        amount=_q6(amount),
        unit_price=_q0(unit_price) if unit_price is not None else None,
        event_type=event_type,
        user=user,
        balance_after=_q6(balance_after) if balance_after is not None else None,
        reference_type=reference_type or '',
        reference_id=reference_id,
        note=note or '',
        created_by=created_by,
    )


def _apply_weighted_avg(
    current_balance: Decimal,
    current_avg: Decimal,
    delta: Decimal,
    unit_price: Decimal,
) -> tuple[Decimal, Decimal]:
    """ورود مثبت با قیمت → میانگین موزون؛ خروج فقط موجودی را کم می‌کند."""
    new_balance = current_balance + delta
    if new_balance < ZERO:
        raise TreasuryError('موجودی طلای شرکت نمی‌تواند منفی شود.')

    if delta > ZERO and unit_price > ZERO:
        if current_balance <= ZERO:
            return new_balance, _q0(unit_price)
        total_cost = (current_balance * current_avg) + (delta * unit_price)
        new_avg = _q0(total_cost / new_balance)
        return new_balance, new_avg

    if new_balance <= ZERO:
        return ZERO, ZERO

    return new_balance, current_avg


@transaction.atomic
def apply_vault_movement(
    *,
    movement_type: str,
    amount: Decimal,
    unit_price: Decimal = ZERO,
    counterparty: str = '',
    note: str = '',
    created_by=None,
) -> VaultMovement:
    amount = _q6(amount)
    unit_price = _q0(unit_price)

    if movement_type == VaultMovement.MovementType.ADJUST:
        if not (note or '').strip():
            raise TreasuryError('برای تعدیل، نوشتن دلیل الزامی است.')
        delta = amount  # می‌تواند منفی باشد
        event_type = OperationalJournal.EventType.ADJUSTMENT
    elif movement_type == VaultMovement.MovementType.IN:
        if amount <= ZERO:
            raise TreasuryError('مقدار ورود به خزانه باید بیشتر از صفر باشد.')
        delta = amount
        event_type = OperationalJournal.EventType.VAULT_IN
    elif movement_type == VaultMovement.MovementType.OUT:
        if amount <= ZERO:
            raise TreasuryError('مقدار خروج از خزانه باید بیشتر از صفر باشد.')
        delta = -amount
        event_type = OperationalJournal.EventType.VAULT_OUT
    else:
        raise TreasuryError('نوع حرکت نامعتبر است.')

    treasury = CompanyTreasury.objects.select_for_update().get(pk=CompanyTreasury.get_solo().pk)
    avg_cost_before = _q0(treasury.avg_cost_per_gram)

    realized_pnl = ZERO
    if delta < ZERO and unit_price > ZERO:
        grams_out = abs(delta)
        realized_pnl = _q0((unit_price - avg_cost_before) * grams_out)

    new_balance, new_avg = _apply_weighted_avg(
        _q6(treasury.gold_balance),
        avg_cost_before,
        delta,
        unit_price if delta > ZERO else ZERO,
    )
    treasury.gold_balance = new_balance
    treasury.avg_cost_per_gram = new_avg
    treasury.save(update_fields=['gold_balance', 'avg_cost_per_gram', 'updated_at'])

    journal = record_journal(
        asset=OperationalJournal.Asset.GOLD,
        amount=delta,
        event_type=event_type,
        unit_price=unit_price if unit_price > ZERO else None,
        balance_after=new_balance,
        reference_type='vault_movement',
        note=note,
        created_by=created_by,
    )

    movement = VaultMovement.objects.create(
        movement_type=movement_type,
        amount=delta if movement_type == VaultMovement.MovementType.ADJUST else amount,
        unit_price=unit_price,
        counterparty=counterparty or '',
        note=note or '',
        created_by=created_by,
        journal_entry=journal,
        avg_cost_before=avg_cost_before,
        realized_inventory_pnl=realized_pnl,
    )
    journal.reference_id = movement.id
    journal.save(update_fields=['reference_id'])

    return movement


def get_pnl_snapshot(
    date_from: date | None = None,
    date_to: date | None = None,
) -> dict[str, Any]:
    """گزارش سود و زیان عملیاتی برای بازه تاریخ (شامل ابتدا و انتها)."""
    now = timezone.now()
    today = now.date()
    if date_from is None:
        date_from = today
    if date_to is None:
        date_to = today
    if date_from > date_to:
        date_from, date_to = date_to, date_from

    start = datetime.combine(date_from, datetime.min.time())
    end = datetime.combine(date_to, datetime.min.time()) + timedelta(days=1)

    from trades.models import Trade, GoldPrice

    spread = Trade.objects.filter(
        status='SUCCESS',
        created_at__gte=start,
        created_at__lt=end,
    ).aggregate(s=Sum('margin_profit'))['s']
    spread_pnl = _q0(spread or ZERO)

    inventory_realized = VaultMovement.objects.filter(
        created_at__gte=start,
        created_at__lt=end,
    ).aggregate(s=Sum('realized_inventory_pnl'))['s']
    inventory_realized_pnl = _q0(inventory_realized or ZERO)

    treasury = CompanyTreasury.get_solo()
    vault = _q6(treasury.gold_balance)
    avg_cost = _q0(treasury.avg_cost_per_gram)

    price_obj = GoldPrice.get_current_price()
    market_ref = _q0(price_obj.buy_base_price) if price_obj else ZERO

    if vault > ZERO and market_ref > ZERO:
        inventory_unrealized_pnl = _q0((market_ref - avg_cost) * vault)
    else:
        inventory_unrealized_pnl = ZERO

    operating_total = _q0(spread_pnl + inventory_realized_pnl)

    return {
        'date_from': date_from.isoformat(),
        'date_to': date_to.isoformat(),
        'spread_pnl': spread_pnl,
        'inventory_realized_pnl': inventory_realized_pnl,
        'inventory_unrealized_pnl': inventory_unrealized_pnl,
        'operating_total': operating_total,
        'company_gold_balance': vault,
        'avg_cost_per_gram': avg_cost,
        'market_ref_price': market_ref,
        'market_ref_label': 'قیمت پایه خرید بازار (جایگزینی)',
    }


@transaction.atomic
def on_user_buy(*, user, gold_amount: Decimal, rial_total: Decimal, unit_price: Decimal, trade_id: int) -> None:
    """خرید کاربر: بدهی طلا↑، ریال کاربر↓؛ از خزانه فیزیکی کم نمی‌شود."""
    gold_amount = _q6(gold_amount)
    from wallet.models import Wallet

    wallet = Wallet.objects.select_for_update().get(user=user)
    record_journal(
        asset=OperationalJournal.Asset.RIAL,
        amount=-_q6(rial_total),
        event_type=OperationalJournal.EventType.BUY,
        user=user,
        unit_price=_q0(unit_price),
        balance_after=_q6(wallet.rial_balance),
        reference_type='trade',
        reference_id=trade_id,
        note='خرید طلا توسط کاربر',
    )
    record_journal(
        asset=OperationalJournal.Asset.GOLD,
        amount=gold_amount,
        event_type=OperationalJournal.EventType.BUY,
        user=user,
        unit_price=_q0(unit_price),
        balance_after=_q6(wallet.gold_balance),
        reference_type='trade',
        reference_id=trade_id,
        note='افزایش بدهی طلا به کاربر',
    )


@transaction.atomic
def on_user_sell(*, user, gold_amount: Decimal, rial_total: Decimal, unit_price: Decimal, trade_id: int) -> None:
    """فروش کاربر: بدهی طلا↓، ریال↑؛ طلا وارد خزانه شرکت می‌شود با میانگین موزون."""
    gold_amount = _q6(gold_amount)
    unit_price = _q0(unit_price)
    from wallet.models import Wallet

    wallet = Wallet.objects.select_for_update().get(user=user)
    record_journal(
        asset=OperationalJournal.Asset.GOLD,
        amount=-gold_amount,
        event_type=OperationalJournal.EventType.SELL,
        user=user,
        unit_price=unit_price,
        balance_after=_q6(wallet.gold_balance),
        reference_type='trade',
        reference_id=trade_id,
        note='کاهش بدهی طلا به کاربر',
    )
    record_journal(
        asset=OperationalJournal.Asset.RIAL,
        amount=_q6(rial_total),
        event_type=OperationalJournal.EventType.SELL,
        user=user,
        unit_price=unit_price,
        balance_after=_q6(wallet.rial_balance),
        reference_type='trade',
        reference_id=trade_id,
        note='افزایش ریال کاربر بابت فروش طلا',
    )

    treasury = CompanyTreasury.objects.select_for_update().get(pk=CompanyTreasury.get_solo().pk)
    new_balance, new_avg = _apply_weighted_avg(
        _q6(treasury.gold_balance),
        _q0(treasury.avg_cost_per_gram),
        gold_amount,
        unit_price,
    )
    treasury.gold_balance = new_balance
    treasury.avg_cost_per_gram = new_avg
    treasury.save(update_fields=['gold_balance', 'avg_cost_per_gram', 'updated_at'])

    record_journal(
        asset=OperationalJournal.Asset.GOLD,
        amount=gold_amount,
        event_type=OperationalJournal.EventType.VAULT_IN,
        user=user,
        unit_price=unit_price,
        balance_after=new_balance,
        reference_type='trade',
        reference_id=trade_id,
        note='ورود طلای فروخته‌شده توسط کاربر به خزانه شرکت',
    )


@transaction.atomic
def on_deposit_approved(*, user, amount: Decimal, deposit_id: int) -> None:
    from wallet.models import Wallet

    wallet = Wallet.objects.select_for_update().get(user=user)
    record_journal(
        asset=OperationalJournal.Asset.RIAL,
        amount=_q6(amount),
        event_type=OperationalJournal.EventType.DEPOSIT,
        user=user,
        balance_after=_q6(wallet.rial_balance),
        reference_type='deposit',
        reference_id=deposit_id,
        note='تأیید واریز ریال',
    )


@transaction.atomic
def on_rial_withdrawal_completed(*, user, amount: Decimal, withdrawal_id: int) -> None:
    from wallet.models import Wallet

    wallet = Wallet.objects.select_for_update().get(user=user)
    record_journal(
        asset=OperationalJournal.Asset.RIAL,
        amount=-_q6(amount),
        event_type=OperationalJournal.EventType.WITHDRAW_RIAL,
        user=user,
        balance_after=_q6(wallet.rial_balance),
        reference_type='withdrawal',
        reference_id=withdrawal_id,
        note='تکمیل برداشت ریال',
    )


@transaction.atomic
def on_gold_delivery_completed(*, user, amount: Decimal, withdrawal_id: int, created_by=None) -> None:
    """تحویل حضوری: بدهی کاربر قبلاً کم شده؛ از خزانه شرکت کم می‌شود."""
    amount = _q6(amount)
    assert_gold_delivery_allowed(amount)

    treasury = CompanyTreasury.objects.select_for_update().get(pk=CompanyTreasury.get_solo().pk)
    new_balance, new_avg = _apply_weighted_avg(
        _q6(treasury.gold_balance),
        _q0(treasury.avg_cost_per_gram),
        -amount,
        ZERO,
    )
    treasury.gold_balance = new_balance
    treasury.avg_cost_per_gram = new_avg
    treasury.save(update_fields=['gold_balance', 'avg_cost_per_gram', 'updated_at'])

    record_journal(
        asset=OperationalJournal.Asset.GOLD,
        amount=-amount,
        event_type=OperationalJournal.EventType.GOLD_DELIVERY,
        user=user,
        balance_after=new_balance,
        reference_type='withdrawal',
        reference_id=withdrawal_id,
        note='خروج طلا از خزانه بابت تحویل حضوری',
        created_by=created_by,
    )


def maybe_notify_critical_coverage(previous_status: str | None = None) -> None:
    """اعلان درون‌برنامه‌ای به مدیران در ورود به وضعیت بحرانی"""
    snap = get_coverage_snapshot()
    if snap['status'] != 'critical':
        return
    if previous_status == 'critical':
        return
    try:
        from notifications.services import create_notification_for_admins

        create_notification_for_admins(
            title='کمبود موجودی طلای شرکت',
            message=(
                f'وضعیت پوشش خزانه بحرانی است. '
                f'موجودی شرکت: {snap["company_gold_balance"]} گرم — '
                f'بدهی به مشتریان: {snap["obligated_gold"]} گرم. '
                f'خرید کاربران در صورت فعال بودن توقف خودکار، مسدود شده است.'
            ),
            notification_type='SYSTEM',
            metadata={
                'cover_ratio': str(snap['cover_ratio']),
                'shortfall_gold': str(snap['shortfall_gold']),
            },
        )
    except Exception:
        pass


@transaction.atomic
def on_manual_buy_offplatform(
    *,
    user,
    gold_amount: Decimal,
    unit_price: Decimal,
    trade_id: int,
    created_by=None,
) -> None:
    """خرید دستی خارج از سامانه: فقط بدهی طلا↑ — ریال از کیف کم نمی‌شود."""
    gold_amount = _q6(gold_amount)
    from wallet.models import Wallet

    wallet = Wallet.objects.select_for_update().get(user=user)
    record_journal(
        asset=OperationalJournal.Asset.GOLD,
        amount=gold_amount,
        event_type=OperationalJournal.EventType.MANUAL_BUY,
        user=user,
        unit_price=_q0(unit_price),
        balance_after=_q6(wallet.gold_balance),
        reference_type='trade',
        reference_id=trade_id,
        note='خرید دستی — تسویه ریال خارج از سامانه',
        created_by=created_by,
    )


@transaction.atomic
def on_manual_sell_offplatform(
    *,
    user,
    gold_amount: Decimal,
    unit_price: Decimal,
    trade_id: int,
    created_by=None,
) -> None:
    """فروش دستی خارج از سامانه: بدهی طلا↓، ورود به خزانه، بدون واریز ریال به کیف."""
    gold_amount = _q6(gold_amount)
    unit_price = _q0(unit_price)
    from wallet.models import Wallet

    wallet = Wallet.objects.select_for_update().get(user=user)
    record_journal(
        asset=OperationalJournal.Asset.GOLD,
        amount=-gold_amount,
        event_type=OperationalJournal.EventType.MANUAL_SELL,
        user=user,
        unit_price=unit_price,
        balance_after=_q6(wallet.gold_balance),
        reference_type='trade',
        reference_id=trade_id,
        note='فروش دستی — تسویه ریال خارج از سامانه',
        created_by=created_by,
    )

    treasury = CompanyTreasury.objects.select_for_update().get(pk=CompanyTreasury.get_solo().pk)
    new_balance, new_avg = _apply_weighted_avg(
        _q6(treasury.gold_balance),
        _q0(treasury.avg_cost_per_gram),
        gold_amount,
        unit_price,
    )
    treasury.gold_balance = new_balance
    treasury.avg_cost_per_gram = new_avg
    treasury.save(update_fields=['gold_balance', 'avg_cost_per_gram', 'updated_at'])

    record_journal(
        asset=OperationalJournal.Asset.GOLD,
        amount=gold_amount,
        event_type=OperationalJournal.EventType.VAULT_IN,
        user=user,
        unit_price=unit_price,
        balance_after=new_balance,
        reference_type='trade',
        reference_id=trade_id,
        note='ورود طلای فروش دستی به خزانه',
        created_by=created_by,
    )
