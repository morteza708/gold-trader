# Generated manually

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_customuser_avatar'),
    ]

    operations = [
        migrations.CreateModel(
            name='Wallet',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('rial_balance', models.DecimalField(decimal_places=0, default=0, help_text='موجودی ریالی به تومان', max_digits=15, verbose_name='موجودی ریالی')),
                ('gold_balance', models.DecimalField(decimal_places=3, default=0, help_text='موجودی طلا به گرم', max_digits=10, verbose_name='موجودی طلا')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به‌روزرسانی')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='wallet', to='accounts.customuser', verbose_name='کاربر')),
            ],
            options={
                'verbose_name': 'کیف پول',
                'verbose_name_plural': 'کیف پول‌ها',
            },
        ),
        migrations.CreateModel(
            name='SystemSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('admin_phone_numbers', models.JSONField(default=list, help_text='لیست شماره موبایل مدیران برای دریافت پیامک (به صورت آرایه)', verbose_name='شماره مدیران')),
                ('gold_pickup_address', models.TextField(blank=True, help_text='آدرس مراجعه حضوری برای دریافت طلا', null=True, verbose_name='آدرس مراجعه حضوری')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به‌روزرسانی')),
            ],
            options={
                'verbose_name': 'تنظیمات سیستم',
                'verbose_name_plural': 'تنظیمات سیستم',
            },
        ),
        migrations.CreateModel(
            name='BankCard',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('bank_name', models.CharField(max_length=100, verbose_name='نام بانک')),
                ('card_number', models.CharField(help_text='شماره کارت بانکی (16 رقم)', max_length=19, verbose_name='شماره کارت')),
                ('sheba_number', models.CharField(help_text='شماره شبا (24 رقم)', max_length=26, verbose_name='شماره شبا')),
                ('is_active', models.BooleanField(default=True, verbose_name='فعال')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به‌روزرسانی')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bank_cards', to='accounts.customuser', verbose_name='کاربر')),
            ],
            options={
                'verbose_name': 'کارت بانکی',
                'verbose_name_plural': 'کارت‌های بانکی',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='WithdrawalRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('withdrawal_type', models.CharField(choices=[('RIAL', 'برداشت وجه ریالی'), ('GOLD', 'برداشت طلا')], max_length=10, verbose_name='نوع برداشت')),
                ('amount', models.DecimalField(decimal_places=3, help_text='مقدار به ریال (برای برداشت وجه) یا گرم (برای برداشت طلا)', max_digits=15, verbose_name='مقدار')),
                ('status', models.CharField(choices=[('PENDING', 'در انتظار بررسی'), ('APPROVED', 'تایید شده'), ('REJECTED', 'رد شده'), ('COMPLETED', 'تکمیل شده')], default='PENDING', max_length=20, verbose_name='وضعیت')),
                ('request_code', models.CharField(db_index=True, help_text='کد منحصر به فرد درخواست', max_length=20, unique=True, verbose_name='کد درخواست')),
                ('receipt_image', models.ImageField(blank=True, help_text='فیش واریزی (فقط برای برداشت وجه)', null=True, upload_to='withdrawal_receipts/', verbose_name='فیش واریزی')),
                ('admin_note', models.TextField(blank=True, help_text='یادداشت مدیر در مورد این درخواست', null=True, verbose_name='یادداشت مدیر')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به‌روزرسانی')),
                ('bank_card', models.ForeignKey(blank=True, help_text='کارت بانکی برای برداشت وجه (فقط برای نوع RIAL)', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='withdrawal_requests', to='accounts.bankcard', verbose_name='کارت بانکی')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='withdrawal_requests', to='accounts.customuser', verbose_name='کاربر')),
            ],
            options={
                'verbose_name': 'درخواست برداشت',
                'verbose_name_plural': 'درخواست‌های برداشت',
                'ordering': ['-created_at'],
            },
        ),
    ]
