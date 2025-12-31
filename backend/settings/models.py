from django.db import models


class SystemSettings(models.Model):
    """تنظیمات سیستم"""
    admin_phone_numbers = models.JSONField(
        default=list,
        verbose_name='شماره مدیران',
        help_text='لیست شماره موبایل مدیران برای دریافت پیامک (به صورت آرایه)'
    )
    gold_pickup_address = models.TextField(
        null=True,
        blank=True,
        verbose_name='آدرس مراجعه حضوری',
        help_text='آدرس مراجعه حضوری برای دریافت طلا'
    )
    trades_enabled = models.BooleanField(
        default=True,
        verbose_name='فعال بودن معاملات',
        help_text='اگر فعال باشد، کاربران می‌توانند معامله انجام دهند'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='تاریخ ایجاد'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='تاریخ به‌روزرسانی'
    )
    
    class Meta:
        verbose_name = 'تنظیمات سیستم'
        verbose_name_plural = 'تنظیمات سیستم'
    
    def __str__(self):
        return "تنظیمات سیستم"
    
    @classmethod
    def get_settings(cls):
        """دریافت تنظیمات سیستم (Singleton pattern)"""
        settings_obj, created = cls.objects.get_or_create(pk=1)
        return settings_obj


class DepositAccount(models.Model):
    """حساب‌های بانکی مدیر برای واریز وجه"""
    bank_name = models.CharField(
        max_length=100,
        verbose_name='نام بانک',
        help_text='نام بانک (مثال: بانک ملت)'
    )
    owner_name = models.CharField(
        max_length=200,
        verbose_name='نام صاحب حساب',
        help_text='نام صاحب حساب (مثال: شرکت گلد تریدر)'
    )
    card_number = models.CharField(
        max_length=19,
        verbose_name='شماره کارت',
        help_text='شماره کارت بانکی (16 رقم)'
    )
    sheba_number = models.CharField(
        max_length=26,
        verbose_name='شماره شبا',
        help_text='شماره شبا (24 رقم)'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='فعال',
        help_text='اگر فعال باشد، در پنل کاربری نمایش داده می‌شود'
    )
    order = models.IntegerField(
        default=0,
        verbose_name='ترتیب نمایش',
        help_text='ترتیب نمایش حساب‌ها (عدد کمتر = اولویت بیشتر)'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='تاریخ ایجاد'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='تاریخ به‌روزرسانی'
    )
    
    class Meta:
        verbose_name = 'حساب بانکی واریز'
        verbose_name_plural = 'حساب‌های بانکی واریز'
        ordering = ['order', 'created_at']
    
    def __str__(self):
        return f"{self.bank_name} - {self.owner_name}"

