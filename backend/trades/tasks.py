"""
Celery tasks for trades operations
"""
from datetime import timedelta
from celery import shared_task
from django.conf import settings
from django.utils import timezone
import logging
from .services import TradeService
from .viragold import ViragoldError, fetch_symbol_snapshot

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


@shared_task(name='trades.tasks.fetch_viragold_price')
def fetch_viragold_price():
    """
    دریافت قیمت زنده گرم ۱۸ عیار / حواله از ویراگلد و ذخیره در صورت تغییر.
    این task هر 2 دقیقه توسط Celery Beat اجرا می‌شود.
    """
    logger.info("=== شروع fetch_viragold_price ===")
    
    token = getattr(settings, 'VIRAGOLD_API_TOKEN', '') or ''
    if not token:
        logger.debug("VIRAGOLD_API_TOKEN تنظیم نشده؛ دریافت قیمت زنده رد شد")
        return {'skipped': True, 'reason': 'no_token'}

    try:
        snapshot = fetch_symbol_snapshot()
        result = TradeService.sync_live_base_price(
            snapshot['price_rial'],
            market={
                'market_change': snapshot.get('market_change'),
                'market_change_percent': snapshot.get('market_change_percent'),
                'market_high': snapshot.get('market_high'),
                'market_low': snapshot.get('market_low'),
                'market_price_time': snapshot.get('market_price_time'),
                'market_symbol_name': snapshot.get('market_symbol_name'),
            },
        )
        price_obj = result['price']
        logger.info(
            "قیمت دریافت شد: buy=%s, changed=%s",
            price_obj.buy_base_price,
            result['changed'],
        )
        return {
            'ok': True,
            'changed': result['changed'],
            'buy_base_price': str(price_obj.buy_base_price),
            'sell_base_price': str(price_obj.sell_base_price),
        }
    except ViragoldError as e:
        logger.error("خطا در دریافت قیمت ویراگلد: %s", e)
        return {'ok': False, 'error': str(e)}
    except Exception as e:
        logger.error("خطای غیرمنتظره در دریافت قیمت ویراگلد: %s", e, exc_info=True)
        return {'ok': False, 'error': str(e)}


@shared_task(name='trades.tasks.price_health_watchdog')
def price_health_watchdog():
    """
    بررسی سلامت قیمت و دریافت دستی در صورت قدیمی بودن.
    
    این task هر 5 دقیقه اجرا می‌شود و اگر قیمت بیش از 10 دقیقه
    قدیمی باشد، مستقیماً قیمت جدید دریافت می‌کند.
    """
    from .models import GoldPrice
    
    logger.info("=== شروع price_health_watchdog ===")
    
    current_price = GoldPrice.get_current_price()
    if not current_price:
        logger.warning("هیچ قیمتی در دیتابیس نیست، دریافت قیمت اولیه...")
        fetch_viragold_price.delay()
        return {'action': 'triggered_fetch', 'reason': 'no_price'}
    
    now = timezone.now()
    age = now - current_price.created_at
    age_minutes = age.total_seconds() / 60
    
    max_age_minutes = 10  # حداکثر سن مجاز قیمت
    
    if age_minutes > max_age_minutes:
        logger.warning(
            "قیمت قدیمی است (سن: %.1f دقیقه)، دریافت مستقیم قیمت...",
            age_minutes,
        )
        # اجرای مستقیم (نه async) برای اطمینان از دریافت
        result = fetch_viragold_price()
        return {
            'action': 'direct_fetch',
            'reason': 'stale_price',
            'age_minutes': round(age_minutes, 1),
            'fetch_result': result,
        }
    
    logger.info("قیمت سالم است (سن: %.1f دقیقه)", age_minutes)
    return {
        'action': 'none',
        'reason': 'price_healthy',
        'age_minutes': round(age_minutes, 1),
    }

