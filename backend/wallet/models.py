from django.db import models
from decimal import Decimal
from accounts.models import CustomUser


class Wallet(models.Model):
    """کیف پول کاربر (موجودی ریال و طلا)"""
    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='wallet',
        verbose_name='کاربر'
    )
    rial_balance = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        default=0,
        verbose_name='موجودی ریالی',
        help_text='موجودی ریالی به تومان'
    )
    gold_balance = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        default=0,
        verbose_name='موجودی طلا',
        help_text='موجودی طلا به گرم'
    )
    pending_withdrawal_rial = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        default=0,
        verbose_name='موجودی ریالی مسدود شده',
        help_text='موجودی ریالی که در انتظار تایید برداشت است'
    )
    pending_withdrawal_gold = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        default=0,
        verbose_name='موجودی طلای مسدود شده',
        help_text='موجودی طلا که در انتظار تایید برداشت است'
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
        verbose_name = 'کیف پول'
        verbose_name_plural = 'کیف پول‌ها'
    
    def get_available_rial_balance(self):
        """موجودی ریالی قابل استفاده (کل - مسدود شده)"""
        return self.rial_balance - self.pending_withdrawal_rial
    
    def get_available_gold_balance(self):
        """موجودی طلای قابل استفاده (کل - مسدود شده)"""
        return self.gold_balance - self.pending_withdrawal_gold
    
    def __str__(self):
        return f"{self.user.phone_number} - {self.rial_balance} تومان - {self.gold_balance} گرم"


class BankCard(models.Model):
    """کارت‌های بانکی کاربر"""
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='bank_cards',
        verbose_name='کاربر'
    )
    bank_name = models.CharField(
        max_length=100,
        verbose_name='نام بانک'
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
        verbose_name='فعال'
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
        verbose_name = 'کارت بانکی'
        verbose_name_plural = 'کارت‌های بانکی'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.phone_number} - {self.bank_name} - {self.card_number[-4:]}"


class WithdrawalRequest(models.Model):
    """درخواست‌های برداشت (وجه یا طلا)"""
    WITHDRAWAL_TYPE_CHOICES = [
        ('RIAL', 'برداشت وجه ریالی'),
        ('GOLD', 'برداشت طلا'),
    ]
    STATUS_CHOICES = [
        ('PENDING', 'در انتظار بررسی'),
        ('APPROVED', 'تایید شده'),
        ('REJECTED', 'رد شده'),
        ('COMPLETED', 'تکمیل شده'),
    ]
    
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='withdrawal_requests',
        verbose_name='کاربر'
    )
    withdrawal_type = models.CharField(
        max_length=10,
        choices=WITHDRAWAL_TYPE_CHOICES,
        verbose_name='نوع برداشت'
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=3,
        verbose_name='مقدار',
        help_text='مقدار به ریال (برای برداشت وجه) یا گرم (برای برداشت طلا)'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING',
        verbose_name='وضعیت'
    )
    request_code = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        verbose_name='کد درخواست',
        help_text='کد منحصر به فرد درخواست'
    )
    bank_card = models.ForeignKey(
        'BankCard',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='withdrawal_requests',
        verbose_name='کارت بانکی',
        help_text='کارت بانکی برای برداشت وجه (فقط برای نوع RIAL)'
    )
    receipt_image = models.FileField(
        upload_to='withdrawal_receipts/',
        null=True,
        blank=True,
        verbose_name='فیش واریزی',
        help_text='JPG، PNG، WebP، HEIC/HEIF — حداکثر ۱۰ مگابایت (فقط برای برداشت وجه)'
    )
    admin_note = models.TextField(
        null=True,
        blank=True,
        verbose_name='یادداشت مدیر',
        help_text='یادداشت مدیر در مورد این درخواست'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='تاریخ ایجاد'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='تاریخ به‌روزرسانی'
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='تاریخ تسویه',
        help_text='تاریخ تسویه درخواست (فقط برای برداشت طلا)'
    )
    
    class Meta:
        verbose_name = 'درخواست برداشت'
        verbose_name_plural = 'درخواست‌های برداشت'
        ordering = ['-created_at']
    
    def get_paid_amount(self):
        """
        محاسبه مبلغ پرداخت شده از طریق لینک‌های واریز
        """
        total_paid = Decimal('0')
        links = self.deposit_links.all()
        for link in links:
            total_paid += link.amount
        return total_paid
    
    def get_remaining_amount(self):
        """
        محاسبه باقی‌مانده درخواست برداشت
        """
        paid = self.get_paid_amount()
        return self.amount - paid
    
    def is_fully_paid(self):
        """
        بررسی اینکه آیا کل مبلغ درخواست برداشت پرداخت شده است
        """
        remaining = self.get_remaining_amount()
        return remaining <= Decimal('0')
    
    def __str__(self):
        return f"{self.request_code} - {self.user.phone_number} - {self.get_withdrawal_type_display()} - {self.amount}"


class DepositRequest(models.Model):
    """درخواست‌های واریز"""
    STATUS_CHOICES = [
        ('PENDING', 'در انتظار بررسی'),
        ('APPROVED', 'تایید شده'),
        ('REJECTED', 'رد شده'),
        ('COMPLETED', 'تکمیل شده'),
    ]
    
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='deposit_requests',
        verbose_name='کاربر'
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        verbose_name='مبلغ',
        help_text='مبلغ واریز شده به ریال'
    )
    tracking_number = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        verbose_name='شماره پیگیری',
        help_text='شماره پیگیری تراکنش (در flow جدید اختیاری است)'
    )
    deposit_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='تاریخ واریز',
        help_text='تاریخ واریز (در flow جدید اختیاری است)'
    )
    receipt_image = models.FileField(
        upload_to='deposit_receipts/',
        null=True,
        blank=True,
        verbose_name='تصویر فیش واریزی',
        help_text='JPG، PNG، WebP، HEIC/HEIF — حداکثر ۱۰ مگابایت (در flow جدید اختیاری است)'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING',
        verbose_name='وضعیت'
    )
    request_code = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        verbose_name='کد درخواست',
        help_text='کد منحصر به فرد درخواست'
    )
    admin_note = models.TextField(
        null=True,
        blank=True,
        verbose_name='یادداشت مدیر',
        help_text='یادداشت مدیر در مورد این درخواست'
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
        verbose_name = 'درخواست واریز'
        verbose_name_plural = 'درخواست‌های واریز'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.request_code} - {self.user.phone_number} - {self.amount} تومان"


class DepositAccountAssignment(models.Model):
    """تخصیص حساب‌های مقصد برای درخواست واریز"""
    ACCOUNT_TYPE_CHOICES = [
        ('WITHDRAWAL', 'حساب کاربر درخواست برداشت'),
        ('DEPOSIT_ACCOUNT', 'حساب پیش‌فرض مدیر'),
        ('CUSTOM', 'حساب سفارشی'),
    ]
    
    deposit_request = models.ForeignKey(
        'DepositRequest',
        on_delete=models.CASCADE,
        related_name='account_assignments',
        verbose_name='درخواست واریز'
    )
    account_type = models.CharField(
        max_length=20,
        choices=ACCOUNT_TYPE_CHOICES,
        verbose_name='نوع حساب'
    )
    withdrawal_request = models.ForeignKey(
        'WithdrawalRequest',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deposit_assignments',
        verbose_name='درخواست برداشت',
        help_text='فقط برای نوع WITHDRAWAL'
    )
    deposit_account = models.ForeignKey(
        'settings.DepositAccount',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deposit_assignments',
        verbose_name='حساب پیش‌فرض',
        help_text='فقط برای نوع DEPOSIT_ACCOUNT'
    )
    custom_bank_name = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        verbose_name='نام بانک (سفارشی)',
        help_text='فقط برای نوع CUSTOM'
    )
    custom_owner_name = models.CharField(
        max_length=200,
        null=True,
        blank=True,
        verbose_name='نام صاحب حساب (سفارشی)',
        help_text='فقط برای نوع CUSTOM'
    )
    custom_card_number = models.CharField(
        max_length=19,
        null=True,
        blank=True,
        verbose_name='شماره کارت (سفارشی)',
        help_text='فقط برای نوع CUSTOM'
    )
    custom_sheba_number = models.CharField(
        max_length=26,
        null=True,
        blank=True,
        verbose_name='شماره شبا (سفارشی)',
        help_text='فقط برای نوع CUSTOM'
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        verbose_name='مبلغ',
        help_text='مبلغ واریز به این حساب (ریال)'
    )
    order = models.PositiveSmallIntegerField(
        default=0,
        verbose_name='ترتیب',
        help_text='ترتیب نمایش حساب‌ها'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='تاریخ ایجاد'
    )
    
    class Meta:
        verbose_name = 'تخصیص حساب واریز'
        verbose_name_plural = 'تخصیص‌های حساب واریز'
        ordering = ['order', 'created_at']
    
    def __str__(self):
        if self.account_type == 'WITHDRAWAL' and self.withdrawal_request:
            return f"{self.deposit_request.request_code} -> {self.withdrawal_request.request_code} ({self.amount} ریال)"
        elif self.account_type == 'DEPOSIT_ACCOUNT' and self.deposit_account:
            return f"{self.deposit_request.request_code} -> {self.deposit_account.bank_name} ({self.amount} ریال)"
        elif self.account_type == 'CUSTOM':
            return f"{self.deposit_request.request_code} -> {self.custom_bank_name or 'سفارشی'} ({self.amount} ریال)"
        return f"{self.deposit_request.request_code} - {self.amount} ریال"
    
    def get_account_display(self):
        """دریافت نمایش حساب برای پیامک"""
        if self.account_type == 'WITHDRAWAL' and self.withdrawal_request:
            bank_card = self.withdrawal_request.bank_card
            if bank_card:
                return f"{bank_card.bank_name} - {bank_card.card_number[-4:]}"
        elif self.account_type == 'DEPOSIT_ACCOUNT' and self.deposit_account:
            return f"{self.deposit_account.bank_name} - {self.deposit_account.card_number[-4:]}"
        elif self.account_type == 'CUSTOM':
            return f"{self.custom_bank_name or 'سفارشی'} - {self.custom_card_number[-4:] if self.custom_card_number else 'N/A'}"
        return "نامشخص"


class DepositReceipt(models.Model):
    """فیش‌های واریزی کاربر برای هر حساب"""
    STATUS_CHOICES = [
        ('PENDING', 'در انتظار بررسی'),
        ('APPROVED', 'تایید شده'),
        ('REJECTED', 'رد شده'),
    ]
    
    deposit_request = models.ForeignKey(
        'DepositRequest',
        on_delete=models.CASCADE,
        related_name='receipts',
        verbose_name='درخواست واریز'
    )
    account_assignment = models.ForeignKey(
        'DepositAccountAssignment',
        on_delete=models.CASCADE,
        related_name='receipts',
        verbose_name='حساب تخصیص داده شده'
    )
    tracking_number = models.CharField(
        max_length=50,
        verbose_name='شماره پیگیری',
        help_text='شماره پیگیری تراکنش'
    )
    deposit_date = models.DateField(
        verbose_name='تاریخ واریز'
    )
    receipt_image = models.FileField(
        upload_to='deposit_receipts/',
        verbose_name='تصویر فیش واریزی',
        help_text='JPG، PNG، WebP، HEIC/HEIF — حداکثر ۱۰ مگابایت'
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        verbose_name='مبلغ',
        help_text='مبلغ واریز شده (ریال)'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING',
        verbose_name='وضعیت'
    )
    admin_note = models.TextField(
        null=True,
        blank=True,
        verbose_name='یادداشت مدیر'
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
        verbose_name = 'فیش واریزی'
        verbose_name_plural = 'فیش‌های واریزی'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.deposit_request.request_code} - {self.account_assignment} - {self.amount} ریال"


class DepositWithdrawalLink(models.Model):
    """ارتباط بین واریزها و درخواست‌های برداشت (برای ردیابی)"""
    deposit_receipt = models.ForeignKey(
        'DepositReceipt',
        on_delete=models.CASCADE,
        related_name='withdrawal_links',
        verbose_name='فیش واریزی'
    )
    withdrawal_request = models.ForeignKey(
        'WithdrawalRequest',
        on_delete=models.CASCADE,
        related_name='deposit_links',
        verbose_name='درخواست برداشت'
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        verbose_name='مبلغ',
        help_text='مبلغی که از این واریز به این برداشت اختصاص یافته (ریال)'
    )
    auto_approved = models.BooleanField(
        default=False,
        verbose_name='تایید خودکار',
        help_text='آیا این برداشت به صورت خودکار تایید شده است؟'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='تاریخ ایجاد'
    )
    
    class Meta:
        verbose_name = 'ارتباط واریز-برداشت'
        verbose_name_plural = 'ارتباطات واریز-برداشت'
        ordering = ['-created_at']
        unique_together = [['deposit_receipt', 'withdrawal_request']]
    
    def __str__(self):
        return f"{self.deposit_receipt.deposit_request.request_code} -> {self.withdrawal_request.request_code} ({self.amount} ریال)"


