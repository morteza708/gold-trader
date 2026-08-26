from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('wallet', '0007_alter_receipt_image_filefield'),
    ]

    operations = [
        migrations.AddField(
            model_name='wallet',
            name='pending_trade_rial',
            field=models.DecimalField(
                decimal_places=0,
                default=0,
                help_text='سهم کیف پول که برای خرید در انتظار تسویه قفل شده است',
                max_digits=15,
                verbose_name='ریال قفل‌شده برای خرید معلق',
            ),
        ),
    ]
