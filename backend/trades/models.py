from django.db import models
from accounts.models import CustomUser
from django_jalali.db import models as jmodels


class GoldPrice(models.Model):
    """
    قیمت لحظه‌ای طلا با حاشیه سود
    
    این مدل تاریخچه کامل قیمت‌ها را نگه می‌دارد برای:
    - نمایش نمودار تغییرات قیمت
    - تحلیل روند قیمت‌ها
    - گزارش‌گیری
    
    قیمت نهایی خرید = قیمت پایه خرید + حاشیه خرید
    قیمت نهایی فروش = قیمت پایه فروش − حاشیه فروش
    (حاشیه فروش به‌صورت عدد مثبت ذخیره می‌شود و از پایه کم می‌گردد؛
     همان مقدار به‌عنوان سود خالص مدیر در معاملات لحاظ می‌شود.)
    """
    SOURCE_CHOICES = [
        ('MANUAL', 'دستی'),
        ('API', 'API خارجی'),
    ]
    
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
    
    # حاشیه سود (ریالی — همیشه عدد مثبت یا صفر)
    buy_margin = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        default=0,
        verbose_name='حاشیه سود خرید (ریال)',
        help_text='عدد مثبت یا صفر؛ به قیمت پایه خرید اضافه می‌شود'
    )
    sell_margin = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        default=0,
        verbose_name='حاشیه سود فروش (ریال)',
        help_text='عدد مثبت یا صفر؛ از قیمت پایه فروش کم می‌شود (در گزارش سود همان مقدار مثبت لحاظ می‌شود)'
    )
    
    # قیمت‌های نهایی (محاسبه شده)
    buy_final_price = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        verbose_name='قیمت نهایی خرید (ریال)',
        help_text='قیمت نهایی خرید = قیمت پایه + حاشیه سود خرید'
    )
    sell_final_price = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        verbose_name='قیمت نهایی فروش (ریال)',
        help_text='قیمت نهایی فروش = قیمت پایه − حاشیه سود فروش'
    )
    
    # وضعیت
    is_active = models.BooleanField(
        default=True,
        verbose_name='فعال',
        help_text='آیا این قیمت فعلی است؟ (فقط یک رکورد باید فعال باشد)'
    )
    
    # منبع قیمت
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
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='ثبت شده توسط',
        help_text='کاربری که این قیمت را ثبت کرده (برای قیمت‌های دستی)'
    )

    # خلاصه بازار از API ویراگلد (برای نمایش روند، نه مبنای معامله)
    market_change = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        null=True,
        blank=True,
        verbose_name='تغییر بازار (ریال)',
        help_text='تغییر قیمت نماد بازار نسبت به قبل، به ریال'
    )
    market_change_percent = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        verbose_name='درصد تغییر بازار'
    )
    market_high = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        null=True,
        blank=True,
        verbose_name='بالاترین امروز (ریال)'
    )
    market_low = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        null=True,
        blank=True,
        verbose_name='پایین‌ترین امروز (ریال)'
    )
    market_price_time = models.CharField(
        max_length=40,
        blank=True,
        default='',
        verbose_name='زمان نرخ بازار'
    )
    market_symbol_name = models.CharField(
        max_length=80,
        blank=True,
        default='',
        verbose_name='نام نماد بازار'
    )
    # آخرین دریافت موفق از API (حتی اگر قیمت پایه عوض نشده باشد)
    last_synced_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name='آخرین همگام‌سازی',
        help_text='زمان آخرین دریافت موفق از API زنده؛ برای تشخیص سلامت Celery'
    )
    
    class Meta:
        verbose_name = 'قیمت طلا'
        verbose_name_plural = 'قیمت‌های طلا'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['is_active', '-created_at'], name='trades_gold_is_acti_500f05_idx'),
            models.Index(fields=['source', '-created_at'], name='trades_gold_source_3e81b5_idx'),
        ]
    
    def __str__(self):
        return f"خرید: {self.buy_final_price:,} | فروش: {self.sell_final_price:,} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"
    
    def save(self, *args, **kwargs):
        """محاسبه خودکار قیمت‌های نهایی"""
        self.buy_final_price = self.buy_base_price + self.buy_margin
        self.sell_final_price = self.sell_base_price - self.sell_margin
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
    def create_new_price(cls, buy_base, sell_base, buy_margin, sell_margin, user=None, source='MANUAL', market=None):
        """
        ایجاد قیمت جدید و غیرفعال کردن قیمت‌های قبلی
        
        Args:
            buy_base: قیمت پایه خرید
            sell_base: قیمت پایه فروش
            buy_margin: حاشیه سود خرید
            sell_margin: حاشیه سود فروش
            user: کاربر ثبت‌کننده (برای قیمت‌های دستی)
            source: منبع قیمت ('MANUAL' یا 'API')
            market: دیکشنری اختیاری فیلدهای خلاصه بازار
        """
        from django.db import transaction
        from django.utils import timezone

        market = market or {}
        now = timezone.now()
        
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
                created_by=user,
                market_change=market.get('market_change'),
                market_change_percent=market.get('market_change_percent'),
                market_high=market.get('market_high'),
                market_low=market.get('market_low'),
                market_price_time=market.get('market_price_time') or '',
                market_symbol_name=market.get('market_symbol_name') or '',
                last_synced_at=now if source == 'API' else None,
            )
            
            return new_price

    def touch_synced_at(self):
        """ثبت زمان آخرین دریافت موفق از API، بدون ساخت تاریخچه جدید."""
        from django.utils import timezone
        self.last_synced_at = timezone.now()
        self.save(update_fields=['last_synced_at'])
        return self

    def apply_market_snapshot(self, market):
        """به‌روزرسانی خلاصه بازار + زمان همگام‌سازی روی رکورد فعال."""
        from django.utils import timezone

        self.last_synced_at = timezone.now()
        update_fields = ['last_synced_at']

        if market:
            self.market_change = market.get('market_change')
            self.market_change_percent = market.get('market_change_percent')
            self.market_high = market.get('market_high')
            self.market_low = market.get('market_low')
            self.market_price_time = market.get('market_price_time') or ''
            self.market_symbol_name = market.get('market_symbol_name') or ''
            update_fields.extend([
                'market_change',
                'market_change_percent',
                'market_high',
                'market_low',
                'market_price_time',
                'market_symbol_name',
            ])

        self.save(update_fields=update_fields)
        return self

    def market_snapshot(self):
        return {
            'market_change': self.market_change,
            'market_change_percent': self.market_change_percent,
            'market_high': self.market_high,
            'market_low': self.market_low,
            'market_price_time': self.market_price_time,
            'market_symbol_name': self.market_symbol_name,
        }


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
        db_index=True
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
    margin_profit = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        default=0,
        verbose_name='سود حاشیه (ریال)',
        help_text='سود حاصل از حاشیه سود (حاشیه سود × مقدار)'
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
            models.Index(fields=['user', '-created_at'], name='trades_trad_user_id_1f28fa_idx'),
            models.Index(fields=['status', '-created_at'], name='trades_trad_status_2a01b5_idx'),
            models.Index(fields=['trade_type', '-created_at'], name='trades_trad_trade_t_e0cc67_idx'),
        ]
    
    def __str__(self):
        return f"{self.tracking_code} - {self.user.phone_number} - {self.get_trade_type_display()}"


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
            models.Index(fields=['user', 'status', '-created_at'], name='trades_orde_user_id_66acb9_idx'),
            models.Index(fields=['order_type', 'status', 'target_price'], name='trades_orde_order_t_1ee5b3_idx'),
        ]
    
    def __str__(self):
        return f"{self.get_order_type_display()} - {self.user.phone_number} - {self.target_price:,} ریال"


class PendingPurchase(models.Model):
    """
    خرید با تسویه بعدی (حواله معلق)
    قیمت و مبلغ در لحظه ثبت قفل می‌شود؛ طلا پس از تأیید واریز آزاد می‌گردد.
    """
    STATUS_AWAITING_DEPOSIT = 'AWAITING_DEPOSIT'
    STATUS_AWAITING_ACCOUNTS = 'AWAITING_ACCOUNTS'
    STATUS_AWAITING_RECEIPTS = 'AWAITING_RECEIPTS'
    STATUS_AWAITING_APPROVAL = 'AWAITING_APPROVAL'
    STATUS_COMPLETED = 'COMPLETED'
    STATUS_CANCELLED = 'CANCELLED'
    STATUS_EXPIRED = 'EXPIRED'

    STATUS_CHOICES = [
        (STATUS_AWAITING_DEPOSIT, 'در انتظار ثبت واریز'),
        (STATUS_AWAITING_ACCOUNTS, 'در انتظار تخصیص حساب'),
        (STATUS_AWAITING_RECEIPTS, 'در انتظار فیش'),
        (STATUS_AWAITING_APPROVAL, 'در انتظار تأیید مدیر'),
        (STATUS_COMPLETED, 'تکمیل شده'),
        (STATUS_CANCELLED, 'لغو شده'),
        (STATUS_EXPIRED, 'منقضی شده'),
    ]

    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='pending_purchases',
        verbose_name='کاربر',
        db_index=True,
    )
    gold_amount = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        verbose_name='مقدار طلا (گرم)',
    )
    locked_unit_price = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        verbose_name='قیمت واحد قفل‌شده (ریال)',
    )
    locked_total = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        verbose_name='مبلغ کل قفل‌شده (ریال)',
    )
    wallet_applied = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        default=0,
        verbose_name='سهم قفل‌شده از کیف پول (ریال)',
    )
    deposit_min_amount = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        verbose_name='حداقل مبلغ واریز (ریال)',
    )
    deposit_requested_amount = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        null=True,
        blank=True,
        verbose_name='مبلغ درخواست واریز (ریال)',
    )
    deposit_request = models.OneToOneField(
        'wallet.DepositRequest',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pending_purchase',
        verbose_name='درخواست واریز',
    )
    trade = models.OneToOneField(
        Trade,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pending_purchase_source',
        verbose_name='معامله نهایی',
    )
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default=STATUS_AWAITING_DEPOSIT,
        db_index=True,
        verbose_name='وضعیت',
    )
    request_code = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        verbose_name='کد درخواست',
    )
    expires_at = models.DateTimeField(
        db_index=True,
        verbose_name='مهلت تسویه',
    )
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='زمان تکمیل')
    cancelled_at = models.DateTimeField(null=True, blank=True, verbose_name='زمان لغو/انقضا')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True, verbose_name='تاریخ ایجاد')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='تاریخ به‌روزرسانی')

    class Meta:
        verbose_name = 'خرید معلق'
        verbose_name_plural = 'خریدهای معلق'
        ordering = ['-created_at']
        indexes = [
            models.Index(
                fields=['user', 'status', '-created_at'],
                name='trades_pend_user_id_7c0a1a_idx',
            ),
            models.Index(
                fields=['status', 'expires_at'],
                name='trades_pend_status_2f8b1c_idx',
            ),
        ]

    def __str__(self):
        return f"{self.request_code} - {self.user.phone_number} - {self.gold_amount}g"

    @property
    def is_active(self):
        return self.status in {
            self.STATUS_AWAITING_DEPOSIT,
            self.STATUS_AWAITING_ACCOUNTS,
            self.STATUS_AWAITING_RECEIPTS,
            self.STATUS_AWAITING_APPROVAL,
        }

