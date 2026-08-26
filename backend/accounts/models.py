from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils import timezone
from django_jalali.db import models as jmodels

class UserRole(models.TextChoices):
    SUPER_ADMIN = 'SUPER_ADMIN', 'سوپر ادمین'
    SITE_ADMIN = 'SITE_ADMIN', 'مدیر سایت'
    CUSTOMER = 'CUSTOMER', 'مشتری'


class CustomUserManager(BaseUserManager):
    """UserManager سفارشی برای استفاده از phone_number به جای username"""
    
    def create_user(self, phone_number, password=None, **extra_fields):
        if not phone_number:
            raise ValueError('شماره موبایل الزامی است')
        user = self.model(phone_number=phone_number, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, phone_number, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_phone_verified', True)
        extra_fields.setdefault('role', UserRole.SUPER_ADMIN)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(phone_number, password, **extra_fields)


class CustomUser(AbstractUser):
    # Override username to make it nullable since we use phone_number
    username = models.CharField(
        max_length=150,
        unique=True,
        null=True,
        blank=True,
        verbose_name='نام کاربری'
    )
    
    phone_number = models.CharField(
        max_length=11,
        unique=True,
        verbose_name='شماره موبایل',
        help_text='شماره موبایل باید 11 رقم باشد (مثال: 09123456789)'
    )
    otp_code = models.CharField(
        max_length=4,
        null=True,
        blank=True,
        verbose_name='کد OTP'
    )
    otp_code_created = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='زمان ایجاد کد OTP'
    )
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.CUSTOMER,
        verbose_name='نقش کاربری'
    )
    is_phone_verified = models.BooleanField(
        default=False,
        verbose_name='شماره موبایل تایید شده',
        help_text='اگر این فیلد True باشد، شماره موبایل توسط مدیر تایید شده است'
    )
    national_id = models.CharField(
        max_length=10,
        null=True,
        blank=True,
        verbose_name='کد ملی'
    )
    # FileField: آیفون اغلب HEIC می‌فرستد؛ ImageField/Pillow بدون وابستگی اضافه آن را رد می‌کند
    national_card_image = models.FileField(
        upload_to='national_cards/',
        null=True,
        blank=True,
        verbose_name='عکس کارت ملی',
        help_text='JPG، PNG، WebP، HEIC/HEIF — حداکثر ۱۰ مگابایت'
    )
    avatar = models.ImageField(
        upload_to='avatars/',
        null=True,
        blank=True,
        verbose_name='عکس پروفایل',
        help_text='عکس پروفایل کاربر (اختیاری)'
    )
    profile_completed = models.BooleanField(
        default=False,
        verbose_name='پروفایل تکمیل شده'
    )
    birth_date = jmodels.jDateField(
        null=True,
        blank=True,
        verbose_name='تاریخ تولد',
        help_text='تاریخ تولد به شمسی'
    )
    
    # حذف username از required fields چون از phone_number استفاده می‌کنیم
    USERNAME_FIELD = 'phone_number'
    REQUIRED_FIELDS = []
    
    objects = CustomUserManager()
    
    class Meta:
        verbose_name = 'کاربر'
        verbose_name_plural = 'کاربران'
    
    def __str__(self):
        return f"{self.phone_number} - {self.get_role_display()}"

    def save(self, *args, **kwargs):
        from accounts.image_upload import ensure_optimized_upload

        if self.national_card_image:
            self.national_card_image = ensure_optimized_upload(
                self.national_card_image, purpose='document'
            )
        if self.avatar:
            self.avatar = ensure_optimized_upload(self.avatar, purpose='avatar')
        super().save(*args, **kwargs)
    
    def is_profile_complete(self):
        """بررسی اینکه آیا پروفایل کاربر کامل است یا نه"""
        return (
            self.first_name and
            self.last_name and
            self.national_id and
            self.national_card_image and
            self.birth_date and
            self.profile_completed
        )
    
    def check_otp_expiration(self):
        """بررسی انقضای کد OTP (5 دقیقه)"""
        if not self.otp_code_created:
            return False
        now = timezone.now()
        diff_time = now - self.otp_code_created
        return diff_time.total_seconds() <= 300  # 5 دقیقه


class CustomerProfile(models.Model):
    """پروفایل مشتری با کد حساب منحصر به فرد"""
    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='customer_profile',
        verbose_name='کاربر'
    )
    account_code = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        verbose_name='کد حساب',
        help_text='کد حساب منحصر به فرد مشتری (از 0001 شروع می‌شود)'
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
        verbose_name = 'پروفایل مشتری'
        verbose_name_plural = 'پروفایل‌های مشتری'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.account_code} - {self.user.phone_number}"


