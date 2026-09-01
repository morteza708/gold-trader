from django.db import migrations, models


def copy_trades_enabled_to_sides(apps, schema_editor):
    SystemSettings = apps.get_model('settings', 'SystemSettings')
    for row in SystemSettings.objects.all():
        enabled = row.trades_enabled
        row.buy_enabled = enabled
        row.sell_enabled = enabled
        row.save(update_fields=['buy_enabled', 'sell_enabled'])


class Migration(migrations.Migration):

    dependencies = [
        ('settings', '0005_pending_purchase_expiry_hours'),
    ]

    operations = [
        migrations.AddField(
            model_name='systemsettings',
            name='buy_enabled',
            field=models.BooleanField(
                default=True,
                help_text='خرید فوری، سفارش limit خرید و ثبت خرید معلق جدید',
                verbose_name='فعال بودن خرید',
            ),
        ),
        migrations.AddField(
            model_name='systemsettings',
            name='sell_enabled',
            field=models.BooleanField(
                default=True,
                help_text='فروش فوری و سفارش limit فروش',
                verbose_name='فعال بودن فروش',
            ),
        ),
        migrations.AddField(
            model_name='systemsettings',
            name='market_admin_notice',
            field=models.TextField(
                blank=True,
                default='',
                help_text='اختیاری — در بنر وضعیت بازار به کاربر نمایش داده می‌شود',
                verbose_name='پیام عمومی بازار برای کاربران',
            ),
        ),
        migrations.AlterField(
            model_name='systemsettings',
            name='trades_enabled',
            field=models.BooleanField(
                default=True,
                help_text='Deprecated — از buy_enabled و sell_enabled استفاده کنید',
                verbose_name='فعال بودن معاملات (قدیمی)',
            ),
        ),
        migrations.RunPython(copy_trades_enabled_to_sides, migrations.RunPython.noop),
    ]
