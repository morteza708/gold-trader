# Generated migration to fix trades fee based on margin

from django.db import migrations
from decimal import Decimal


def fix_trades_fee_based_on_margin(apps, schema_editor):
    """
    اصلاح کارمزد معاملات بر اساس حاشیه سود
    کارمزد = حاشیه سود × مقدار (گرم)
    """
    Trade = apps.get_model('trades', 'Trade')
    GoldPrice = apps.get_model('trades', 'GoldPrice')
    
    # دریافت قیمت فعلی (یا آخرین قیمت) برای محاسبه حاشیه سود
    price_obj = GoldPrice.objects.filter(is_active=True).order_by('-created_at').first()
    if not price_obj:
        price_obj = GoldPrice.objects.order_by('-created_at').first()
    
    if not price_obj:
        print("هیچ قیمتی یافت نشد. کارمزد به‌روزرسانی نشد.")
        return
    
    # فقط معاملات موفق را به‌روزرسانی می‌کنیم
    trades = Trade.objects.filter(status='SUCCESS')
    
    updated_count = 0
    for trade in trades:
        # محاسبه کارمزد بر اساس حاشیه سود
        if trade.trade_type == 'BUY':
            # برای خرید: کارمزد = حاشیه سود خرید × مقدار
            fee = price_obj.buy_margin * trade.amount
        else:  # SELL
            # برای فروش: کارمزد = حاشیه سود فروش × مقدار
            fee = price_obj.sell_margin * trade.amount
        
        # گرد کردن به عدد صحیح
        new_fee = fee.quantize(Decimal('1'), rounding='ROUND_HALF_UP')
        
        # فقط اگر کارمزد تغییر کرده باشد، به‌روزرسانی می‌کنیم
        if trade.fee != new_fee:
            trade.fee = new_fee
            trade.save(update_fields=['fee'])
            updated_count += 1
    
    print(f"کارمزد {updated_count} معامله بر اساس حاشیه سود به‌روزرسانی شد")


def reverse_fix_trades_fee(apps, schema_editor):
    """
    برگرداندن کارمزد به صفر (برای rollback)
    """
    Trade = apps.get_model('trades', 'Trade')
    Trade.objects.filter(status='SUCCESS').update(fee=0)


class Migration(migrations.Migration):

    dependencies = [
        ('trades', '0002_update_existing_trades_fee'),
    ]

    operations = [
        migrations.RunPython(fix_trades_fee_based_on_margin, reverse_fix_trades_fee),
    ]
