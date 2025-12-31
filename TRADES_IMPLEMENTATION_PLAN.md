# 📈 پیشنهاد پیاده‌سازی سیستم معاملات (Trade System)

## 🎯 هدف کلی

پیاده‌سازی یک سیستم معاملات کامل برای خرید و فروش طلا که شامل:
- معاملات فوری (Instant Trade)
- سفارشات هوشمند (Limit Orders)
- مدیریت قیمت طلا
- تولید فاکتور و کد رهگیری

---

## 🏗️ معماری پیشنهادی

### **گزینه 1: ساختار ساده و مستقیم (پیشنهاد شده) ⭐**

```
backend/
  trades/
    models.py          # GoldPrice, Trade, Order
    serializers.py     # TradeSerializer, OrderSerializer, GoldPriceSerializer
    views.py           # API endpoints
    urls.py            # URL routing
    admin.py           # Django admin
    services.py        # منطق کسب و کار (Business Logic)
    utils.py           # Helper functions (کد رهگیری، فاکتور)
```

**مزایا:**
- ✅ ساختار ساده و قابل فهم
- ✅ جداسازی منطق کسب و کار در `services.py`
- ✅ قابل توسعه و نگهداری
- ✅ هماهنگ با ساختار فعلی پروژه (`wallet`, `settings`)

---

### **گزینه 2: ساختار پیشرفته با Celery**

برای اجرای خودکار سفارشات هوشمند (Limit Orders) در آینده:
- استفاده از Celery برای background tasks
- اجرای خودکار سفارشات وقتی قیمت به هدف رسید

**نکته:** این گزینه برای فاز اول ضروری نیست، می‌توان بعداً اضافه کرد.

---

## 📊 مدل‌های پیشنهادی

### 0. **به‌روزرسانی SystemSettings** - کنترل معاملات

```python
# backend/settings/models.py

class SystemSettings(models.Model):
    """تنظیمات سیستم"""
    admin_phone_numbers = models.JSONField(...)
    gold_pickup_address = models.TextField(...)
    
    # فیلد جدید: کنترل معاملات
    trades_enabled = models.BooleanField(
        default=True,
        verbose_name='فعال بودن معاملات',
        help_text='اگر فعال باشد، کاربران می‌توانند معامله انجام دهند'
    )
    
    # ... سایر فیلدها
```

**نکات:**
- ✅ این فیلد در `SystemSettings` (Singleton) اضافه می‌شود
- ✅ پیش‌فرض: `True` (معاملات فعال)
- ✅ فقط مدیر سایت می‌تواند این را تغییر دهد
- ✅ باید در همه API endpoints معاملات بررسی شود

---

### 1. **GoldPrice** - قیمت طلا و حاشیه سود

```python
class GoldPrice(models.Model):
    """
    قیمت لحظه‌ای طلا با حاشیه سود
    
    این مدل تاریخچه کامل قیمت‌ها را نگه می‌دارد برای:
    - نمایش نمودار تغییرات قیمت
    - تحلیل روند قیمت‌ها
    - گزارش‌گیری
    
    قیمت نهایی = قیمت پایه + حاشیه سود
    """
    # قیمت‌های پایه (از API خارجی یا دستی)
    buy_base_price = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        verbose_name='قیمت پایه خرید (ریال)',
        help_text='قیمت پایه خرید هر گرم طلا به ریال'
    )
    sell_base_price = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        verbose_name='قیمت پایه فروش (ریال)',
        help_text='قیمت پایه فروش هر گرم طلا به ریال'
    )
    
    # حاشیه سود (ریالی)
    buy_margin = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        default=0,
        verbose_name='حاشیه سود خرید (ریال)',
        help_text='حاشیه سود خرید به ریال (اضافه می‌شود به قیمت پایه)'
    )
    sell_margin = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        default=0,
        verbose_name='حاشیه سود فروش (ریال)',
        help_text='حاشیه سود فروش به ریال (اضافه می‌شود به قیمت پایه)'
    )
    
    # قیمت‌های نهایی (محاسبه شده)
    buy_final_price = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        verbose_name='قیمت نهایی خرید (ریال)',
        help_text='قیمت نهایی خرید = قیمت پایه + حاشیه سود'
    )
    sell_final_price = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        verbose_name='قیمت نهایی فروش (ریال)',
        help_text='قیمت نهایی فروش = قیمت پایه + حاشیه سود'
    )
    
    # وضعیت
    is_active = models.BooleanField(
        default=True,
        verbose_name='فعال',
        help_text='آیا این قیمت فعلی است؟ (فقط یک رکورد باید فعال باشد)'
    )
    
    # منبع قیمت
    SOURCE_CHOICES = [
        ('MANUAL', 'دستی'),
        ('API', 'API خارجی'),
    ]
    source = models.CharField(
        max_length=10,
        choices=SOURCE_CHOICES,
        default='MANUAL',
        verbose_name='منبع',
        help_text='منبع قیمت (دستی یا API)'
    )
    
    # تاریخ و زمان
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='تاریخ و زمان ثبت',
        db_index=True
    )
    created_by = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='ثبت شده توسط',
        help_text='کاربری که این قیمت را ثبت کرده (برای قیمت‌های دستی)'
    )
    
    class Meta:
        verbose_name = 'قیمت طلا'
        verbose_name_plural = 'قیمت‌های طلا'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['is_active', '-created_at']),
            models.Index(fields=['source', '-created_at']),
        ]
    
    def __str__(self):
        return f"خرید: {self.buy_final_price:,} | فروش: {self.sell_final_price:,} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"
    
    def save(self, *args, **kwargs):
        """محاسبه خودکار قیمت‌های نهایی"""
        self.buy_final_price = self.buy_base_price + self.buy_margin
        self.sell_final_price = self.sell_base_price + self.sell_margin
        super().save(*args, **kwargs)
    
    @classmethod
    def get_current_price(cls):
        """دریافت قیمت فعلی فعال"""
        return cls.objects.filter(is_active=True).order_by('-created_at').first()
    
    @classmethod
    def get_price_history(cls, days=30):
        """دریافت تاریخچه قیمت‌ها برای نمودار"""
        from django.utils import timezone
        from datetime import timedelta
        
        start_date = timezone.now() - timedelta(days=days)
        return cls.objects.filter(
            created_at__gte=start_date
        ).order_by('created_at')
    
    @classmethod
    def create_new_price(cls, buy_base, sell_base, buy_margin, sell_margin, user=None, source='MANUAL'):
        """
        ایجاد قیمت جدید و غیرفعال کردن قیمت‌های قبلی
        
        Args:
            buy_base: قیمت پایه خرید
            sell_base: قیمت پایه فروش
            buy_margin: حاشیه سود خرید
            sell_margin: حاشیه سود فروش
            user: کاربر ثبت‌کننده (برای قیمت‌های دستی)
            source: منبع قیمت ('MANUAL' یا 'API')
        """
        from django.db import transaction
        
        with transaction.atomic():
            # غیرفعال کردن همه قیمت‌های قبلی
            cls.objects.filter(is_active=True).update(is_active=False)
            
            # ایجاد قیمت جدید
            new_price = cls.objects.create(
                buy_base_price=buy_base,
                sell_base_price=sell_base,
                buy_margin=buy_margin,
                sell_margin=sell_margin,
                is_active=True,
                source=source,
                created_by=user
            )
            
            return new_price
```

**نکات مهم:**
- ✅ همه قیمت‌ها در دیتابیس ذخیره می‌شوند (تاریخچه کامل)
- ✅ قیمت‌های نهایی به صورت خودکار محاسبه می‌شوند (در `save()`)
- ✅ فقط یک قیمت `is_active=True` باید وجود داشته باشد
- ✅ متد `create_new_price()` برای ایجاد قیمت جدید و غیرفعال کردن قبلی‌ها
- ✅ `get_price_history()` برای دریافت تاریخچه برای نمودار
- ✅ فیلد `source` برای تشخیص منبع قیمت (دستی یا API)
- ✅ فیلد `created_by` برای ثبت کاربر ثبت‌کننده (برای قیمت‌های دستی)

**منطق قیمت:**
- قیمت نهایی خرید = `buy_base_price + buy_margin`
- قیمت نهایی فروش = `sell_base_price + sell_margin`
- کاربر در پنل کاربری قیمت نهایی را می‌بیند
- مدیر می‌تواند قیمت پایه و حاشیه سود را جداگانه تنظیم کند

---

### 2. **Trade** - معاملات انجام شده

```python
class Trade(models.Model):
    """معاملات خرید و فروش طلا"""
    TRADE_TYPE_CHOICES = [
        ('BUY', 'خرید'),
        ('SELL', 'فروش'),
    ]
    STATUS_CHOICES = [
        ('SUCCESS', 'موفق'),
        ('FAILED', 'ناموفق'),
        ('PENDING', 'در انتظار'),
        ('CANCELLED', 'لغو شده'),
    ]
    
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='trades',
        verbose_name='کاربر',
        db_index=True  # برای جستجوی سریع
    )
    trade_type = models.CharField(
        max_length=10,
        choices=TRADE_TYPE_CHOICES,
        verbose_name='نوع معامله',
        db_index=True
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        verbose_name='مقدار (گرم)',
        help_text='مقدار طلا به گرم'
    )
    price = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        verbose_name='قیمت واحد (ریال)',
        help_text='قیمت هر گرم طلا در زمان معامله'
    )
    total = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        verbose_name='مبلغ کل (ریال)',
        help_text='مبلغ کل معامله'
    )
    fee = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        default=0,
        verbose_name='کارمزد (ریال)',
        help_text='کارمزد معامله'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING',
        verbose_name='وضعیت',
        db_index=True
    )
    tracking_code = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        verbose_name='کد رهگیری',
        help_text='کد رهگیری منحصر به فرد معامله'
    )
    invoice_number = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        verbose_name='شماره فاکتور',
        help_text='شماره فاکتور معامله'
    )
    admin_note = models.TextField(
        null=True,
        blank=True,
        verbose_name='یادداشت مدیر'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='تاریخ ایجاد',
        db_index=True
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='تاریخ به‌روزرسانی'
    )
    
    class Meta:
        verbose_name = 'معامله'
        verbose_name_plural = 'معاملات'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['trade_type', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.tracking_code} - {self.user.phone_number} - {self.get_trade_type_display()}"
```

**نکات مهم:**
- `db_index=True` برای فیلدهای پرجستجو
- `Index` در Meta برای کوئری‌های ترکیبی
- `tracking_code` و `invoice_number` باید unique باشند

---

### 3. **Order** - سفارشات هوشمند (Limit Orders)

```python
class Order(models.Model):
    """سفارشات هوشمند (Limit Orders)"""
    ORDER_TYPE_CHOICES = [
        ('BUY_LIMIT', 'خرید در قیمت پایین'),
        ('SELL_LIMIT', 'فروش در قیمت بالا'),
    ]
    STATUS_CHOICES = [
        ('PENDING', 'در انتظار'),
        ('SUSPENDED', 'معلق'),  # وقتی معاملات خاموش می‌شود
        ('EXECUTED', 'اجرا شده'),
        ('CANCELLED', 'لغو شده'),
        ('EXPIRED', 'منقضی شده'),
    ]
    
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='orders',
        verbose_name='کاربر',
        db_index=True
    )
    order_type = models.CharField(
        max_length=20,
        choices=ORDER_TYPE_CHOICES,
        verbose_name='نوع سفارش',
        db_index=True
    )
    target_price = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        verbose_name='قیمت هدف (ریال)',
        help_text='قیمتی که در آن سفارش اجرا می‌شود'
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        verbose_name='مقدار (گرم)',
        help_text='مقدار طلا به گرم'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING',
        verbose_name='وضعیت',
        db_index=True
    )
    executed_trade = models.OneToOneField(
        'Trade',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='order',
        verbose_name='معامله اجرا شده',
        help_text='معامله‌ای که از این سفارش ایجاد شده'
    )
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='تاریخ انقضا',
        help_text='تاریخ انقضای سفارش (اختیاری)'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='تاریخ ایجاد',
        db_index=True
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='تاریخ به‌روزرسانی'
    )
    
    class Meta:
        verbose_name = 'سفارش هوشمند'
        verbose_name_plural = 'سفارشات هوشمند'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status', '-created_at']),
            models.Index(fields=['order_type', 'status', 'target_price']),
        ]
    
    def __str__(self):
        return f"{self.get_order_type_display()} - {self.user.phone_number} - {self.target_price:,} ریال"
```

**نکات:**
- `executed_trade` برای ارتباط با معامله ایجاد شده
- `expires_at` برای سفارشات با تاریخ انقضا
- Index برای جستجوی سریع سفارشات قابل اجرا

---

## 🔧 منطق کسب و کار (Business Logic)

### فایل `trades/services.py`:

```python
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from accounts.models import CustomUser
from wallet.models import Wallet
from .models import GoldPrice, Trade, Order

class TradeService:
    """سرویس معاملات"""
    
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
    def calculate_fee(total_amount, fee_percent=0):
        """محاسبه کارمزد"""
        # می‌توان از SystemSettings خواند
        return Decimal('0')  # فعلاً کارمزد صفر
    
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
        
        # 1. دریافت قیمت فعلی (قیمت نهایی = پایه + حاشیه سود)
        current_price = TradeService.get_current_price(trade_type)
        
        # 2. محاسبه مبلغ کل
        total = amount * current_price
        
        # 3. دریافت یا ایجاد کیف پول
        wallet, _ = Wallet.objects.get_or_create(user=user)
        
        # 4. بررسی موجودی
        if trade_type == 'BUY':
            # برای خرید: موجودی ریال باید کافی باشد
            if wallet.rial_balance < total:
                raise ValueError("موجودی ریالی کافی نیست")
        else:  # SELL
            # برای فروش: موجودی طلا باید کافی باشد
            if wallet.gold_balance < amount:
                raise ValueError("موجودی طلا کافی نیست")
        
        # 5. محاسبه کارمزد
        fee = TradeService.calculate_fee(total)
        
        # 6. تولید کد رهگیری و شماره فاکتور
        tracking_code = TradeService.generate_tracking_code()
        invoice_number = TradeService.generate_invoice_number()
        
        # 7. ایجاد معامله
        trade = Trade.objects.create(
            user=user,
            trade_type=trade_type,
            amount=amount,
            price=current_price,
            total=total,
            fee=fee,
            status='PENDING',
            tracking_code=tracking_code,
            invoice_number=invoice_number,
        )
        
        # 8. به‌روزرسانی موجودی
        if trade_type == 'BUY':
            # خرید: کسر ریال، افزودن طلا
            wallet.rial_balance -= (total + fee)
            wallet.gold_balance += amount
        else:  # SELL
            # فروش: کسر طلا، افزودن ریال
            wallet.gold_balance -= amount
            wallet.rial_balance += (total - fee)
        
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
        
        # 1. دریافت قیمت فعلی (قیمت نهایی)
        if order_type == 'BUY_LIMIT':
            current_price = TradeService.get_current_price('BUY')
            # برای خرید لیمیت: قیمت هدف باید کمتر از قیمت فعلی خرید باشد
            if target_price >= current_price:
                raise ValueError("قیمت هدف باید کمتر از قیمت فعلی خرید باشد")
        else:  # SELL_LIMIT
            current_price = TradeService.get_current_price('SELL')
            # برای فروش لیمیت: قیمت هدف باید بیشتر از قیمت فعلی فروش باشد
            if target_price <= current_price:
                raise ValueError("قیمت هدف باید بیشتر از قیمت فعلی فروش باشد")
        
        # 3. دریافت یا ایجاد کیف پول
        wallet, _ = Wallet.objects.get_or_create(user=user)
        
        # 4. بررسی موجودی (برای رزرو)
        total = amount * target_price
        if order_type == 'BUY_LIMIT':
            # برای خرید: موجودی ریال باید کافی باشد
            if wallet.rial_balance < total:
                raise ValueError("موجودی ریالی کافی نیست")
        else:  # SELL_LIMIT
            # برای فروش: موجودی طلا باید کافی باشد
            if wallet.gold_balance < amount:
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
    def execute_limit_order(order: Order, current_price: Decimal):
        """
        اجرای سفارش هوشمند (وقتی قیمت به هدف رسید)
        
        Args:
            order: سفارش
            current_price: قیمت فعلی
        
        Returns:
            Trade object
        """
        # بررسی اینکه آیا قیمت به هدف رسیده
        if order.order_type == 'BUY_LIMIT':
            if current_price > order.target_price:
                return None  # هنوز به قیمت هدف نرسیده
        else:  # SELL_LIMIT
            if current_price < order.target_price:
                return None  # هنوز به قیمت هدف نرسیده
        
        # اجرای معامله
        trade = TradeService.execute_instant_trade(
            user=order.user,
            trade_type='BUY' if order.order_type == 'BUY_LIMIT' else 'SELL',
            amount=order.amount
        )
        
        # به‌روزرسانی سفارش
        order.status = 'EXECUTED'
        order.executed_trade = trade
        order.save()
        
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
    def execute_limit_order(order: Order, current_price: Decimal):
        """
        اجرای سفارش هوشمند (وقتی قیمت به هدف رسید)
        
        Args:
            order: سفارش
            current_price: قیمت فعلی
        
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

---

## 📡 API Endpoints پیشنهادی

### User Endpoints:

```python
# دریافت قیمت فعلی
GET /api/trades/price/

# معامله فوری
POST /api/trades/buy/        # خرید فوری
POST /api/trades/sell/       # فروش فوری

# سفارشات هوشمند
POST /api/trades/orders/              # ایجاد سفارش
GET /api/trades/orders/                # لیست سفارشات باز
DELETE /api/trades/orders/<id>/        # لغو سفارش

# تاریخچه
GET /api/trades/                       # تاریخچه معاملات
GET /api/trades/<id>/                  # جزئیات معامله
```

### Admin Endpoints:

```python
# مدیریت قیمت
GET /api/admin/trades/price/           # دریافت قیمت فعلی
POST /api/admin/trades/price/          # به‌روزرسانی قیمت

# مدیریت معاملات
GET /api/admin/trades/                 # لیست معاملات (با فیلتر)
GET /api/admin/trades/<id>/            # جزئیات معامله
PATCH /api/admin/trades/<id>/cancel/   # لغو معامله

# مدیریت سفارشات
GET /api/admin/trades/orders/           # لیست سفارشات
```

---

## 🔄 جریان کار (Workflow)

### معامله فوری:

```
1. کاربر درخواست خرید/فروش می‌دهد
2. بررسی قیمت فعلی
3. بررسی موجودی
4. محاسبه مبلغ کل و کارمزد
5. تولید کد رهگیری و شماره فاکتور
6. ایجاد Trade با status='PENDING'
7. به‌روزرسانی موجودی Wallet
8. تغییر status به 'SUCCESS'
9. ارسال SMS به کاربر
10. بازگشت Trade object
```

### سفارش هوشمند:

```
1. کاربر سفارش ثبت می‌کند
2. بررسی قیمت هدف (باید منطقی باشد)
3. بررسی موجودی (برای رزرو)
4. ایجاد Order با status='PENDING'
5. (در آینده با Celery) بررسی مداوم قیمت
6. وقتی قیمت به هدف رسید:
   - اجرای معامله
   - به‌روزرسانی Order به 'EXECUTED'
   - ارسال SMS
```

---

## 🎨 Serializers پیشنهادی

```python
class GoldPriceSerializer(serializers.ModelSerializer):
    """Serializer برای نمایش قیمت به کاربر (فقط قیمت نهایی)"""
    created_at_jalali = serializers.SerializerMethodField()
    
    def get_created_at_jalali(self, obj):
        if obj.created_at:
            jalali_date = datetime2jalali(obj.created_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return None
    
    class Meta:
        model = GoldPrice
        fields = [
            'buy',  # قیمت نهایی خرید (از SerializerMethodField)
            'sell',  # قیمت نهایی فروش
            'updated_at',
            'created_at_jalali'
        ]
        read_only_fields = ['buy', 'sell', 'updated_at', 'created_at_jalali']
    
    def to_representation(self, instance):
        """فقط قیمت‌های نهایی را نمایش می‌دهد"""
        return {
            'buy': instance.buy_final_price,
            'sell': instance.sell_final_price,
            'updated_at': instance.created_at.isoformat(),
            'created_at_jalali': self.get_created_at_jalali(instance)
        }


class GoldPriceAdminSerializer(serializers.ModelSerializer):
    """Serializer برای پنل مدیریت (قیمت پایه + حاشیه سود)"""
    created_at_jalali = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    
    def get_created_at_jalali(self, obj):
        if obj.created_at:
            jalali_date = datetime2jalali(obj.created_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return None
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.phone_number
        return None
    
    class Meta:
        model = GoldPrice
        fields = [
            'id',
            'buy_base_price', 'sell_base_price',
            'buy_margin', 'sell_margin',
            'buy_final_price', 'sell_final_price',
            'is_active', 'source',
            'created_at', 'created_at_jalali',
            'created_by', 'created_by_name'
        ]
        read_only_fields = ['buy_final_price', 'sell_final_price', 'created_at']


class CreateGoldPriceSerializer(serializers.Serializer):
    """Serializer برای ایجاد قیمت جدید"""
    buy_base_price = serializers.DecimalField(max_digits=15, decimal_places=0)
    sell_base_price = serializers.DecimalField(max_digits=15, decimal_places=0)
    buy_margin = serializers.DecimalField(max_digits=15, decimal_places=0, default=0)
    sell_margin = serializers.DecimalField(max_digits=15, decimal_places=0, default=0)
    
    def validate(self, data):
        if data['buy_base_price'] <= 0 or data['sell_base_price'] <= 0:
            raise serializers.ValidationError("قیمت‌های پایه باید بیشتر از صفر باشند")
        if data['buy_margin'] < 0 or data['sell_margin'] < 0:
            raise serializers.ValidationError("حاشیه سود نمی‌تواند منفی باشد")
        return data


class GoldPriceHistorySerializer(serializers.ModelSerializer):
    """Serializer برای تاریخچه قیمت‌ها (برای نمودار)"""
    created_at_jalali = serializers.SerializerMethodField()
    
    def get_created_at_jalali(self, obj):
        if obj.created_at:
            jalali_date = datetime2jalali(obj.created_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return None
    
    class Meta:
        model = GoldPrice
        fields = [
            'buy_final_price', 'sell_final_price',
            'created_at', 'created_at_jalali'
        ]


class TradeSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_mobile = serializers.SerializerMethodField()
    created_at_jalali = serializers.SerializerMethodField()
    
    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.phone_number
    
    def get_user_mobile(self, obj):
        return obj.user.phone_number
    
    def get_created_at_jalali(self, obj):
        if obj.created_at:
            jalali_date = datetime2jalali(obj.created_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return None
    
    class Meta:
        model = Trade
        fields = [
            'id', 'user', 'user_name', 'user_mobile',
            'trade_type', 'amount', 'price', 'total', 'fee',
            'status', 'tracking_code', 'invoice_number',
            'admin_note', 'created_at', 'created_at_jalali'
        ]


class OrderSerializer(serializers.ModelSerializer):
    created_at_jalali = serializers.SerializerMethodField()
    executed_trade = TradeSerializer(read_only=True)
    
    def get_created_at_jalali(self, obj):
        if obj.created_at:
            jalali_date = datetime2jalali(obj.created_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return None
    
    class Meta:
        model = Order
        fields = [
            'id', 'user', 'order_type', 'target_price', 'amount',
            'status', 'executed_trade', 'expires_at',
            'created_at', 'created_at_jalali'
        ]
```

---

## ⚙️ مدیریت قیمت در پنل تنظیمات

### در پنل مدیریت سایت (`/admin/settings`):

بخش جدید "قیمت طلا" به تب‌های تنظیمات اضافه می‌شود:

```typescript
// frontend/app/admin/settings/page.tsx
const tabs = [
  { id: 'general', label: 'عمومی' },
  { id: 'gold-price', label: 'قیمت طلا' },  // تب جدید
];

// در تب "قیمت طلا":
// - نمایش قیمت فعلی (پایه + حاشیه سود)
// - فرم برای به‌روزرسانی قیمت:
//   - قیمت پایه خرید
//   - قیمت پایه فروش
//   - حاشیه سود خرید
//   - حاشیه سود فروش
// - نمایش تاریخچه قیمت‌ها (نمودار)
```

### در پنل سوپر ادمین:

همان قابلیت‌ها در پنل سوپر ادمین نیز در دسترس است.

---

## 🔌 اتصال به API خارجی (آینده)

### ساختار پیشنهادی:

```python
# trades/services.py

class ExternalPriceService:
    """سرویس دریافت قیمت از API خارجی"""
    
    @staticmethod
    def fetch_price_from_api():
        """
        دریافت قیمت از API خارجی
        
        Returns:
            dict: {
                'buy_base_price': Decimal,
                'sell_base_price': Decimal,
                'timestamp': datetime
            }
        """
        # TODO: اتصال به API خارجی
        # مثال:
        # response = requests.get('https://api.example.com/gold-price')
        # return {
        #     'buy_base_price': Decimal(response.json()['buy']),
        #     'sell_base_price': Decimal(response.json()['sell']),
        #     'timestamp': timezone.now()
        # }
        pass
    
    @staticmethod
    @transaction.atomic
    def update_price_from_api():
        """
        به‌روزرسانی قیمت از API خارجی
        
        این متد:
        1. قیمت را از API می‌گیرد
        2. حاشیه سود فعلی را از آخرین قیمت می‌خواند
        3. قیمت جدید را با همان حاشیه سود ایجاد می‌کند
        """
        # 1. دریافت قیمت از API
        api_data = ExternalPriceService.fetch_price_from_api()
        
        # 2. دریافت آخرین قیمت (برای حاشیه سود)
        last_price = GoldPrice.get_current_price()
        if not last_price:
            raise ValueError("قیمت قبلی وجود ندارد")
        
        # 3. ایجاد قیمت جدید با حاشیه سود قبلی
        new_price = GoldPrice.create_new_price(
            buy_base=api_data['buy_base_price'],
            sell_base=api_data['sell_base_price'],
            buy_margin=last_price.buy_margin,  # حاشیه سود قبلی
            sell_margin=last_price.sell_margin,  # حاشیه سود قبلی
            source='API'
        )
        
        return new_price
```

### Celery Task (برای به‌روزرسانی خودکار):

```python
# trades/tasks.py (بعداً اضافه می‌شود)

from celery import shared_task
from .services import ExternalPriceService

@shared_task
def update_gold_price_from_api():
    """
    Task برای به‌روزرسانی خودکار قیمت از API
    
    این task می‌تواند هر 1-5 دقیقه یکبار اجرا شود
    """
    try:
        ExternalPriceService.update_price_from_api()
    except Exception as e:
        # Log error
        print(f"Error updating price from API: {e}")
```

### تنظیمات Celery (در آینده):

```python
# config/celery.py

from celery import Celery

app = Celery('config')
app.config_from_object('django.conf:settings', namespace='CELERY')

# تنظیم periodic tasks
app.conf.beat_schedule = {
    'update-gold-price': {
        'task': 'trades.tasks.update_gold_price_from_api',
        'schedule': 60.0,  # هر 60 ثانیه
    },
}
```

**نکات:**
- ✅ فعلاً قیمت‌ها دستی مدیریت می‌شوند
- ✅ ساختار به گونه‌ای است که به راحتی می‌توان API را اضافه کرد
- ✅ حاشیه سود همیشه توسط مدیر تنظیم می‌شود (حتی با API)
- ✅ همه تغییرات قیمت در دیتابیس ذخیره می‌شوند

---

## 📊 نمودار تغییرات قیمت

### API برای نمودار:

```python
# GET /api/admin/trades/price/history/?days=30

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def price_history(request):
    """دریافت تاریخچه قیمت‌ها برای نمودار"""
    days = int(request.query_params.get('days', 30))
    
    history = GoldPrice.get_price_history(days=days)
    serializer = GoldPriceHistorySerializer(history, many=True)
    
    return Response(serializer.data)
```

### Frontend (Chart):

```typescript
// استفاده از Chart.js یا Recharts
const priceHistory = await adminTradesAPI.getPriceHistory(30);

// داده‌ها برای نمودار:
const chartData = priceHistory.map(item => ({
  date: item.created_at_jalali,
  buy: item.buy_final_price,
  sell: item.sell_final_price,
}));
```

---

## 🚀 مراحل پیاده‌سازی

### **مرحله 1: ایجاد App و مدل‌ها**
1. ایجاد app `trades`
2. تعریف مدل‌ها (GoldPrice, Trade, Order)
3. Migration
4. ثبت در Django Admin

### **مرحله 2: منطق کسب و کار**
1. ایجاد `services.py`
2. پیاده‌سازی متدهای TradeService
3. تست منطق

### **مرحله 3: API Endpoints**
1. ایجاد Serializers
2. ایجاد Views
3. تعریف URLs
4. تست API

### **مرحله 4: اتصال Frontend**
1. ایجاد API functions در `frontend/lib/api/trades.ts`
2. به‌روزرسانی صفحات `/dashboard/trade` و `/dashboard/history`
3. به‌روزرسانی صفحه `/admin/trades`

### **مرحله 5: تست و بهینه‌سازی**
1. تست end-to-end
2. بهینه‌سازی کوئری‌ها
3. تست عملکرد

---

## ⚠️ نکات مهم

1. **Transaction Safety:**
   - همیشه از `@transaction.atomic` برای عملیات مالی استفاده کنید
   - این تضمین می‌کند که یا همه تغییرات اعمال می‌شود یا هیچکدام

2. **Race Conditions:**
   - برای به‌روزرسانی موجودی از `select_for_update()` استفاده کنید
   ```python
   wallet = Wallet.objects.select_for_update().get(user=user)
   ```

3. **Query Optimization:**
   - همیشه `select_related()` برای ForeignKey
   - `prefetch_related()` برای reverse relations
   - Indexes برای فیلدهای پرجستجو

4. **Error Handling:**
   - بررسی دقیق موجودی قبل از معامله
   - پیام‌های خطای واضح برای کاربر
   - Logging برای خطاها

5. **Security:**
   - بررسی permission در همه endpoints
   - Validation دقیق input ها
   - جلوگیری از SQL Injection (Django ORM خودش انجام می‌دهد)

---

## 📝 Checklist

### فاز 1: Backend - مدل‌ها و منطق کسب و کار
- [ ] به‌روزرسانی `SystemSettings`:
  - [ ] اضافه کردن فیلد `trades_enabled` (BooleanField)
  - [ ] Migration
- [ ] ایجاد app `trades`
- [ ] تعریف مدل `GoldPrice` با فیلدهای:
  - [ ] `buy_base_price`, `sell_base_price`
  - [ ] `buy_margin`, `sell_margin`
  - [ ] `buy_final_price`, `sell_final_price` (محاسبه خودکار)
  - [ ] `source` (MANUAL/API)
  - [ ] `created_by` (برای قیمت‌های دستی)
- [ ] تعریف مدل `Trade` با indexes مناسب
- [ ] تعریف مدل `Order` با indexes مناسب:
  - [ ] اضافه کردن وضعیت `SUSPENDED` به STATUS_CHOICES
  - [ ] (اختیاری) اضافه کردن فیلدهای `suspended_at` و `resumed_at` برای تاریخچه
- [ ] Migration
- [ ] ایجاد `services.py` با:
  - [ ] `TradeService.check_trades_enabled()` - بررسی فعال بودن معاملات
  - [ ] `TradeService.get_current_price(trade_type)`
  - [ ] `TradeService.get_current_prices()`
  - [ ] `TradeService.execute_instant_trade()` - با بررسی `check_trades_enabled()`
  - [ ] `TradeService.create_limit_order()` - با بررسی `check_trades_enabled()`
  - [ ] `TradeService.execute_limit_order()` - با بررسی وضعیت SUSPENDED
  - [ ] `TradeService.suspend_all_pending_orders()` - معلق کردن سفارشات
  - [ ] `TradeService.resume_all_suspended_orders()` - فعال کردن مجدد سفارشات
  - [ ] `TradeService.toggle_trades_status()` - تغییر وضعیت و مدیریت سفارشات
  - [ ] `GoldPrice.create_new_price()` (با غیرفعال کردن قبلی‌ها)
  - [ ] `GoldPrice.get_price_history()`
- [ ] ایجاد Serializers:
  - [ ] `GoldPriceSerializer` (برای کاربر - فقط قیمت نهایی)
  - [ ] `GoldPriceAdminSerializer` (برای مدیر - همه فیلدها)
  - [ ] `CreateGoldPriceSerializer` (برای ایجاد قیمت)
  - [ ] `GoldPriceHistorySerializer` (برای نمودار)
  - [ ] `TradeSerializer`
  - [ ] `OrderSerializer`

### فاز 2: Backend - API Endpoints
- [ ] User Endpoints:
  - [ ] `GET /api/trades/price/` - دریافت قیمت نهایی (با `trades_enabled`)
  - [ ] `GET /api/trades/status/` - دریافت وضعیت معاملات
  - [ ] `POST /api/trades/buy/` - خرید فوری (با بررسی `trades_enabled`)
  - [ ] `POST /api/trades/sell/` - فروش فوری (با بررسی `trades_enabled`)
  - [ ] `POST /api/trades/orders/` - ثبت سفارش
  - [ ] `GET /api/trades/orders/` - لیست سفارشات
  - [ ] `DELETE /api/trades/orders/<id>/` - لغو سفارش
  - [ ] `GET /api/trades/` - تاریخچه معاملات
- [ ] Admin Endpoints:
  - [ ] `GET /api/admin/trades/status/` - دریافت وضعیت معاملات
  - [ ] `POST /api/admin/trades/status/toggle/` - تغییر وضعیت معاملات (با مدیریت سفارشات)
  - [ ] `GET /api/admin/trades/price/` - دریافت قیمت فعلی
  - [ ] `POST /api/admin/trades/price/` - به‌روزرسانی قیمت دستی
  - [ ] `GET /api/admin/trades/price/history/` - تاریخچه قیمت‌ها
  - [ ] `GET /api/admin/trades/` - لیست معاملات
  - [ ] `GET /api/admin/trades/<id>/` - جزئیات معامله
- [ ] Super Admin Endpoints (مشابه Admin)
- [ ] تست API endpoints

### فاز 3: Frontend - پنل کاربری
- [ ] به‌روزرسانی `/dashboard`:
  - [ ] اضافه کردن علامت وضعیت معاملات (زیر هدر)
  - [ ] دریافت وضعیت معاملات از API
  - [ ] به‌روزرسانی خودکار (real-time)
  - [ ] نمایش پیام واضح برای کاربر
- [ ] به‌روزرسانی `/dashboard/trade`:
  - [ ] دریافت قیمت نهایی از API
  - [ ] نمایش قیمت خرید و فروش
  - [ ] بررسی `trades_enabled` قبل از ثبت معامله
  - [ ] نمایش پیام خطا اگر معاملات غیرفعال باشد
  - [ ] نمایش سفارشات معلق (SUSPENDED) با پیام مناسب
  - [ ] نمایش Badge "معلق" برای سفارشات معلق
  - [ ] اتصال به API برای خرید/فروش فوری
  - [ ] اتصال به API برای ثبت سفارش
- [ ] به‌روزرسانی `/dashboard/history`:
  - [ ] دریافت تاریخچه معاملات از API
  - [ ] نمایش معاملات با اطلاعات کامل

### فاز 4: Frontend - پنل مدیریت
- [ ] اضافه کردن دکمه کنترل معاملات به `/admin` (داشبورد):
  - [ ] Toggle Switch برای روشن/خاموش کردن معاملات
  - [ ] دریافت وضعیت از API
  - [ ] به‌روزرسانی خودکار (real-time)
  - [ ] نمایش پیام تایید برای خاموش کردن
  - [ ] نمایش پیام با تعداد سفارشات معلق/فعال شده
  - [ ] نمایش پیام موفقیت/خطا
- [ ] اضافه کردن تب "قیمت طلا" به `/admin/settings`:
  - [ ] نمایش قیمت فعلی (پایه + حاشیه سود)
  - [ ] فرم برای به‌روزرسانی قیمت:
    - [ ] قیمت پایه خرید
    - [ ] قیمت پایه فروش
    - [ ] حاشیه سود خرید
    - [ ] حاشیه سود فروش
  - [ ] نمایش تاریخچه قیمت‌ها (نمودار)
- [ ] به‌روزرسانی `/admin/trades`:
  - [ ] اتصال به API برای لیست معاملات
  - [ ] فیلتر و جستجو
  - [ ] جزئیات معامله

### فاز 5: Frontend - پنل سوپر ادمین
- [ ] اضافه کردن بخش مدیریت قیمت (مشابه پنل مدیریت)
- [ ] سایر قابلیت‌ها

### فاز 6: تست و بهینه‌سازی
- [ ] تست end-to-end
- [ ] بهینه‌سازی کوئری‌ها (select_related, prefetch_related)
- [ ] تست با اعداد فارسی
- [ ] تست با تاریخ شمسی
- [ ] تست در حالت موبایل
- [ ] بررسی تعداد queries
- [ ] مستندسازی

### فاز 7: آماده‌سازی برای API خارجی (آینده)
- [ ] ایجاد `ExternalPriceService` (ساختار آماده)
- [ ] ایجاد `tasks.py` برای Celery (آماده)
- [ ] مستندسازی نحوه اتصال به API

---

## 📋 خلاصه تغییرات اعمال شده

### ✅ به‌روزرسانی مدل GoldPrice:

1. **دو فیلد قیمت پایه:**
   - `buy_base_price` - قیمت پایه خرید
   - `sell_base_price` - قیمت پایه فروش

2. **دو فیلد حاشیه سود:**
   - `buy_margin` - حاشیه سود خرید (ریالی)
   - `sell_margin` - حاشیه سود فروش (ریالی)

3. **قیمت‌های نهایی (محاسبه خودکار):**
   - `buy_final_price` = `buy_base_price + buy_margin`
   - `sell_final_price` = `sell_base_price + sell_margin`

4. **تاریخچه کامل:**
   - همه تغییرات قیمت در دیتابیس ذخیره می‌شوند
   - متد `get_price_history()` برای نمودار

5. **منبع قیمت:**
   - `source` = 'MANUAL' (دستی) یا 'API' (از API خارجی)
   - `created_by` برای ثبت کاربر ثبت‌کننده (قیمت‌های دستی)

### ✅ به‌روزرسانی منطق کسب و کار:

1. **TradeService.get_current_price(trade_type):**
   - دریافت قیمت نهایی خرید یا فروش بر اساس نوع معامله

2. **TradeService.get_current_prices():**
   - دریافت هر دو قیمت خرید و فروش به همراه حاشیه سود

3. **GoldPrice.create_new_price():**
   - ایجاد قیمت جدید و غیرفعال کردن قیمت‌های قبلی
   - محاسبه خودکار قیمت‌های نهایی

### ✅ به‌روزرسانی API Endpoints:

1. **User:**
   - فقط قیمت نهایی را می‌بیند (قیمت پایه + حاشیه سود)

2. **Admin/Super Admin:**
   - می‌توانند قیمت پایه و حاشیه سود را جداگانه تنظیم کنند
   - دسترسی به تاریخچه قیمت‌ها برای نمودار

### ✅ مدیریت در پنل تنظیمات:

1. **پنل مدیریت (`/admin/settings`):**
   - تب جدید "قیمت طلا"
   - فرم برای به‌روزرسانی قیمت دستی
   - نمایش نمودار تاریخچه

2. **پنل سوپر ادمین:**
   - همان قابلیت‌ها

### ✅ آماده‌سازی برای API خارجی:

1. **ExternalPriceService:**
   - ساختار آماده برای اتصال به API خارجی
   - حفظ حاشیه سود هنگام به‌روزرسانی از API

2. **Celery Tasks:**
   - آماده برای به‌روزرسانی خودکار قیمت

---

## 🔄 به‌روزرسانی Real-Time قیمت‌ها (بدون Refresh)

### هدف:
قیمت‌های خرید و فروش در داشبورد پنل کاربری و پنل مدیریت به صورت خودکار و بدون نیاز به refresh به‌روزرسانی شوند.

---

### 🎯 گزینه‌های پیاده‌سازی:

#### **گزینه 1: Polling (پیشنهاد برای شروع) ⭐**

**ساده‌ترین و سریع‌ترین راه برای شروع**

##### Frontend Implementation:

```typescript
// hooks/useGoldPrice.ts
import { useState, useEffect } from 'react';
import { tradesAPI } from '@/lib/api/trades';

export function useGoldPrice(interval = 5000) {
  const [prices, setPrices] = useState<{ buy: number; sell: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // دریافت اولیه
    const fetchPrice = async () => {
      try {
        const data = await tradesAPI.getCurrentPrice();
        setPrices({ buy: data.buy, sell: data.sell });
        setLoading(false);
        setError(null);
      } catch (err) {
        setError('خطا در دریافت قیمت');
        setLoading(false);
      }
    };

    fetchPrice();

    // به‌روزرسانی خودکار هر N ثانیه
    const intervalId = setInterval(fetchPrice, interval);

    return () => clearInterval(intervalId);
  }, [interval]);

  return { prices, loading, error };
}
```

##### استفاده در Dashboard:

```typescript
// app/dashboard/page.tsx
import { useGoldPrice } from '@/hooks/useGoldPrice';

export default function DashboardPage() {
  const { prices, loading } = useGoldPrice(5000); // هر 5 ثانیه

  return (
    <div>
      {loading ? (
        <div>در حال بارگذاری...</div>
      ) : prices ? (
        <>
          <div>قیمت خرید: {toPersianDigits(prices.buy.toLocaleString())} ریال</div>
          <div>قیمت فروش: {toPersianDigits(prices.sell.toLocaleString())} ریال</div>
        </>
      ) : null}
    </div>
  );
}
```

**مزایا:**
- ✅ ساده و سریع پیاده‌سازی
- ✅ نیاز به تغییرات کم در backend
- ✅ بدون نیاز به WebSocket
- ✅ کار می‌کند با ساختار فعلی

**معایب:**
- ⚠️ درخواست‌های مکرر به سرور
- ⚠️ مصرف bandwidth بیشتر

**بهینه‌سازی:**
- استفاده از `useDebounce` برای جلوگیری از درخواست‌های زیاد
- فقط وقتی tab فعال است، polling انجام شود
- استفاده از `document.visibilityState`

---

#### **گزینه 2: WebSocket با Django Channels (پیشنهاد برای آینده) 🚀**

**بهترین تجربه کاربری - Real-time واقعی**

##### Backend Setup:

```python
# 1. نصب Django Channels
# pip install channels channels-redis

# 2. settings.py
INSTALLED_APPS = [
    ...
    'channels',
]

ASGI_APPLICATION = 'config.asgi.application'

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [('127.0.0.1', 6379)],
        },
    },
}

# 3. consumers.py (trades/consumers.py)
from channels.generic.websocket import AsyncWebsocketConsumer
import json

class GoldPriceConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add(
            'gold_price_updates',
            self.channel_name
        )
        await self.accept()
        
        # ارسال قیمت فعلی هنگام اتصال
        from .models import GoldPrice
        current_price = GoldPrice.get_current_price()
        if current_price:
            await self.send(text_data=json.dumps({
                'type': 'price_update',
                'buy': str(current_price.buy_final_price),
                'sell': str(current_price.sell_final_price),
            }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            'gold_price_updates',
            self.channel_name
        )

    async def price_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'price_update',
            'buy': event['buy'],
            'sell': event['sell'],
        }))

# 4. routing.py (trades/routing.py)
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/trades/price/$', consumers.GoldPriceConsumer.as_asgi()),
]

# 5. config/asgi.py
import os
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            trades.routing.websocket_urlpatterns
        )
    ),
})

# 6. ارسال به همه clients هنگام تغییر قیمت
# در views.py یا services.py
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

def broadcast_price_update(price_obj):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        'gold_price_updates',
        {
            'type': 'price_update',
            'buy': str(price_obj.buy_final_price),
            'sell': str(price_obj.sell_final_price),
        }
    )
```

##### Frontend Implementation:

```typescript
// hooks/useGoldPriceWebSocket.ts
import { useState, useEffect, useRef } from 'react';

export function useGoldPriceWebSocket() {
  const [prices, setPrices] = useState<{ buy: number; sell: number } | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // اتصال به WebSocket
    const ws = new WebSocket('ws://localhost:8000/ws/trades/price/');
    
    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'price_update') {
        setPrices({
          buy: parseFloat(data.buy),
          sell: parseFloat(data.sell),
        });
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
    };

    ws.onclose = () => {
      setConnected(false);
      // تلاش مجدد برای اتصال
      setTimeout(() => {
        // reconnect logic
      }, 3000);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, []);

  return { prices, connected };
}
```

**مزایا:**
- ✅ Real-time واقعی (بدون delay)
- ✅ مصرف bandwidth کمتر
- ✅ تجربه کاربری بهتر
- ✅ سرور می‌تواند به همه clients پیام بفرستد

**معایب:**
- ⚠️ پیچیده‌تر از Polling
- ⚠️ نیاز به Redis
- ⚠️ نیاز به ASGI server (Daphne یا Uvicorn)

---

#### **گزینه 3: Server-Sent Events (SSE) 🔄**

**میانه Polling و WebSocket**

##### Backend:

```python
# views.py
from django.http import StreamingHttpResponse
import json
import time

def price_stream(request):
    def event_stream():
        last_price_id = None
        while True:
            current_price = GoldPrice.get_current_price()
            if current_price and current_price.id != last_price_id:
                data = {
                    'buy': str(current_price.buy_final_price),
                    'sell': str(current_price.sell_final_price),
                }
                yield f"data: {json.dumps(data)}\n\n"
                last_price_id = current_price.id
            time.sleep(2)  # بررسی هر 2 ثانیه
    
    response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response
```

##### Frontend:

```typescript
// hooks/useGoldPriceSSE.ts
import { useState, useEffect } from 'react';

export function useGoldPriceSSE() {
  const [prices, setPrices] = useState<{ buy: number; sell: number } | null>(null);

  useEffect(() => {
    const eventSource = new EventSource('/api/trades/price/stream/');
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setPrices({
        buy: parseFloat(data.buy),
        sell: parseFloat(data.sell),
      });
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return { prices };
}
```

---

### 📋 پیشنهاد پیاده‌سازی:

#### **فاز 1: شروع با Polling (سریع و ساده)**

1. ایجاد hook `useGoldPrice` با polling
2. استفاده در Dashboard کاربری
3. استفاده در Dashboard مدیریت
4. بهینه‌سازی: فقط وقتی tab فعال است

#### **فاز 2: ارتقا به WebSocket (آینده)**

1. نصب Django Channels
2. راه‌اندازی Redis
3. ایجاد WebSocket consumer
4. به‌روزرسانی frontend hooks

---

### 🎨 UI/UX پیشنهادی:

```typescript
// نمایش قیمت با انیمیشن تغییر
import { motion, AnimatePresence } from 'framer-motion';

function PriceDisplay({ price, label }: { price: number; label: string }) {
  return (
    <motion.div
      key={price} // تغییر key باعث re-render می‌شود
      initial={{ scale: 1.1, color: '#10b981' }}
      animate={{ scale: 1, color: '#000' }}
      transition={{ duration: 0.3 }}
    >
      <span>{label}: </span>
      <span className="font-bold">
        {toPersianDigits(price.toLocaleString())} ریال
      </span>
    </motion.div>
  );
}

// نشانگر اتصال
{connected ? (
  <div className="flex items-center gap-2 text-green-500">
    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
    <span className="text-xs">قیمت لحظه‌ای</span>
  </div>
) : (
  <div className="flex items-center gap-2 text-gray-400">
    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
    <span className="text-xs">در حال اتصال...</span>
  </div>
)}
```

---

### ✅ Checklist:

**فاز 1: Polling**
- [ ] ایجاد hook `useGoldPrice` با polling
- [ ] استفاده در Dashboard کاربری
- [ ] استفاده در Dashboard مدیریت
- [ ] بهینه‌سازی: فقط وقتی tab فعال است
- [ ] تست با تغییر قیمت

**فاز 2: WebSocket (آینده)**
- [ ] نصب Django Channels
- [ ] راه‌اندازی Redis
- [ ] ایجاد WebSocket consumer
- [ ] ایجاد routing
- [ ] به‌روزرسانی frontend hooks
- [ ] تست real-time updates

---

**پیشنهاد: شروع با Polling (ساده و سریع) و سپس ارتقا به WebSocket در صورت نیاز**

---

**این پیشنهاد بر اساس ساختار فعلی پروژه و بهترین practices طراحی شده است.**
**همه نیازمندی‌های قیمت لحظه‌ای با حاشیه سود در این پیشنهاد پوشش داده شده است.**

