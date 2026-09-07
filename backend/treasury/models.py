from decimal import Decimal

from django.conf import settings
from django.db import models


class CompanyTreasury(models.Model):
    """موجودی طلای فیزیکی شرکت (تک‌رکوردی)"""

    gold_balance = models.DecimalField(
        max_digits=18,
        decimal_places=6,
        default=Decimal('0'),
        verbose_name='موجودی طلای شرکت (گرم)',
    )
    avg_cost_per_gram = models.DecimalField(
        max_digits=18,
        decimal_places=0,
        default=Decimal('0'),
        verbose_name='میانگین قیمت تمام‌شده (ریال بر گرم)',
    )
    warning_cover_ratio = models.DecimalField(
        max_digits=6,
        decimal_places=4,
        default=Decimal('0.9800'),
        verbose_name='آستانه هشدار پوشش',
        help_text='مثلاً ۰.۹۸ یعنی ۹۸٪ — زیر این نسبت وضعیت هشدار است',
    )
    critical_cover_ratio = models.DecimalField(
        max_digits=6,
        decimal_places=4,
        default=Decimal('1.0000'),
        verbose_name='آستانه بحرانی پوشش',
        help_text='اگر نسبت پوشش از این مقدار کمتر شود خرید کاربر متوقف می‌شود',
    )
    auto_block_user_buy = models.BooleanField(
        default=True,
        verbose_name='توقف خودکار خرید در کمبود',
    )
    updated_at = models.DateTimeField(auto_now=True, verbose_name='آخرین به‌روزرسانی')

    class Meta:
        verbose_name = 'خزانه شرکت'
        verbose_name_plural = 'خزانه شرکت'

    def __str__(self):
        return f'خزانه شرکت — {self.gold_balance} گرم'

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class OperationalJournal(models.Model):
    """دفتر عملیات — فقط افزودنی، بدون ویرایش/حذف از پنل"""

    class Asset(models.TextChoices):
        RIAL = 'RIAL', 'ریال'
        GOLD = 'GOLD', 'طلا'

    class EventType(models.TextChoices):
        OPENING = 'OPENING', 'مانده افتتاحیه'
        DEPOSIT = 'DEPOSIT', 'واریز ریال'
        BUY = 'BUY', 'خرید طلا توسط کاربر'
        SELL = 'SELL', 'فروش طلا توسط کاربر'
        WITHDRAW_RIAL = 'WITHDRAW_RIAL', 'برداشت ریال'
        GOLD_DELIVERY = 'GOLD_DELIVERY', 'تحویل حضوری طلا'
        VAULT_IN = 'VAULT_IN', 'ورود طلا به خزانه'
        VAULT_OUT = 'VAULT_OUT', 'خروج طلا از خزانه'
        ADJUSTMENT = 'ADJUSTMENT', 'تعدیل'
        PENDING_LOCK = 'PENDING_LOCK', 'قفل خرید معلق'
        PENDING_UNLOCK = 'PENDING_UNLOCK', 'آزادسازی خرید معلق'
        MANUAL_BUY = 'MANUAL_BUY', 'خرید دستی (ادمین)'
        MANUAL_SELL = 'MANUAL_SELL', 'فروش دستی (ادمین)'
        OFFPLATFORM_RIAL = 'OFFPLATFORM_RIAL', 'ریال خارج از سامانه (دستی)'

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='زمان ثبت', db_index=True)
    asset = models.CharField(max_length=8, choices=Asset.choices, verbose_name='نوع دارایی')
    amount = models.DecimalField(
        max_digits=18,
        decimal_places=6,
        verbose_name='مقدار (+/−)',
        help_text='مثبت = افزایش، منفی = کاهش',
    )
    unit_price = models.DecimalField(
        max_digits=18,
        decimal_places=0,
        null=True,
        blank=True,
        verbose_name='قیمت واحد (ریال)',
    )
    event_type = models.CharField(
        max_length=32,
        choices=EventType.choices,
        verbose_name='نوع رویداد',
        db_index=True,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='operational_journals',
        verbose_name='کاربر',
    )
    balance_after = models.DecimalField(
        max_digits=18,
        decimal_places=6,
        null=True,
        blank=True,
        verbose_name='مانده پس از رویداد',
    )
    reference_type = models.CharField(max_length=64, blank=True, default='', verbose_name='نوع سند')
    reference_id = models.PositiveIntegerField(null=True, blank=True, verbose_name='شناسه سند')
    note = models.TextField(blank=True, default='', verbose_name='یادداشت')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_operational_journals',
        verbose_name='ثبت‌کننده',
    )

    class Meta:
        verbose_name = 'ردیف دفتر عملیات'
        verbose_name_plural = 'دفتر عملیات'
        ordering = ['-created_at', '-id']
        indexes = [
            models.Index(fields=['-created_at', 'event_type'], name='treasury_oj_created_event_idx'),
        ]

    def __str__(self):
        return f'{self.get_event_type_display()} — {self.amount}'


class VaultMovement(models.Model):
    """سند ورود/خروج/تعدیل موجودی طلای شرکت"""

    class MovementType(models.TextChoices):
        IN = 'IN', 'ورود به خزانه'
        OUT = 'OUT', 'خروج از خزانه'
        ADJUST = 'ADJUST', 'تعدیل'

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='زمان ثبت', db_index=True)
    movement_type = models.CharField(
        max_length=8,
        choices=MovementType.choices,
        verbose_name='نوع حرکت',
    )
    amount = models.DecimalField(
        max_digits=18,
        decimal_places=6,
        verbose_name='مقدار (گرم)',
        help_text='برای ورود و خروج مثبت وارد شود؛ برای تعدیل می‌تواند مثبت یا منفی باشد',
    )
    unit_price = models.DecimalField(
        max_digits=18,
        decimal_places=0,
        default=Decimal('0'),
        verbose_name='قیمت واحد (ریال بر گرم)',
    )
    counterparty = models.CharField(
        max_length=255,
        blank=True,
        default='',
        verbose_name='طرف معامله / تأمین‌کننده',
    )
    note = models.TextField(blank=True, default='', verbose_name='یادداشت')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vault_movements',
        verbose_name='ثبت‌کننده',
    )
    journal_entry = models.OneToOneField(
        OperationalJournal,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vault_movement',
        verbose_name='ردیف دفتر',
    )
    avg_cost_before = models.DecimalField(
        max_digits=18,
        decimal_places=0,
        default=Decimal('0'),
        verbose_name='میانگین تمام‌شده قبل از حرکت',
    )
    realized_inventory_pnl = models.DecimalField(
        max_digits=18,
        decimal_places=0,
        default=Decimal('0'),
        verbose_name='سود/زیان تحقق‌یافته موجودی (ریال)',
        help_text='فقط برای خروج/تعدیل منفی با قیمت فروش محاسبه می‌شود',
    )

    class Meta:
        verbose_name = 'حرکت خزانه'
        verbose_name_plural = 'حرکت‌های خزانه'
        ordering = ['-created_at', '-id']

    def __str__(self):
        return f'{self.get_movement_type_display()} — {self.amount} گرم'
