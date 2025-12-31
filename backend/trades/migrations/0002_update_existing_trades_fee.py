# Generated migration to update existing trades fee

from django.db import migrations
from decimal import Decimal


def update_trades_fee(apps, schema_editor):
    """
    به‌روزرسانی کارمزد معاملات قدیمی که fee=0 دارند
    کارمزد بر اساس حاشیه سود محاسبه می‌شود: حاشیه سود × مقدار (گرم)
    """
    Trade = apps.get_model('trades', 'Trade')
    GoldPrice = apps.get_model('trades', 'GoldPrice')
    
    # فقط معاملات موفق که fee=0 دارند را به‌روزرسانی می‌کنیم
    trades = Trade.objects.filter(status='SUCCESS', fee=0)
    
    # دریافت قیمت فعلی (یا آخرین قیمت) برای محاسبه حاشیه سود
    # اگر قیمت فعالی وجود نداشته باشد، از آخرین قیمت استفاده می‌کنیم
    price_obj = GoldPrice.objects.filter(is_active=True).order_by('-created_at').first()
    if not price_obj:
        price_obj = GoldPrice.objects.order_by('-created_at').first()
    
    if not price_obj:
        print("هیچ قیمتی یافت نشد. کارمزد به‌روزرسانی نشد.")
        return
    
    for trade in trades:
        # محاسبه کارمزد بر اساس حاشیه سود
        if trade.trade_type == 'BUY':
            # برای خرید: کارمزد = حاشیه سود خرید × مقدار
            fee = price_obj.buy_margin * trade.amount
        else:  # SELL
            # برای فروش: کارمزد = حاشیه سود فروش × مقدار
            fee = price_obj.sell_margin * trade.amount
        
        # گرد کردن به عدد صحیح
        trade.fee = fee.quantize(Decimal('1'), rounding='ROUND_HALF_UP')
        trade.save(update_fields=['fee'])
    
    print(f"کارمزد {trades.count()} معامله به‌روزرسانی شد")


def reverse_update_trades_fee(apps, schema_editor):
    """
    برگرداندن کارمزد به صفر (برای rollback)
    """
    Trade = apps.get_model('trades', 'Trade')
    Trade.objects.filter(status='SUCCESS').update(fee=0)


class Migration(migrations.Migration):

    dependencies = [
        ('trades', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(update_trades_fee, reverse_update_trades_fee),
    ]
