from decimal import Decimal

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('treasury', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='vaultmovement',
            name='avg_cost_before',
            field=models.DecimalField(
                decimal_places=0,
                default=Decimal('0'),
                max_digits=18,
                verbose_name='میانگین تمام‌شده قبل از حرکت',
            ),
        ),
        migrations.AddField(
            model_name='vaultmovement',
            name='realized_inventory_pnl',
            field=models.DecimalField(
                decimal_places=0,
                default=Decimal('0'),
                help_text='فقط برای خروج/تعدیل منفی با قیمت فروش محاسبه می‌شود',
                max_digits=18,
                verbose_name='سود/زیان تحقق‌یافته موجودی (ریال)',
            ),
        ),
    ]
