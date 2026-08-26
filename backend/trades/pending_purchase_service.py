"""
سرویس خرید معلق (خرید با تسویه بعدی)

قوانین:
- قیمت و مبلغ کل در لحظه ثبت قفل می‌شوند
- سهم موجودی کیف در pending_trade_rial قفل می‌شود (بدون کسر از rial_balance)
- طلا فقط پس از تأیید واریز اعتبار می‌شود
- در هر لحظه حداکثر یک خرید معلق فعال برای هر کاربر
"""
from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
import uuid
import logging
import re

from accounts.models import CustomUser
from wallet.models import Wallet, DepositRequest
from settings.models import SystemSettings
from notifications.services import create_notification, create_notification_for_admins
from .models import GoldPrice, Trade, PendingPurchase, Order

logger = logging.getLogger('trades')


def sanitize_kavenegar_token(value) -> str:
    """
    token/token2/token3 در کاوه‌نگار Space نمی‌پذیرند.
    فاصله‌ها حذف می‌شوند؛ حداکثر ۱۰۰ کاراکتر.
    """
    text = str(value if value is not None else '')
    text = re.sub(r'\s+', '', text)
    return text[:100]


class PendingPurchaseService:
    ACTIVE_STATUSES = (
        PendingPurchase.STATUS_AWAITING_DEPOSIT,
        PendingPurchase.STATUS_AWAITING_ACCOUNTS,
        PendingPurchase.STATUS_AWAITING_RECEIPTS,
        PendingPurchase.STATUS_AWAITING_APPROVAL,
    )

    @staticmethod
    def get_active_for_user(user: CustomUser):
        return (
            PendingPurchase.objects
            .filter(user=user, status__in=PendingPurchaseService.ACTIVE_STATUSES)
            .select_related('deposit_request')
            .order_by('-created_at')
            .first()
        )

    @staticmethod
    def user_has_active(user: CustomUser) -> bool:
        return PendingPurchase.objects.filter(
            user=user,
            status__in=PendingPurchaseService.ACTIVE_STATUSES,
        ).exists()

    @staticmethod
    def assert_user_can_trade(user: CustomUser):
        active = PendingPurchaseService.get_active_for_user(user)
        if active:
            raise ValueError(
                "شما یک خرید در انتظار تسویه دارید. تا تکمیل یا لغو آن امکان معامله جدید وجود ندارد."
            )

    @staticmethod
    def _generate_request_code() -> str:
        return f"PP-{uuid.uuid4().hex[:8].upper()}"

    @staticmethod
    @transaction.atomic
    def create_pending_purchase(user: CustomUser, gold_amount: Decimal) -> PendingPurchase:
        from wallet.tasks import send_sms_async

        TradeService = __import__('trades.services', fromlist=['TradeService']).TradeService
        TradeService.check_trades_enabled()

        gold_amount = Decimal(str(gold_amount)).quantize(Decimal('0.001'), rounding=ROUND_HALF_UP)
        if gold_amount <= 0:
            raise ValueError("مقدار طلا باید بیشتر از صفر باشد")

        # قفل ردیف کیف پول برای جلوگیری از race
        wallet, _ = Wallet.objects.select_for_update().get_or_create(user=user)

        if PendingPurchase.objects.filter(
            user=user,
            status__in=PendingPurchaseService.ACTIVE_STATUSES,
        ).exists():
            raise ValueError("شما از قبل یک خرید در انتظار تسویه دارید")

        price_obj = GoldPrice.get_current_price()
        if not price_obj:
            raise ValueError("قیمت طلا تعریف نشده است")

        locked_unit_price = Decimal(price_obj.buy_final_price).quantize(Decimal('1'))
        locked_total = (gold_amount * locked_unit_price).quantize(Decimal('1'), rounding=ROUND_HALF_UP)
        if locked_total <= 0:
            raise ValueError("مبلغ خرید نامعتبر است")

        available = wallet.get_available_rial_balance()
        if available < 0:
            available = Decimal('0')

        # اگر موجودی کافی است، باید خرید عادی انجام شود نه معلق
        if available >= locked_total:
            raise ValueError("موجودی شما برای این خرید کافی است؛ از خرید عادی استفاده کنید")

        wallet_applied = available.quantize(Decimal('1'), rounding=ROUND_HALF_UP)
        deposit_min = (locked_total - wallet_applied).quantize(Decimal('1'), rounding=ROUND_HALF_UP)
        if deposit_min <= 0:
            raise ValueError("مبلغ واریز محاسبه‌شده نامعتبر است")

        settings = SystemSettings.get_settings()
        expiry_hours = int(getattr(settings, 'pending_purchase_expiry_hours', 4) or 4)
        if expiry_hours < 1:
            expiry_hours = 4

        expires_at = timezone.now() + timedelta(hours=expiry_hours)

        # قفل سهم کیف (بدون کسر از rial_balance)
        wallet.pending_trade_rial = (wallet.pending_trade_rial or Decimal('0')) + wallet_applied
        wallet.save(update_fields=['pending_trade_rial', 'updated_at'])

        pending = PendingPurchase.objects.create(
            user=user,
            gold_amount=gold_amount,
            locked_unit_price=locked_unit_price,
            locked_total=locked_total,
            wallet_applied=wallet_applied,
            deposit_min_amount=deposit_min,
            deposit_requested_amount=deposit_min,
            status=PendingPurchase.STATUS_AWAITING_DEPOSIT,
            request_code=PendingPurchaseService._generate_request_code(),
            expires_at=expires_at,
        )

        # تعلیق سفارش‌های limit باز کاربر برای جلوگیری از تداخل
        Order.objects.filter(user=user, status='PENDING').update(status='SUSPENDED')

        # نوتیفیکیشن کاربر
        create_notification(
            user=user,
            title='خرید در انتظار تسویه',
            message=(
                f'خرید {gold_amount} گرم با قیمت قفل‌شده ثبت شد. '
                f'{expiry_hours} ساعت فرصت دارید واریز را تکمیل کنید. '
                f'حداقل واریز: {int(deposit_min):,} ریال'
            ),
            notification_type='SYSTEM',
            related_object_type='pending_purchase',
            related_object_id=pending.id,
            metadata={
                'request_code': pending.request_code,
                'deposit_min_amount': str(deposit_min),
                'expires_at': expires_at.isoformat(),
            },
        )

        # نوتیفیکیشن مدیران
        create_notification_for_admins(
            title='خرید معلق جدید',
            message=(
                f'کاربر {user.phone_number} خرید معلق {gold_amount} گرم '
                f'({pending.request_code}) ثبت کرد. کف واریز: {int(deposit_min):,} ریال'
            ),
            notification_type='SYSTEM',
            related_object_type='pending_purchase',
            related_object_id=pending.id,
        )

        # SMS فقط برای کاربر — بدون Space در توکن‌ها
        try:
            account_code = 'N/A'
            if hasattr(user, 'customer_profile') and user.customer_profile:
                account_code = user.customer_profile.account_code or 'N/A'

            # گرم بدون فاصله؛ نقطه اعشار مجاز است (Space در token2 ممنوع است)
            gold_token = sanitize_kavenegar_token(f"{gold_amount:.3f}")

            send_sms_async.delay(
                phone_number=user.phone_number,
                template='pending-purchase-created-user',
                token=sanitize_kavenegar_token(account_code),
                token2=gold_token,
                token3=sanitize_kavenegar_token(str(expiry_hours)),
            )
        except Exception as e:
            logger.error(f"خطا در queue پیامک خرید معلق برای {user.phone_number}: {e}", exc_info=True)

        return pending

    @staticmethod
    @transaction.atomic
    def attach_deposit_request(pending: PendingPurchase, deposit_request: DepositRequest, requested_amount: Decimal):
        """اتصال درخواست واریز به خرید معلق؛ مبلغ نباید از کف کمتر باشد."""
        pending = PendingPurchase.objects.select_for_update().get(pk=pending.pk)
        if pending.status != PendingPurchase.STATUS_AWAITING_DEPOSIT:
            raise ValueError("این خرید معلق در وضعیت اتصال واریز نیست")
        if pending.deposit_request_id:
            raise ValueError("قبلاً درخواست واریز به این خرید متصل شده است")

        requested_amount = Decimal(str(requested_amount)).quantize(Decimal('1'))
        if requested_amount < pending.deposit_min_amount:
            raise ValueError(
                f"مبلغ واریز نمی‌تواند کمتر از {int(pending.deposit_min_amount):,} ریال باشد"
            )

        pending.deposit_request = deposit_request
        pending.deposit_requested_amount = requested_amount
        pending.status = PendingPurchase.STATUS_AWAITING_ACCOUNTS
        pending.save(update_fields=[
            'deposit_request', 'deposit_requested_amount', 'status', 'updated_at'
        ])
        return pending

    @staticmethod
    def mark_awaiting_receipts(deposit_request: DepositRequest):
        pending = PendingPurchase.objects.filter(
            deposit_request=deposit_request,
            status=PendingPurchase.STATUS_AWAITING_ACCOUNTS,
        ).first()
        if pending:
            pending.status = PendingPurchase.STATUS_AWAITING_RECEIPTS
            pending.save(update_fields=['status', 'updated_at'])

    @staticmethod
    def mark_awaiting_approval(deposit_request: DepositRequest):
        pending = (
            PendingPurchase.objects
            .filter(deposit_request=deposit_request)
            .filter(status__in=[
                PendingPurchase.STATUS_AWAITING_ACCOUNTS,
                PendingPurchase.STATUS_AWAITING_RECEIPTS,
            ])
            .first()
        )
        if pending:
            pending.status = PendingPurchase.STATUS_AWAITING_APPROVAL
            pending.save(update_fields=['status', 'updated_at'])

    @staticmethod
    @transaction.atomic
    def complete_after_deposit_approved(deposit_request: DepositRequest) -> PendingPurchase | None:
        """
        پس از واریز به کیف (در همان transaction تأیید واریز فراخوانی شود).
        موجودی باید قبلاً به اندازه deposit_request.amount افزایش یافته باشد.
        """
        pending = (
            PendingPurchase.objects
            .select_for_update()
            .filter(deposit_request=deposit_request)
            .filter(status__in=PendingPurchaseService.ACTIVE_STATUSES)
            .first()
        )
        if not pending:
            return None

        wallet = Wallet.objects.select_for_update().get(user=pending.user)

        # آزادسازی قفل سهم قبلی
        if wallet.pending_trade_rial < pending.wallet_applied:
            logger.error(
                "pending_trade_rial کمتر از wallet_applied است user=%s pending=%s",
                pending.user_id, pending.id,
            )
            wallet.pending_trade_rial = Decimal('0')
        else:
            wallet.pending_trade_rial -= pending.wallet_applied

        # کسر مبلغ کل خرید قفل‌شده
        if wallet.rial_balance < pending.locked_total:
            raise ValueError("موجودی پس از واریز برای تکمیل خرید معلق کافی نیست")

        wallet.rial_balance -= pending.locked_total
        wallet.gold_balance += pending.gold_amount
        wallet.save(update_fields=['pending_trade_rial', 'rial_balance', 'gold_balance', 'updated_at'])

        from trades.services import TradeService
        price_obj = GoldPrice.get_current_price()
        margin_profit = Decimal('0')
        if price_obj:
            margin_profit = (price_obj.buy_margin * pending.gold_amount).quantize(
                Decimal('1'), rounding=ROUND_HALF_UP
            )

        trade = Trade.objects.create(
            user=pending.user,
            trade_type='BUY',
            amount=pending.gold_amount,
            price=pending.locked_unit_price,
            total=pending.locked_total,
            fee=Decimal('0'),
            margin_profit=margin_profit,
            status='SUCCESS',
            tracking_code=TradeService.generate_tracking_code(),
            invoice_number=TradeService.generate_invoice_number(),
        )

        pending.trade = trade
        pending.status = PendingPurchase.STATUS_COMPLETED
        pending.completed_at = timezone.now()
        pending.save(update_fields=['trade', 'status', 'completed_at', 'updated_at'])

        create_notification(
            user=pending.user,
            title='خرید طلا تکمیل شد',
            message=(
                f'خرید معلق شما تسویه و {pending.gold_amount} گرم طلا به کیف پول اضافه شد. '
                f'شماره فاکتور: {trade.invoice_number}'
            ),
            notification_type='TRADE_COMPLETED',
            related_object_type='trade',
            related_object_id=trade.id,
        )

        return pending

    @staticmethod
    @transaction.atomic
    def cancel_pending_purchase(user: CustomUser, pending_id: int, by_admin: bool = False) -> PendingPurchase:
        pending = PendingPurchase.objects.select_for_update().get(pk=pending_id, user=user)

        if pending.status not in PendingPurchaseService.ACTIVE_STATUSES:
            raise ValueError("این خرید معلق قابل لغو نیست")

        # اگر فیش آپلود شده، کاربر عادی نباید لغو کند
        if not by_admin and pending.status in (
            PendingPurchase.STATUS_AWAITING_RECEIPTS,
            PendingPurchase.STATUS_AWAITING_APPROVAL,
        ):
            raise ValueError("پس از ارسال فیش، لغو فقط توسط پشتیبانی امکان‌پذیر است")

        wallet = Wallet.objects.select_for_update().get(user=user)
        if wallet.pending_trade_rial >= pending.wallet_applied:
            wallet.pending_trade_rial -= pending.wallet_applied
        else:
            wallet.pending_trade_rial = Decimal('0')
        wallet.save(update_fields=['pending_trade_rial', 'updated_at'])

        pending.status = PendingPurchase.STATUS_CANCELLED
        pending.cancelled_at = timezone.now()
        pending.save(update_fields=['status', 'cancelled_at', 'updated_at'])

        create_notification(
            user=user,
            title='خرید معلق لغو شد',
            message=f'خرید معلق {pending.request_code} لغو و موجودی قفل‌شده آزاد شد.',
            notification_type='SYSTEM',
            related_object_type='pending_purchase',
            related_object_id=pending.id,
        )
        return pending

    @staticmethod
    @transaction.atomic
    def expire_if_needed(pending: PendingPurchase) -> bool:
        pending = PendingPurchase.objects.select_for_update().get(pk=pending.pk)
        if pending.status not in PendingPurchaseService.ACTIVE_STATUSES:
            return False
        if pending.expires_at and pending.expires_at > timezone.now():
            return False

        wallet = Wallet.objects.select_for_update().get(user=pending.user)
        if wallet.pending_trade_rial >= pending.wallet_applied:
            wallet.pending_trade_rial -= pending.wallet_applied
        else:
            wallet.pending_trade_rial = Decimal('0')
        wallet.save(update_fields=['pending_trade_rial', 'updated_at'])

        pending.status = PendingPurchase.STATUS_EXPIRED
        pending.cancelled_at = timezone.now()
        pending.save(update_fields=['status', 'cancelled_at', 'updated_at'])

        create_notification(
            user=pending.user,
            title='مهلت خرید معلق تمام شد',
            message=f'مهلت تسویه خرید {pending.request_code} به پایان رسید و سفارش منقضی شد.',
            notification_type='SYSTEM',
            related_object_type='pending_purchase',
            related_object_id=pending.id,
        )
        return True

    @staticmethod
    def expire_due_pending_purchases() -> dict:
        """انقضای دسته‌ای خریدهای معلقی که مهلتشان گذشته است."""
        now = timezone.now()
        due_ids = list(
            PendingPurchase.objects.filter(
                status__in=PendingPurchaseService.ACTIVE_STATUSES,
                expires_at__lte=now,
            ).values_list('id', flat=True)
        )
        expired_count = 0
        for pending_id in due_ids:
            try:
                pending = PendingPurchase.objects.get(pk=pending_id)
                if PendingPurchaseService.expire_if_needed(pending):
                    expired_count += 1
            except Exception as e:
                logger.error(
                    "خطا در انقضای خرید معلق %s: %s",
                    pending_id,
                    e,
                    exc_info=True,
                )
        return {
            'checked': len(due_ids),
            'expired': expired_count,
        }
