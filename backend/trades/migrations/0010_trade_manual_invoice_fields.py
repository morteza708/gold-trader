from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('trades', '0009_order_suspended_reason'),
    ]

    operations = [
        migrations.AddField(
            model_name='trade',
            name='channel',
            field=models.CharField(
                choices=[('PLATFORM', 'پلتفرم'), ('MANUAL', 'فاکتور دستی')],
                db_index=True,
                default='PLATFORM',
                max_length=16,
                verbose_name='کانال معامله',
            ),
        ),
        migrations.AddField(
            model_name='trade',
            name='created_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='manual_trades_created',
                to=settings.AUTH_USER_MODEL,
                verbose_name='صادرکننده (ادمین)',
            ),
        ),
        migrations.AddField(
            model_name='trade',
            name='delivery_status',
            field=models.CharField(
                choices=[
                    ('NOT_APPLICABLE', 'ندارد'),
                    ('PENDING', 'در انتظار تحویل'),
                    ('DELIVERED', 'تحویل شد'),
                ],
                default='NOT_APPLICABLE',
                max_length=24,
                verbose_name='وضعیت تحویل طلا',
            ),
        ),
        migrations.AddField(
            model_name='trade',
            name='payment_status',
            field=models.CharField(
                choices=[
                    ('NOT_APPLICABLE', 'نامشخص / عادی'),
                    ('UNPAID', 'پرداخت‌نشده'),
                    ('PAID_OFFPLATFORM', 'پرداخت خارج از سامانه'),
                    ('PAID_WALLET', 'پرداخت از کیف'),
                ],
                default='NOT_APPLICABLE',
                max_length=24,
                verbose_name='وضعیت پرداخت',
            ),
        ),
        migrations.AddField(
            model_name='trade',
            name='settlement_mode',
            field=models.CharField(
                choices=[('WALLET', 'از کیف پول'), ('OFFPLATFORM', 'خارج از سامانه')],
                default='WALLET',
                max_length=16,
                verbose_name='حالت تسویه',
            ),
        ),
        migrations.AddField(
            model_name='trade',
            name='settlement_note',
            field=models.TextField(blank=True, default='', verbose_name='یادداشت تسویه'),
        ),
        migrations.AddIndex(
            model_name='trade',
            index=models.Index(fields=['channel', '-created_at'], name='trades_trad_channel_created_idx'),
        ),
    ]
