from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('wallet', '0008_wallet_pending_trade_rial'),
    ]

    operations = [
        migrations.AddField(
            model_name='withdrawalrequest',
            name='delivery_actual_karat',
            field=models.DecimalField(
                blank=True,
                decimal_places=1,
                help_text='مثلاً ۷۴۷ — عیار فیزیکی تحویل‌شده',
                max_digits=6,
                null=True,
                verbose_name='عیار واقعی تحویل',
            ),
        ),
        migrations.AddField(
            model_name='withdrawalrequest',
            name='delivery_physical_weight',
            field=models.DecimalField(
                blank=True,
                decimal_places=3,
                max_digits=12,
                null=True,
                verbose_name='وزن فیزیکی تحویل (گرم)',
            ),
        ),
        migrations.AddField(
            model_name='withdrawalrequest',
            name='delivery_packet_code',
            field=models.CharField(
                blank=True,
                default='',
                max_length=32,
                verbose_name='کد ریگیری / پاکت',
            ),
        ),
        migrations.AddField(
            model_name='withdrawalrequest',
            name='delivery_seri',
            field=models.CharField(
                blank=True,
                default='',
                max_length=4,
                verbose_name='سری پاکت',
            ),
        ),
        migrations.AddField(
            model_name='withdrawalrequest',
            name='delivery_lab_name',
            field=models.CharField(
                blank=True,
                default='',
                max_length=120,
                verbose_name='نام آزمایشگاه',
            ),
        ),
        migrations.AddField(
            model_name='withdrawalrequest',
            name='delivery_notes',
            field=models.TextField(
                blank=True,
                default='',
                verbose_name='توضیحات تحویل',
            ),
        ),
        migrations.AddField(
            model_name='withdrawalrequest',
            name='delivery_difference_rial',
            field=models.DecimalField(
                decimal_places=0,
                default=0,
                help_text='مثبت = مشتری پرداخت کرد؛ منفی = به مشتری برگشت داده شد',
                max_digits=15,
                verbose_name='مابه‌التفاوت (ریال)',
            ),
        ),
        migrations.AddField(
            model_name='withdrawalrequest',
            name='delivery_difference_method',
            field=models.CharField(
                blank=True,
                choices=[
                    ('', 'بدون مابه‌التفاوت'),
                    ('CASH', 'نقدی'),
                    ('CARD', 'کارت'),
                    ('OTHER', 'سایر'),
                ],
                default='',
                max_length=16,
                verbose_name='نحوه تسویه مابه‌التفاوت',
            ),
        ),
        migrations.AddField(
            model_name='withdrawalrequest',
            name='delivery_invoice_number',
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text='فقط برای برداشت طلا پس از تحویل',
                max_length=24,
                null=True,
                unique=True,
                verbose_name='شماره فاکتور تحویل طلا',
            ),
        ),
    ]
