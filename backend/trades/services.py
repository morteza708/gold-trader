from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from accounts.models import CustomUser
from wallet.models import Wallet
from settings.models import SystemSettings
from .models import GoldPrice, Trade, Order
from notifications.services import create_notification
import logging

logger = logging.getLogger('trades')


class TradeService:
    """سرویس معاملات"""
    
    @staticmethod
    def check_trades_enabled():
        """
        بررسی اینکه آیا معاملات فعال هستند یا نه
        
        Returns:
            bool: True اگر معاملات فعال باشند
        
        Raises:
            ValueError: اگر معاملات غیرفعال باشند
        """
        settings = SystemSettings.get_settings()
        
        if not settings.trades_enabled:
            raise ValueError("معاملات در حال حاضر غیرفعال است. لطفاً بعداً تلاش کنید.")
        
        return True
    
    @staticmethod
    def get_current_price(trade_type='BUY'):
        """
        دریافت قیمت فعلی طلا
        
        Args:
            trade_type: 'BUY' برای قیمت خرید، 'SELL' برای قیمت فروش
        
        Returns:
            Decimal: قیمت نهایی (قیمت پایه + حاشیه سود)
        """
        price_obj = GoldPrice.get_current_price()
        if not price_obj:
            raise ValueError("قیمت طلا تعریف نشده است")
        
        if trade_type == 'BUY':
            return price_obj.buy_final_price
        else:  # SELL
            return price_obj.sell_final_price
    
    @staticmethod
    def get_current_prices():
        """
        دریافت هر دو قیمت خرید و فروش
        
        Returns:
            dict: {'buy': Decimal, 'sell': Decimal, 'price_obj': GoldPrice}
        """
        price_obj = GoldPrice.get_current_price()
        if not price_obj:
            raise ValueError("قیمت طلا تعریف نشده است")
        
        return {
            'buy': price_obj.buy_final_price,
            'sell': price_obj.sell_final_price,
            'buy_base': price_obj.buy_base_price,
            'sell_base': price_obj.sell_base_price,
            'buy_margin': price_obj.buy_margin,
            'sell_margin': price_obj.sell_margin,
            'price_obj': price_obj
        }
    
    @staticmethod
    def calculate_fee(trade_type, amount, price_obj=None):
        """
        محاسبه کارمزد بر اساس حاشیه سود
        
        طبق منطق سیستم:
        - حاشیه سود به صورت ریالی است (نه درصدی)
        - حاشیه سود برای هر گرم طلا است
        - کارمزد = حاشیه سود × مقدار (گرم)
        
        Args:
            trade_type: 'BUY' یا 'SELL'
            amount: مقدار طلا به گرم
            price_obj: شیء GoldPrice (اگر None باشد، قیمت فعلی دریافت می‌شود)
        
        Returns:
            Decimal: کارمزد محاسبه شده (ریال)
        """
        # اگر price_obj مشخص نشده باشد، قیمت فعلی را دریافت می‌کنیم
        if price_obj is None:
            price_obj = GoldPrice.get_current_price()
            if not price_obj:
                raise ValueError("قیمت طلا تعریف نشده است")
        
        # محاسبه کارمزد بر اساس حاشیه سود
        if trade_type == 'BUY':
            # برای خرید: کارمزد = حاشیه سود خرید × مقدار
            fee = price_obj.buy_margin * amount
        else:  # SELL
            # برای فروش: کارمزد = حاشیه سود فروش × مقدار
            fee = price_obj.sell_margin * amount
        
        # گرد کردن به عدد صحیح (چون fee به صورت Decimal با decimal_places=0 ذخیره می‌شود)
        return fee.quantize(Decimal('1'), rounding='ROUND_HALF_UP')
    
    @staticmethod
    def generate_tracking_code():
        """تولید کد رهگیری"""
        import uuid
        return f"TRX-{uuid.uuid4().hex[:8].upper()}"
    
    @staticmethod
    def generate_invoice_number():
        """تولید شماره فاکتور"""
        # شماره فاکتور از 1001 شروع می‌شود
        last_trade = Trade.objects.order_by('-id').first()
        if last_trade:
            last_number = int(last_trade.invoice_number.split('-')[-1])
            new_number = last_number + 1
        else:
            new_number = 1001
        return f"INV-{new_number:04d}"
    
    @staticmethod
    @transaction.atomic
    def execute_instant_trade(user: CustomUser, trade_type: str, amount: Decimal):
        """
        اجرای معامله فوری
        
        Args:
            user: کاربر
            trade_type: 'BUY' یا 'SELL'
            amount: مقدار طلا به گرم
        
        Returns:
            Trade object
        
        Raises:
            ValueError: اگر معاملات غیرفعال باشند
        """
        # 0. بررسی فعال بودن معاملات
        TradeService.check_trades_enabled()
        
        # 1. دریافت قیمت فعلی
        price_obj = GoldPrice.get_current_price()
        if not price_obj:
            raise ValueError("قیمت طلا تعریف نشده است")
        
        # استفاده از قیمت نهایی (قیمت پایه + حاشیه سود) - همان قیمتی که کاربر می‌بیند
        if trade_type == 'BUY':
            final_price = price_obj.buy_final_price
        else:  # SELL
            final_price = price_obj.sell_final_price
        
        # 2. محاسبه مبلغ کل بر اساس قیمت نهایی (همان قیمتی که کاربر می‌بیند)
        total = amount * final_price
        
        # 3. دریافت یا ایجاد کیف پول
        wallet, _ = Wallet.objects.get_or_create(user=user)
        
        # 4. بررسی موجودی قابل استفاده (کل - مسدود شده)
        # برای خرید: باید موجودی برای total کافی باشد
        # برای فروش: باید موجودی طلا کافی باشد
        if trade_type == 'BUY':
            # برای خرید: موجودی ریال قابل استفاده باید کافی باشد
            available_rial = wallet.get_available_rial_balance()
            if available_rial < total:
                raise ValueError("موجودی ریالی کافی نیست")
        else:  # SELL
            # برای فروش: موجودی طلای قابل استفاده باید کافی باشد
            available_gold = wallet.get_available_gold_balance()
            if available_gold < amount:
                raise ValueError("موجودی طلا کافی نیست")
        
        # 5. محاسبه سود حاشیه (برای ذخیره در دیتابیس)
        if trade_type == 'BUY':
            margin_profit = price_obj.buy_margin * amount
        else:  # SELL
            margin_profit = price_obj.sell_margin * amount
        margin_profit = margin_profit.quantize(Decimal('1'), rounding='ROUND_HALF_UP')
        
        # 6. تولید کد رهگیری و شماره فاکتور
        tracking_code = TradeService.generate_tracking_code()
        invoice_number = TradeService.generate_invoice_number()
        
        # 7. ایجاد معامله
        # هیچ کارمزد اضافی وجود ندارد (حاشیه سود قبلاً در قیمت نهایی است)
        trade = Trade.objects.create(
            user=user,
            trade_type=trade_type,
            amount=amount,
            price=final_price,  # قیمت نهایی (قیمت پایه + حاشیه سود)
            total=total,  # مبلغ کل بر اساس قیمت نهایی
            fee=Decimal('0'),  # هیچ کارمزد اضافی وجود ندارد
            margin_profit=margin_profit,  # سود حاشیه (برای گزارش‌گیری)
            status='PENDING',
            tracking_code=tracking_code,
            invoice_number=invoice_number,
        )
        
        # 7. به‌روزرسانی موجودی
        if trade_type == 'BUY':
            # خرید: کسر ریال، افزودن طلا
            wallet.rial_balance -= total
            wallet.gold_balance += amount
        else:  # SELL
            # فروش: کسر طلا، افزودن ریال
            wallet.gold_balance -= amount
            wallet.rial_balance += total
        
        wallet.save()
        
        # 9. تغییر وضعیت به موفق
        trade.status = 'SUCCESS'
        trade.save()
        
        return trade
    
    @staticmethod
    @transaction.atomic
    def execute_trade_with_price(user: CustomUser, trade_type: str, amount: Decimal, price: Decimal):
        """
        اجرای معامله با قیمت مشخص (برای limit orders)
        
        Args:
            user: کاربر
            trade_type: 'BUY' یا 'SELL'
            amount: مقدار طلا به گرم
            price: قیمت معامله (قیمت هدف - به عنوان قیمت نهایی در نظر گرفته می‌شود)
        
        Returns:
            Trade object
        
        Note:
            price در اینجا به عنوان قیمت نهایی در نظر گرفته می‌شود (همان قیمتی که کاربر می‌بیند).
            هیچ کارمزد اضافی وجود ندارد (حاشیه سود قبلاً در قیمت نهایی است).
        """
        # 0. بررسی فعال بودن معاملات
        TradeService.check_trades_enabled()
        
        # 1. دریافت قیمت فعلی برای محاسبه سود حاشیه
        price_obj = GoldPrice.get_current_price()
        if not price_obj:
            raise ValueError("قیمت طلا تعریف نشده است")
        
        # 2. محاسبه مبلغ کل با قیمت مشخص (price به عنوان قیمت نهایی در نظر گرفته می‌شود)
        total = amount * price
        
        # 3. دریافت یا ایجاد کیف پول
        wallet, _ = Wallet.objects.get_or_create(user=user)
        
        # 4. بررسی موجودی قابل استفاده (کل - مسدود شده)
        # برای خرید: باید موجودی برای total کافی باشد
        # برای فروش: باید موجودی طلا کافی باشد
        if trade_type == 'BUY':
            # برای خرید: موجودی ریال قابل استفاده باید کافی باشد
            available_rial = wallet.get_available_rial_balance()
            if available_rial < total:
                raise ValueError("موجودی ریالی کافی نیست")
        else:  # SELL
            # برای فروش: موجودی طلای قابل استفاده باید کافی باشد
            available_gold = wallet.get_available_gold_balance()
            if available_gold < amount:
                raise ValueError("موجودی طلا کافی نیست")
        
        # 5. محاسبه سود حاشیه (برای ذخیره در دیتابیس)
        if trade_type == 'BUY':
            margin_profit = price_obj.buy_margin * amount
        else:  # SELL
            margin_profit = price_obj.sell_margin * amount
        margin_profit = margin_profit.quantize(Decimal('1'), rounding='ROUND_HALF_UP')
        
        # 6. تولید کد رهگیری و شماره فاکتور
        tracking_code = TradeService.generate_tracking_code()
        invoice_number = TradeService.generate_invoice_number()
        
        # 7. ایجاد معامله
        # هیچ کارمزد اضافی وجود ندارد (حاشیه سود قبلاً در قیمت نهایی است)
        trade = Trade.objects.create(
            user=user,
            trade_type=trade_type,
            amount=amount,
            price=price,  # قیمت نهایی (همان قیمتی که کاربر می‌بیند)
            total=total,  # مبلغ کل بر اساس قیمت نهایی
            fee=Decimal('0'),  # هیچ کارمزد اضافی وجود ندارد
            margin_profit=margin_profit,  # سود حاشیه (برای گزارش‌گیری)
            status='PENDING',
            tracking_code=tracking_code,
            invoice_number=invoice_number,
        )
        
        # 8. به‌روزرسانی موجودی
        if trade_type == 'BUY':
            # خرید: کسر ریال، افزودن طلا
            wallet.rial_balance -= total
            wallet.gold_balance += amount
        else:  # SELL
            # فروش: کسر طلا، افزودن ریال
            wallet.gold_balance -= amount
            wallet.rial_balance += total
        
        wallet.save()
        
        # 9. تغییر وضعیت به موفق
        trade.status = 'SUCCESS'
        trade.save()
        
        return trade
    
    @staticmethod
    @transaction.atomic
    def create_limit_order(user: CustomUser, order_type: str, target_price: Decimal, amount: Decimal):
        """
        ایجاد سفارش هوشمند
        
        Args:
            user: کاربر
            order_type: 'BUY_LIMIT' یا 'SELL_LIMIT'
            target_price: قیمت هدف
            amount: مقدار طلا به گرم
        
        Returns:
            Order object
        
        Raises:
            ValueError: اگر معاملات غیرفعال باشند
        """
        # 0. بررسی فعال بودن معاملات
        TradeService.check_trades_enabled()
        
        # 1. دریافت قیمت فعلی
        price_obj = GoldPrice.get_current_price()
        if not price_obj:
            raise ValueError("قیمت طلا تعریف نشده است")
        
        # target_price به عنوان قیمت نهایی در نظر گرفته می‌شود (همان قیمتی که کاربر می‌بیند)
        # برای مقایسه، باید با قیمت نهایی فعلی مقایسه شود
        if order_type == 'BUY_LIMIT':
            current_final_price = price_obj.buy_final_price
            # برای خرید لیمیت: قیمت هدف (نهایی) باید کمتر از قیمت نهایی فعلی خرید باشد
            if target_price >= current_final_price:
                raise ValueError("قیمت هدف باید کمتر از قیمت فعلی خرید باشد")
        else:  # SELL_LIMIT
            current_final_price = price_obj.sell_final_price
            # برای فروش لیمیت: قیمت هدف (نهایی) باید بیشتر از قیمت نهایی فعلی فروش باشد
            if target_price <= current_final_price:
                raise ValueError("قیمت هدف باید بیشتر از قیمت فعلی فروش باشد")
        
        # 2. دریافت یا ایجاد کیف پول
        wallet, _ = Wallet.objects.get_or_create(user=user)
        
        # 3. بررسی موجودی قابل استفاده (برای رزرو)
        # total بر اساس قیمت نهایی (بدون کارمزد اضافی)
        total = amount * target_price
        if order_type == 'BUY_LIMIT':
            # برای خرید: موجودی ریال قابل استفاده باید کافی باشد
            available_rial = wallet.get_available_rial_balance()
            if available_rial < total:
                raise ValueError("موجودی ریالی کافی نیست")
        else:  # SELL_LIMIT
            # برای فروش: موجودی طلای قابل استفاده باید کافی باشد
            available_gold = wallet.get_available_gold_balance()
            if available_gold < amount:
                raise ValueError("موجودی طلا کافی نیست")
        
        # 5. ایجاد سفارش
        order = Order.objects.create(
            user=user,
            order_type=order_type,
            target_price=target_price,
            amount=amount,
            status='PENDING',
        )
        
        return order
    
    @staticmethod
    @transaction.atomic
    def execute_limit_order(order: Order, current_final_price: Decimal):
        """
        اجرای سفارش هوشمند (وقتی قیمت به هدف رسید)
        
        Args:
            order: سفارش
            current_final_price: قیمت نهایی فعلی (برای مقایسه با target_price)
        
        Returns:
            Trade object یا None
        """
        # بررسی وضعیت سفارش
        if order.status != 'PENDING':
            return None  # فقط سفارشات در انتظار قابل اجرا هستند
        
        # بررسی فعال بودن معاملات
        try:
            TradeService.check_trades_enabled()
        except ValueError:
            # اگر معاملات غیرفعال باشد، سفارش را معلق می‌کنیم
            order.status = 'SUSPENDED'
            order.save()
            return None
        
        # بررسی اینکه آیا قیمت نهایی به هدف رسیده
        # برای BUY_LIMIT: وقتی قیمت نهایی فعلی <= قیمت هدف (قیمت پایین آمده)
        # برای SELL_LIMIT: وقتی قیمت نهایی فعلی >= قیمت هدف (قیمت بالا رفته)
        if order.order_type == 'BUY_LIMIT':
            if current_final_price > order.target_price:
                return None  # هنوز به قیمت هدف نرسیده
        else:  # SELL_LIMIT
            if current_final_price < order.target_price:
                return None  # هنوز به قیمت هدف نرسیده
        
        # اجرای معامله با قیمت هدف (قیمت نهایی)
        trade = TradeService.execute_trade_with_price(
            user=order.user,
            trade_type='BUY' if order.order_type == 'BUY_LIMIT' else 'SELL',
            amount=order.amount,
            price=order.target_price  # استفاده از قیمت هدف سفارش (قیمت نهایی)
        )
        
        # به‌روزرسانی سفارش
        order.status = 'EXECUTED'
        order.executed_trade = trade
        order.save()
        
        # ایجاد notification برای کاربر
        try:
            if order.order_type == 'BUY_LIMIT':
                message = f'سفارش خرید هوشمند شما به مقدار {float(order.amount)} گرم در قیمت {int(order.target_price):,} ریال با موفقیت اجرا شد.'
            else:  # SELL_LIMIT
                message = f'سفارش فروش هوشمند شما به مقدار {float(order.amount)} گرم در قیمت {int(order.target_price):,} ریال با موفقیت اجرا شد.'
            
            create_notification(
                user=order.user,
                title='اجرای سفارش هوشمند',
                message=message,
                notification_type='ORDER_EXECUTED',
                related_object_type='order',
                related_object_id=order.id,
                metadata={
                    'order_type': order.order_type,
                    'amount': str(order.amount),
                    'target_price': str(order.target_price),
                    'trade_id': trade.id if trade else None,
                }
            )
        except Exception as e:
            logger.error(f"خطا در ایجاد notification برای اجرای سفارش: {e}", exc_info=True)
        
        return trade
    
    @staticmethod
    @transaction.atomic
    def cancel_order(order: Order):
        """لغو سفارش"""
        if order.status not in ['PENDING', 'SUSPENDED']:
            raise ValueError("فقط سفارشات در انتظار یا معلق قابل لغو هستند")
        
        order.status = 'CANCELLED'
        order.save()
        return order
    
    @staticmethod
    @transaction.atomic
    def suspend_all_pending_orders():
        """
        معلق کردن همه سفارشات در انتظار (وقتی معاملات خاموش می‌شود)
        
        این متد باید هنگام خاموش کردن معاملات فراخوانی شود
        """
        suspended_count = Order.objects.filter(status='PENDING').update(status='SUSPENDED')
        return suspended_count
    
    @staticmethod
    @transaction.atomic
    def resume_all_suspended_orders():
        """
        فعال کردن مجدد همه سفارشات معلق (وقتی معاملات روشن می‌شود)
        
        این متد باید هنگام روشن کردن معاملات فراخوانی شود
        """
        resumed_count = Order.objects.filter(status='SUSPENDED').update(status='PENDING')
        return resumed_count
    
    @staticmethod
    @transaction.atomic
    def toggle_trades_status(enabled: bool):
        """
        تغییر وضعیت معاملات و مدیریت سفارشات
        
        Args:
            enabled: True برای فعال، False برای غیرفعال
        """
        settings = SystemSettings.get_settings()
        settings.trades_enabled = enabled
        settings.save()
        
        if enabled:
            # روشن کردن: فعال کردن مجدد سفارشات معلق
            resumed_count = TradeService.resume_all_suspended_orders()
            return {
                'message': f'معاملات فعال شد. {resumed_count} سفارش دوباره فعال شد.',
                'resumed_orders': resumed_count
            }
        else:
            # خاموش کردن: معلق کردن سفارشات در انتظار
            suspended_count = TradeService.suspend_all_pending_orders()
            return {
                'message': f'معاملات غیرفعال شد. {suspended_count} سفارش معلق شد.',
                'suspended_orders': suspended_count
            }
    
    @staticmethod
    @transaction.atomic
    def check_and_execute_pending_orders():
        """
        بررسی و اجرای خودکار سفارشات در انتظار
        
        این متد باید به صورت دوره‌ای فراخوانی شود (مثلاً هنگام به‌روزرسانی قیمت)
        """
        try:
            # بررسی فعال بودن معاملات
            TradeService.check_trades_enabled()
        except ValueError:
            # اگر معاملات غیرفعال باشد، کاری نمی‌کنیم
            return 0
        
        # دریافت قیمت‌های فعلی
        try:
            prices = TradeService.get_current_prices()
            # استفاده از قیمت‌های نهایی برای مقایسه با target_price
            buy_final_price = prices['buy']
            sell_final_price = prices['sell']
        except ValueError:
            # اگر قیمت تعریف نشده باشد، کاری نمی‌کنیم
            return 0
        
        # دریافت همه سفارشات در انتظار
        pending_orders = Order.objects.filter(status='PENDING').select_related('user')
        
        executed_count = 0
        for order in pending_orders:
            try:
                # تعیین قیمت نهایی فعلی بر اساس نوع سفارش
                if order.order_type == 'BUY_LIMIT':
                    current_final_price = buy_final_price
                else:  # SELL_LIMIT
                    current_final_price = sell_final_price
                
                # تلاش برای اجرای سفارش (current_final_price فقط برای بررسی استفاده می‌شود)
                trade = TradeService.execute_limit_order(order, current_final_price)
                if trade:
                    executed_count += 1
            except Exception as e:
                # در صورت خطا، لاگ می‌کنیم و ادامه می‌دهیم
                import traceback
                print(f"خطا در اجرای سفارش {order.id}: {e}")
                print(traceback.format_exc())
                continue
        
        return executed_count

