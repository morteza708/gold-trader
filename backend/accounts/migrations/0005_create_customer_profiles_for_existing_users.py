# Generated manually

from django.db import migrations
from django.db.models import Max


def create_customer_profiles(apps, schema_editor):
    """
    ایجاد CustomerProfile برای کاربران موجود با نقش CUSTOMER
    """
    CustomUser = apps.get_model('accounts', 'CustomUser')
    CustomerProfile = apps.get_model('accounts', 'CustomerProfile')
    
    # پیدا کردن بزرگترین کد حساب موجود
    profiles = CustomerProfile.objects.all()
    max_number = 0
    
    for profile in profiles:
        try:
            number = int(profile.account_code)
            if number > max_number:
                max_number = number
        except ValueError:
            continue
    
    # ایجاد CustomerProfile برای کاربران CUSTOMER که پروفایل ندارند
    users = CustomUser.objects.filter(role='CUSTOMER')
    for user in users:
        if not CustomerProfile.objects.filter(user=user).exists():
            max_number += 1
            account_code = f"{max_number:04d}"
            
            # اطمینان از یکتایی
            while CustomerProfile.objects.filter(account_code=account_code).exists():
                max_number += 1
                account_code = f"{max_number:04d}"
            
            CustomerProfile.objects.create(
                user=user,
                account_code=account_code
            )


def reverse_create_customer_profiles(apps, schema_editor):
    """
    حذف CustomerProfile های ایجاد شده (برای rollback)
    """
    CustomerProfile = apps.get_model('accounts', 'CustomerProfile')
    CustomerProfile.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_customerprofile'),
    ]

    operations = [
        migrations.RunPython(create_customer_profiles, reverse_create_customer_profiles),
    ]

