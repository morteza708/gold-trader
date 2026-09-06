from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('settings', '0009_alter_systemsettings_support_hours'),
    ]

    operations = [
        migrations.AddField(
            model_name='systemsettings',
            name='invoice_address',
            field=models.TextField(blank=True, default='', verbose_name='آدرس روی فاکتور'),
        ),
        migrations.AddField(
            model_name='systemsettings',
            name='invoice_brand_name',
            field=models.CharField(blank=True, default='', max_length=120, verbose_name='نام تجاری روی فاکتور'),
        ),
        migrations.AddField(
            model_name='systemsettings',
            name='invoice_company_name',
            field=models.CharField(blank=True, default='', max_length=200, verbose_name='نام حقوقی روی فاکتور'),
        ),
        migrations.AddField(
            model_name='systemsettings',
            name='invoice_logo',
            field=models.ImageField(blank=True, null=True, upload_to='invoice_logos/', verbose_name='لوگوی فاکتور'),
        ),
        migrations.AddField(
            model_name='systemsettings',
            name='invoice_national_id',
            field=models.CharField(blank=True, default='', max_length=20, verbose_name='شناسه ملی / کد اقتصادی'),
        ),
        migrations.AddField(
            model_name='systemsettings',
            name='invoice_phone',
            field=models.CharField(blank=True, default='', max_length=40, verbose_name='تلفن روی فاکتور'),
        ),
        migrations.AddField(
            model_name='systemsettings',
            name='invoice_tagline',
            field=models.CharField(blank=True, default='', max_length=200, verbose_name='شعار کوتاه فاکتور'),
        ),
    ]
