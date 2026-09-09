"""
صدور فاکتور دستی توسط ادمین — بدون شکستن مسیر معامله پلتفرم
"""
from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.db.models import Q

from accounts.models import CustomUser, UserRole
from wallet.models import Wallet
from treasury import services as treasury_services
from treasury.services import TreasuryError

from .models import Trade, GoldPrice
from .services import TradeService
from .delivery_fields import (
    apply_delivery_fields,
    normalize_delivery_payload,
)

ZERO = Decimal('0')


class ManualTradeError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def _q0(value) -> Decimal:
    return Decimal(str(value)).quantize(Decimal('1'), rounding=ROUND_HALF_UP)


def _q3(value) -> Decimal:
    return Decimal(str(value)).quantize(Decimal('0.001'), rounding=ROUND_HALF_UP)


def search_customers(query: str, limit: int = 20):
    """جستجوی سبک مشتریان با موبایل / نام / نام‌خانوادگی / کد ملی — سقف محدود برای UI"""
    from django.db.models import Value, CharField
    from django.db.models.functions import Concat, Coalesce
    from accounts.services import persian_to_english_numbers

    q = (query or '').strip()
    if len(q) < 2:
        return CustomUser.objects.none()

    q_en = persian_to_english_numbers(q)
    parts = [p for p in q.split() if p]

    filters = (
        Q(phone_number__icontains=q_en)
        | Q(first_name__icontains=q)
        | Q(last_name__icontains=q)
        | Q(national_id__icontains=q_en)
        | Q(full_name_search__icontains=q)
    )
    # جستجوی چندکلمه‌ای مثل «علی رضایی»
    if len(parts) >= 2:
        filters |= Q(first_name__icontains=parts[0], last_name__icontains=parts[-1])
        filters |= Q(first_name__icontains=parts[-1], last_name__icontains=parts[0])

    qs = (
        CustomUser.objects.filter(role=UserRole.CUSTOMER)
        .annotate(
            full_name_search=Concat(
                Coalesce('first_name', Value('')),
                Value(' '),
                Coalesce('last_name', Value('')),
                output_field=CharField(),
            )
        )
        .filter(filters)
        .order_by('-id')[:limit]
    )
    return qs


@transaction.atomic
def ensure_manual_customer(
    *,
    phone_number: str,
    first_name: str = '',
    last_name: str = '',
    national_id: str = '',
) -> CustomUser:
    """یافتن یا ساخت مشتری تأییدشده برای فاکتور دستی (بدون OTP)."""
    from accounts.services import persian_to_english_numbers

    phone = persian_to_english_numbers(str(phone_number or ''))
    phone = ''.join(ch for ch in phone if ch.isdigit())
    if not phone.startswith('09') or len(phone) != 11:
        raise ManualTradeError('شماره موبایل نامعتبر است')

    first_name = (first_name or '').strip()
    last_name = (last_name or '').strip()
    national_id = persian_to_english_numbers((national_id or '').strip())
    national_id = ''.join(ch for ch in national_id if ch.isdigit()) or ''

    user = CustomUser.objects.filter(phone_number=phone).select_for_update().first()
    if user:
        if user.role != UserRole.CUSTOMER:
            raise ManualTradeError('این شماره متعلق به کاربر غیرمشتری است')
        updates = []
        if first_name and not user.first_name:
            user.first_name = first_name
            updates.append('first_name')
        if last_name and not user.last_name:
            user.last_name = last_name
            updates.append('last_name')
        if national_id and not user.national_id:
            user.national_id = national_id
            updates.append('national_id')
        if not user.is_phone_verified:
            user.is_phone_verified = True
            updates.append('is_phone_verified')
        # پروفایل کامل فقط با کارت ملی + تاریخ تولد است؛ با نام به‌تنهایی True نکن
        if user.profile_completed and not user.is_profile_complete():
            user.profile_completed = False
            updates.append('profile_completed')
        if updates:
            user.save(update_fields=updates)
        Wallet.objects.get_or_create(user=user)
        return user

    user = CustomUser(
        phone_number=phone,
        first_name=first_name,
        last_name=last_name,
        national_id=national_id or None,
        is_phone_verified=True,
        role=UserRole.CUSTOMER,
        profile_completed=False,
        is_active=True,
    )
    user.set_unusable_password()
    user.save()
    Wallet.objects.get_or_create(user=user)
    return user


@transaction.atomic
def create_manual_trade(
    *,
    user: CustomUser,
    trade_type: str,
    amount: Decimal,
    unit_price: Decimal | None = None,
    settlement_mode: str,
    payment_status: str,
    delivery_status: str,
    admin_note: str = '',
    settlement_note: str = '',
    delivery_payload: dict | None = None,
    created_by=None,
) -> Trade:
    trade_type = trade_type.upper()
    if trade_type not in ('BUY', 'SELL'):
        raise ManualTradeError('نوع معامله نامعتبر است')

    amount = _q3(amount)
    if amount <= ZERO:
        raise ManualTradeError('مقدار باید بیشتر از صفر باشد')

    if settlement_mode not in (Trade.SETTLEMENT_WALLET, Trade.SETTLEMENT_OFFPLATFORM):
        raise ManualTradeError('حالت تسویه نامعتبر است')

    price_obj = GoldPrice.get_current_price()
    if unit_price is None or Decimal(str(unit_price)) <= ZERO:
        if not price_obj:
            raise ManualTradeError('قیمت طلا تعریف نشده است')
        unit_price = (
            price_obj.buy_final_price if trade_type == 'BUY' else price_obj.sell_final_price
        )

    unit_price = _q0(unit_price)
    if unit_price <= ZERO:
        raise ManualTradeError('قیمت واحد باید بیشتر از صفر باشد')

    total = _q0(amount * unit_price)

    if price_obj:
        if trade_type == 'BUY':
            margin_profit = _q0(price_obj.buy_margin * amount)
        else:
            margin_profit = _q0(price_obj.sell_margin * amount)
    else:
        margin_profit = ZERO

    wallet, _ = Wallet.objects.get_or_create(user=user)
    wallet = Wallet.objects.select_for_update().get(pk=wallet.pk)

    if settlement_mode == Trade.SETTLEMENT_WALLET:
        if trade_type == 'BUY':
            try:
                treasury_services.assert_user_buy_allowed()
            except TreasuryError as e:
                raise ManualTradeError(e.message) from e
            if wallet.get_available_rial_balance() < total:
                raise ManualTradeError('موجودی ریالی کیف کاربر کافی نیست')
        else:
            if wallet.get_available_gold_balance() < amount:
                raise ManualTradeError('موجودی طلای کیف کاربر کافی نیست')
    else:
        if trade_type == 'BUY':
            try:
                treasury_services.assert_user_buy_allowed()
            except TreasuryError as e:
                raise ManualTradeError(e.message) from e
        else:
            if wallet.get_available_gold_balance() < amount:
                raise ManualTradeError(
                    'برای فروش دستی، موجودی طلای کیف کاربر باید کافی باشد'
                )

    tracking_code = TradeService.generate_tracking_code()
    invoice_number = TradeService.generate_invoice_number()

    trade = Trade.objects.create(
        user=user,
        trade_type=trade_type,
        amount=amount,
        price=unit_price,
        total=total,
        fee=ZERO,
        margin_profit=margin_profit,
        status='SUCCESS',
        tracking_code=tracking_code,
        invoice_number=invoice_number,
        admin_note=admin_note or '',
        channel=Trade.CHANNEL_MANUAL,
        settlement_mode=settlement_mode,
        payment_status=payment_status,
        delivery_status=delivery_status,
        settlement_note=settlement_note or '',
        created_by=created_by,
    )

    if delivery_payload:
        try:
            normalized = normalize_delivery_payload(delivery_payload)
        except ValueError as e:
            raise ManualTradeError(str(e)) from e
        apply_delivery_fields(trade, normalized, save=True)

    if settlement_mode == Trade.SETTLEMENT_WALLET:
        if trade_type == 'BUY':
            wallet.rial_balance -= total
            wallet.gold_balance += amount
        else:
            wallet.gold_balance -= amount
            wallet.rial_balance += total
        wallet.save(update_fields=['rial_balance', 'gold_balance'])

        if trade_type == 'BUY':
            treasury_services.on_user_buy(
                user=user,
                gold_amount=amount,
                rial_total=total,
                unit_price=unit_price,
                trade_id=trade.id,
            )
            treasury_services.maybe_notify_critical_coverage()
        else:
            treasury_services.on_user_sell(
                user=user,
                gold_amount=amount,
                rial_total=total,
                unit_price=unit_price,
                trade_id=trade.id,
            )
    else:
        if trade_type == 'BUY':
            wallet.gold_balance += amount
            wallet.save(update_fields=['gold_balance'])
            treasury_services.on_manual_buy_offplatform(
                user=user,
                gold_amount=amount,
                unit_price=unit_price,
                trade_id=trade.id,
                created_by=created_by,
            )
            treasury_services.maybe_notify_critical_coverage()
        else:
            wallet.gold_balance -= amount
            wallet.save(update_fields=['gold_balance'])
            treasury_services.on_manual_sell_offplatform(
                user=user,
                gold_amount=amount,
                unit_price=unit_price,
                trade_id=trade.id,
                created_by=created_by,
            )

    _apply_settlement_financial_effects(trade, created_by=created_by)
    return trade


def _apply_settlement_financial_effects(trade: Trade, *, created_by=None) -> None:
    """اعمال یک‌بارهٔ اثر مالی وضعیت‌های پرداخت/تحویل (idempotent)."""
    if (
        trade.settlement_mode == Trade.SETTLEMENT_OFFPLATFORM
        and trade.payment_status == Trade.PAYMENT_OFFPLATFORM
    ):
        treasury_services.on_manual_offplatform_payment(
            user=trade.user,
            trade_type=trade.trade_type,
            rial_total=trade.total,
            trade_id=trade.id,
            created_by=created_by,
        )

    if trade.delivery_status == Trade.DELIVERY_DELIVERED and trade.trade_type == 'BUY':
        try:
            treasury_services.on_manual_trade_delivery(
                user=trade.user,
                trade_type=trade.trade_type,
                gold_amount=trade.amount,
                trade_id=trade.id,
                created_by=created_by,
            )
        except TreasuryError as e:
            raise ManualTradeError(e.message) from e


@transaction.atomic
def update_manual_settlement(
    *,
    trade: Trade,
    payment_status: str | None = None,
    delivery_status: str | None = None,
    settlement_note: str | None = None,
    admin_note: str | None = None,
    amount: Decimal | None = None,
    unit_price: Decimal | None = None,
    delivery_payload: dict | None = None,
    created_by=None,
    confirm_delivery: bool = False,
) -> Trade:
    if trade.channel != Trade.CHANNEL_MANUAL:
        raise ManualTradeError('فقط فاکتورهای دستی قابل به‌روزرسانی وضعیت تسویه هستند')

    trade = Trade.objects.select_for_update().select_related('user').get(pk=trade.pk)

    payment_applied = treasury_services.manual_payment_effect_applied(trade.id)
    delivery_applied = treasury_services.manual_delivery_effect_applied(trade.id)

    if delivery_applied and delivery_payload:
        raise ManualTradeError(
            'پس از ثبت تحویل، مشخصات سند تحویل قابل ویرایش نیست'
        )

    updates = []

    # ویرایش وزن/فی فقط قبل از پرداخت و تحویل خزانه، و فقط برای تسویه خارج از سامانه
    wants_core_edit = amount is not None or unit_price is not None
    if wants_core_edit:
        if delivery_applied:
            raise ManualTradeError('پس از ثبت تحویل، وزن و مبلغ قابل ویرایش نیست')
        if payment_applied:
            raise ManualTradeError(
                'پس از ثبت پرداخت خارج از سامانه، وزن و مبلغ قابل ویرایش نیست'
            )
        if trade.settlement_mode == Trade.SETTLEMENT_WALLET:
            raise ManualTradeError(
                'ویرایش وزن/مبلغ برای فاکتور با تسویه کیف پول پس از صدور ممکن نیست'
            )

        old_amount = trade.amount
        old_total = trade.total
        new_amount = _q3(amount) if amount is not None else trade.amount
        new_price = _q0(unit_price) if unit_price is not None else trade.price
        if new_amount <= ZERO:
            raise ManualTradeError('مقدار باید بیشتر از صفر باشد')
        if new_price <= ZERO:
            raise ManualTradeError('قیمت واحد باید بیشتر از صفر باشد')
        new_total = _q0(new_amount * new_price)

        price_obj = GoldPrice.get_current_price()
        if price_obj:
            if trade.trade_type == 'BUY':
                new_margin = _q0(price_obj.buy_margin * new_amount)
            else:
                new_margin = _q0(price_obj.sell_margin * new_amount)
        else:
            new_margin = trade.margin_profit

        wallet = Wallet.objects.select_for_update().get(user=trade.user)
        delta_gold = new_amount - old_amount

        if trade.settlement_mode == Trade.SETTLEMENT_OFFPLATFORM:
            if trade.trade_type == 'BUY':
                # طلا قبلاً به کیف اضافه شده؛ اختلاف را اعمال کن
                if delta_gold > ZERO:
                    try:
                        treasury_services.assert_user_buy_allowed()
                    except TreasuryError as e:
                        raise ManualTradeError(e.message) from e
                if wallet.gold_balance + delta_gold < ZERO:
                    raise ManualTradeError('موجودی طلای کیف برای کاهش وزن فاکتور کافی نیست')
                wallet.gold_balance += delta_gold
                wallet.save(update_fields=['gold_balance'])
            else:
                # فروش: طلا از کیف کم شده؛ افزایش وزن یعنی طلای بیشتر از کیف
                if delta_gold > ZERO:
                    if wallet.get_available_gold_balance() < delta_gold:
                        raise ManualTradeError('موجودی طلای کیف برای افزایش وزن فروش کافی نیست')
                    wallet.gold_balance -= delta_gold
                elif delta_gold < ZERO:
                    wallet.gold_balance -= delta_gold  # delta منفی → اضافه به کیف
                wallet.save(update_fields=['gold_balance'])

        trade.amount = new_amount
        trade.price = new_price
        trade.total = new_total
        trade.margin_profit = new_margin
        updates.extend(['amount', 'price', 'total', 'margin_profit'])

        # اگر بخواهیم موجودی تعهد خزانه با وزن جدید هم‌خوان باشد:
        # on_manual_* هنگام create زده شده؛ برای سادگی phase1 فقط کیف را اصلاح می‌کنیم
        # و از تغییر دوباره ژورنال خزانه خودداری می‌کنیم تا اثر دوگانه نسازد.
        _ = old_total  # reserved for future rial journal adjust

    if payment_status is not None:
        valid = {c[0] for c in Trade.PAYMENT_STATUS_CHOICES}
        if payment_status not in valid:
            raise ManualTradeError('وضعیت پرداخت نامعتبر است')
        if payment_applied and payment_status != Trade.PAYMENT_OFFPLATFORM:
            raise ManualTradeError(
                'اثر پرداخت خارج از سامانه قبلاً در دفتر ثبت شده و قابل برگشت نیست'
            )
        trade.payment_status = payment_status
        updates.append('payment_status')
    if delivery_status is not None:
        valid = {c[0] for c in Trade.DELIVERY_STATUS_CHOICES}
        if delivery_status not in valid:
            raise ManualTradeError('وضعیت تحویل نامعتبر است')
        if delivery_applied and delivery_status != Trade.DELIVERY_DELIVERED:
            raise ManualTradeError('اثر تحویل قبلاً در دفتر/خزانه ثبت شده و قابل برگشت نیست')
        if (
            delivery_status == Trade.DELIVERY_DELIVERED
            and trade.trade_type == 'BUY'
            and not delivery_applied
            and not confirm_delivery
        ):
            raise ManualTradeError(
                'برای ثبت «تحویل شد» روی خرید دستی، تأیید صریح اثر مالی لازم است '
                '(کاهش طلای کیف و خروج از خزانه).'
            )
        trade.delivery_status = delivery_status
        updates.append('delivery_status')
    if settlement_note is not None:
        trade.settlement_note = settlement_note
        updates.append('settlement_note')
    if admin_note is not None:
        trade.admin_note = admin_note
        updates.append('admin_note')

    if delivery_payload is not None:
        try:
            normalized = normalize_delivery_payload(delivery_payload)
        except ValueError as e:
            raise ManualTradeError(str(e)) from e
        updates.extend(apply_delivery_fields(trade, normalized, save=False))

    if updates:
        # unique list preserving order
        seen = set()
        uniq = []
        for f in updates + ['updated_at']:
            if f not in seen:
                seen.add(f)
                uniq.append(f)
        trade.save(update_fields=uniq)

    _apply_settlement_financial_effects(trade, created_by=created_by)
    return trade
