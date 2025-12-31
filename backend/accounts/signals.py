from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import CustomUser, CustomerProfile, UserRole
from .services import generate_account_code


@receiver(post_save, sender=CustomUser)
def create_customer_profile(sender, instance, created, **kwargs):
    """
    Signal برای ایجاد خودکار CustomerProfile هنگام ایجاد کاربر جدید
    فقط برای کاربران با نقش CUSTOMER
    """
    if created and instance.role == UserRole.CUSTOMER:
        # بررسی اینکه پروفایل قبلا ایجاد نشده باشد
        if not hasattr(instance, 'customer_profile'):
            # پیدا کردن بزرگترین کد حساب عددی
            profiles = CustomerProfile.objects.all()
            max_number = 0
            
            for profile in profiles:
                try:
                    number = int(profile.account_code)
                    if number > max_number:
                        max_number = number
                except ValueError:
                    continue
            
            # کد بعدی را تولید می‌کنیم
            new_number = max_number + 1
            account_code = f"{new_number:04d}"
            
            # اطمینان از یکتایی (در صورت وجود مشکل)
            counter = 0
            while CustomerProfile.objects.filter(account_code=account_code).exists():
                new_number += 1
                account_code = f"{new_number:04d}"
                counter += 1
                if counter > 100:  # جلوگیری از حلقه بی‌نهایت
                    raise Exception("خطا در تولید کد حساب منحصر به فرد")
            
            CustomerProfile.objects.create(
                user=instance,
                account_code=account_code
            )

