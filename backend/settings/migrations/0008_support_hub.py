from django.db import migrations, models


def default_support_hours():
    return {
        'sat': {'enabled': True, 'start': '09:00', 'end': '18:00'},
        'sun': {'enabled': True, 'start': '09:00', 'end': '18:00'},
        'mon': {'enabled': True, 'start': '09:00', 'end': '18:00'},
        'tue': {'enabled': True, 'start': '09:00', 'end': '18:00'},
        'wed': {'enabled': True, 'start': '09:00', 'end': '18:00'},
        'thu': {'enabled': True, 'start': '09:00', 'end': '13:00'},
        'fri': {'enabled': False, 'start': '09:00', 'end': '18:00'},
    }


class Migration(migrations.Migration):

    dependencies = [
        ('settings', '0007_alter_systemsettings_buy_sell_help_text'),
    ]

    operations = [
        migrations.AddField(
            model_name='systemsettings',
            name='support_enabled',
            field=models.BooleanField(default=True, verbose_name='فعال بودن پشتیبانی'),
        ),
        migrations.AddField(
            model_name='systemsettings',
            name='support_phone',
            field=models.CharField(blank=True, default='', max_length=20, verbose_name='شماره پشتیبانی (اصلی)'),
        ),
        migrations.AddField(
            model_name='systemsettings',
            name='support_phone_secondary',
            field=models.CharField(blank=True, default='', max_length=20, verbose_name='شماره پشتیبانی (دوم)'),
        ),
        migrations.AddField(
            model_name='systemsettings',
            name='support_landline',
            field=models.CharField(blank=True, default='', max_length=20, verbose_name='تلفن ثابت پشتیبانی'),
        ),
        migrations.AddField(
            model_name='systemsettings',
            name='whatsapp_number',
            field=models.CharField(blank=True, default='', max_length=20, verbose_name='شماره واتساپ'),
        ),
        migrations.AddField(
            model_name='systemsettings',
            name='telegram_username',
            field=models.CharField(blank=True, default='', max_length=64, verbose_name='نام کاربری تلگرام'),
        ),
        migrations.AddField(
            model_name='systemsettings',
            name='support_email',
            field=models.EmailField(blank=True, default='', max_length=254, verbose_name='ایمیل پشتیبانی'),
        ),
        migrations.AddField(
            model_name='systemsettings',
            name='support_hours_enabled',
            field=models.BooleanField(default=False, verbose_name='محدودیت ساعات پاسخگویی'),
        ),
        migrations.AddField(
            model_name='systemsettings',
            name='support_hours',
            field=models.JSONField(blank=True, default=default_support_hours, verbose_name='ساعات پاسخگویی'),
        ),
        migrations.AddField(
            model_name='systemsettings',
            name='support_offline_message',
            field=models.TextField(blank=True, default='', verbose_name='پیام خارج از ساعت کاری'),
        ),
        migrations.AddField(
            model_name='systemsettings',
            name='support_online_message',
            field=models.TextField(blank=True, default='', verbose_name='پیام داخل ساعت کاری'),
        ),
        migrations.AddField(
            model_name='systemsettings',
            name='support_show_floating_button',
            field=models.BooleanField(default=True, verbose_name='نمایش دکمه شناور در داشبورد'),
        ),
        migrations.AddField(
            model_name='systemsettings',
            name='support_show_on_public_site',
            field=models.BooleanField(default=True, verbose_name='نمایش در سایت عمومی'),
        ),
    ]
