from decimal import Decimal

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='CompanyTreasury',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('gold_balance', models.DecimalField(decimal_places=6, default=Decimal('0'), max_digits=18, verbose_name='موجودی طلای شرکت (گرم)')),
                ('avg_cost_per_gram', models.DecimalField(decimal_places=0, default=Decimal('0'), max_digits=18, verbose_name='میانگین قیمت تمام‌شده (ریال بر گرم)')),
                ('warning_cover_ratio', models.DecimalField(decimal_places=4, default=Decimal('0.9800'), help_text='مثلاً ۰.۹۸ یعنی ۹۸٪ — زیر این نسبت وضعیت هشدار است', max_digits=6, verbose_name='آستانه هشدار پوشش')),
                ('critical_cover_ratio', models.DecimalField(decimal_places=4, default=Decimal('1.0000'), help_text='اگر نسبت پوشش از این مقدار کمتر شود خرید کاربر متوقف می‌شود', max_digits=6, verbose_name='آستانه بحرانی پوشش')),
                ('auto_block_user_buy', models.BooleanField(default=True, verbose_name='توقف خودکار خرید در کمبود')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='آخرین به‌روزرسانی')),
            ],
            options={
                'verbose_name': 'خزانه شرکت',
                'verbose_name_plural': 'خزانه شرکت',
            },
        ),
        migrations.CreateModel(
            name='OperationalJournal',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True, verbose_name='زمان ثبت')),
                ('asset', models.CharField(choices=[('RIAL', 'ریال'), ('GOLD', 'طلا')], max_length=8, verbose_name='نوع دارایی')),
                ('amount', models.DecimalField(decimal_places=6, help_text='مثبت = افزایش، منفی = کاهش', max_digits=18, verbose_name='مقدار (+/−)')),
                ('unit_price', models.DecimalField(blank=True, decimal_places=0, max_digits=18, null=True, verbose_name='قیمت واحد (ریال)')),
                ('event_type', models.CharField(choices=[('OPENING', 'مانده افتتاحیه'), ('DEPOSIT', 'واریز ریال'), ('BUY', 'خرید طلا توسط کاربر'), ('SELL', 'فروش طلا توسط کاربر'), ('WITHDRAW_RIAL', 'برداشت ریال'), ('GOLD_DELIVERY', 'تحویل حضوری طلا'), ('VAULT_IN', 'ورود طلا به خزانه'), ('VAULT_OUT', 'خروج طلا از خزانه'), ('ADJUSTMENT', 'تعدیل'), ('PENDING_LOCK', 'قفل خرید معلق'), ('PENDING_UNLOCK', 'آزادسازی خرید معلق')], db_index=True, max_length=32, verbose_name='نوع رویداد')),
                ('balance_after', models.DecimalField(blank=True, decimal_places=6, max_digits=18, null=True, verbose_name='مانده پس از رویداد')),
                ('reference_type', models.CharField(blank=True, default='', max_length=64, verbose_name='نوع سند')),
                ('reference_id', models.PositiveIntegerField(blank=True, null=True, verbose_name='شناسه سند')),
                ('note', models.TextField(blank=True, default='', verbose_name='یادداشت')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_operational_journals', to=settings.AUTH_USER_MODEL, verbose_name='ثبت‌کننده')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='operational_journals', to=settings.AUTH_USER_MODEL, verbose_name='کاربر')),
            ],
            options={
                'verbose_name': 'ردیف دفتر عملیات',
                'verbose_name_plural': 'دفتر عملیات',
                'ordering': ['-created_at', '-id'],
            },
        ),
        migrations.CreateModel(
            name='VaultMovement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='زمان ثبت')),
                ('movement_type', models.CharField(choices=[('IN', 'ورود به خزانه'), ('OUT', 'خروج از خزانه'), ('ADJUST', 'تعدیل')], max_length=8, verbose_name='نوع حرکت')),
                ('amount', models.DecimalField(decimal_places=6, help_text='برای ورود و خروج مثبت وارد شود؛ برای تعدیل می‌تواند مثبت یا منفی باشد', max_digits=18, verbose_name='مقدار (گرم)')),
                ('unit_price', models.DecimalField(decimal_places=0, default=Decimal('0'), max_digits=18, verbose_name='قیمت واحد (ریال بر گرم)')),
                ('counterparty', models.CharField(blank=True, default='', max_length=255, verbose_name='طرف معامله / تأمین‌کننده')),
                ('note', models.TextField(blank=True, default='', verbose_name='یادداشت')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='vault_movements', to=settings.AUTH_USER_MODEL, verbose_name='ثبت‌کننده')),
                ('journal_entry', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='vault_movement', to='treasury.operationaljournal', verbose_name='ردیف دفتر')),
            ],
            options={
                'verbose_name': 'حرکت خزانه',
                'verbose_name_plural': 'حرکت‌های خزانه',
                'ordering': ['-created_at', '-id'],
            },
        ),
    ]
