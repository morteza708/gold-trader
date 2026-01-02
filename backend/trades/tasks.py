"""
Celery tasks for trades operations
"""
from celery import shared_task
import logging
from .services import TradeService

logger = logging.getLogger('trades')


@shared_task(name='trades.tasks.check_and_execute_pending_orders')
def check_and_execute_pending_orders():
    """
    بررسی و اجرای سفارشات هوشمند (periodic task)
    این task هر 30 ثانیه توسط Celery Beat اجرا می‌شود
    """
    try:
        logger.info("شروع بررسی سفارشات هوشمند در انتظار...")
        
        result = TradeService.check_and_execute_pending_orders()
        
        if result:
            executed_count = result.get('executed_count', 0)
            resumed_count = result.get('resumed_count', 0)
            
            if executed_count > 0 or resumed_count > 0:
                logger.info(
                    f"بررسی سفارشات تکمیل شد: {executed_count} سفارش اجرا شد، "
                    f"{resumed_count} سفارش از حالت SUSPENDED به PENDING برگشت"
                )
            else:
                logger.debug("هیچ سفارش در انتظاری برای اجرا یافت نشد")
        else:
            logger.warning("نتیجه بررسی سفارشات None برگشت")
        
        return result
    except Exception as e:
        logger.error(f"خطا در بررسی و اجرای سفارشات هوشمند: {e}", exc_info=True)
        # در periodic tasks، خطا را log می‌کنیم اما exception را raise نمی‌کنیم
        # تا task بعدی هم اجرا شود
        return {
            'executed_count': 0,
            'resumed_count': 0,
            'error': str(e)
        }

