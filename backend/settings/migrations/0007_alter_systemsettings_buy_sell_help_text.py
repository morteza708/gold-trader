from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('settings', '0006_market_buy_sell_controls'),
    ]

    operations = [
        migrations.AlterField(
            model_name='systemsettings',
            name='buy_enabled',
            field=models.BooleanField(
                default=True,
                help_text='خرید فوری، سفارش هوشمند خرید و ثبت خرید معلق جدید',
                verbose_name='فعال بودن خرید',
            ),
        ),
        migrations.AlterField(
            model_name='systemsettings',
            name='sell_enabled',
            field=models.BooleanField(
                default=True,
                help_text='فروش فوری و سفارش هوشمند فروش',
                verbose_name='فعال بودن فروش',
            ),
        ),
    ]
