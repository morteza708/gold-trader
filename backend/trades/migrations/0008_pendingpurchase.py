import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('trades', '0007_goldprice_last_synced_at'),
        ('wallet', '0008_wallet_pending_trade_rial'),
    ]

    operations = [
        migrations.CreateModel(
            name='PendingPurchase',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('gold_amount', models.DecimalField(decimal_places=3, max_digits=10, verbose_name='مقدار طلا (گرم)')),
                ('locked_unit_price', models.DecimalField(decimal_places=0, max_digits=15, verbose_name='قیمت واحد قفل‌شده (ریال)')),
                ('locked_total', models.DecimalField(decimal_places=0, max_digits=15, verbose_name='مبلغ کل قفل‌شده (ریال)')),
                ('wallet_applied', models.DecimalField(decimal_places=0, default=0, max_digits=15, verbose_name='سهم قفل‌شده از کیف پول (ریال)')),
                ('deposit_min_amount', models.DecimalField(decimal_places=0, max_digits=15, verbose_name='حداقل مبلغ واریز (ریال)')),
                ('deposit_requested_amount', models.DecimalField(blank=True, decimal_places=0, max_digits=15, null=True, verbose_name='مبلغ درخواست واریز (ریال)')),
                ('status', models.CharField(choices=[('AWAITING_DEPOSIT', 'در انتظار ثبت واریز'), ('AWAITING_ACCOUNTS', 'در انتظار تخصیص حساب'), ('AWAITING_RECEIPTS', 'در انتظار فیش'), ('AWAITING_APPROVAL', 'در انتظار تأیید مدیر'), ('COMPLETED', 'تکمیل شده'), ('CANCELLED', 'لغو شده'), ('EXPIRED', 'منقضی شده')], db_index=True, default='AWAITING_DEPOSIT', max_length=30, verbose_name='وضعیت')),
                ('request_code', models.CharField(db_index=True, max_length=20, unique=True, verbose_name='کد درخواست')),
                ('expires_at', models.DateTimeField(db_index=True, verbose_name='مهلت تسویه')),
                ('completed_at', models.DateTimeField(blank=True, null=True, verbose_name='زمان تکمیل')),
                ('cancelled_at', models.DateTimeField(blank=True, null=True, verbose_name='زمان لغو/انقضا')),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به‌روزرسانی')),
                ('deposit_request', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='pending_purchase', to='wallet.depositrequest', verbose_name='درخواست واریز')),
                ('trade', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='pending_purchase_source', to='trades.trade', verbose_name='معامله نهایی')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='pending_purchases', to=settings.AUTH_USER_MODEL, verbose_name='کاربر')),
            ],
            options={
                'verbose_name': 'خرید معلق',
                'verbose_name_plural': 'خریدهای معلق',
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['user', 'status', '-created_at'], name='trades_pend_user_id_7c0a1a_idx'),
                    models.Index(fields=['status', 'expires_at'], name='trades_pend_status_2f8b1c_idx'),
                ],
            },
        ),
    ]
