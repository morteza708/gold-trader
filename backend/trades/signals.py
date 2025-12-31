from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import GoldPrice
from .services import TradeService


@receiver(post_save, sender=GoldPrice)
def check_pending_orders_on_price_update(sender, instance, created, **kwargs):
    """
    Signal handler برای بررسی و اجرای خودکار سفارشات هنگام به‌روزرسانی قیمت
    
    فقط وقتی قیمت جدید فعال است (is_active=True) بررسی می‌کنیم
    """
    if instance.is_active:
        try:
            executed_count = TradeService.check_and_execute_pending_orders()
            if executed_count > 0:
                print(f"✅ {executed_count} سفارش به صورت خودکار اجرا شد")
        except Exception as e:
            import traceback
            print(f"❌ خطا در بررسی سفارشات: {e}")
            print(traceback.format_exc())

