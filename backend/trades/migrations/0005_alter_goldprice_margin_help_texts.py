# Generated manually for sell-margin subtraction help texts

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('trades', '0004_trade_margin_profit'),
    ]

    operations = [
        migrations.AlterField(
            model_name='goldprice',
            name='buy_margin',
            field=models.DecimalField(
                decimal_places=0,
                default=0,
                help_text='عدد مثبت یا صفر؛ به قیمت پایه خرید اضافه می‌شود',
                max_digits=15,
                verbose_name='حاشیه سود خرید (ریال)',
            ),
        ),
        migrations.AlterField(
            model_name='goldprice',
            name='sell_margin',
            field=models.DecimalField(
                decimal_places=0,
                default=0,
                help_text='عدد مثبت یا صفر؛ از قیمت پایه فروش کم می‌شود (در گزارش سود همان مقدار مثبت لحاظ می‌شود)',
                max_digits=15,
                verbose_name='حاشیه سود فروش (ریال)',
            ),
        ),
        migrations.AlterField(
            model_name='goldprice',
            name='buy_final_price',
            field=models.DecimalField(
                decimal_places=0,
                help_text='قیمت نهایی خرید = قیمت پایه + حاشیه سود خرید',
                max_digits=15,
                verbose_name='قیمت نهایی خرید (ریال)',
            ),
        ),
        migrations.AlterField(
            model_name='goldprice',
            name='sell_final_price',
            field=models.DecimalField(
                decimal_places=0,
                help_text='قیمت نهایی فروش = قیمت پایه − حاشیه سود فروش',
                max_digits=15,
                verbose_name='قیمت نهایی فروش (ریال)',
            ),
        ),
    ]
