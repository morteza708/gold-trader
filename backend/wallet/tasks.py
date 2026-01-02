"""
Celery tasks for wallet operations
"""
from celery import shared_task
import logging
from accounts.services import (
    send_message,
    send_double_token_message,
    send_triple_token_message
)

logger = logging.getLogger('wallet')


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_sms_async(self, phone_number, template, token=None, token2=None, token3=None):
    """
    ارسال SMS به صورت async
    
    Args:
        phone_number: شماره موبایل
        template: نام template در کاوه نگار
        token: توکن اول (اختیاری)
        token2: توکن دوم (اختیاری)
        token3: توکن سوم (اختیاری)
    
    Returns:
        bool: True اگر موفق باشد، False در غیر این صورت
    """
    try:
        if token3 is not None:
            # ارسال با سه توکن
            result = send_triple_token_message(phone_number, token, token2, token3, template)
        elif token2 is not None:
            # ارسال با دو توکن
            result = send_double_token_message(phone_number, token, token2, template)
        elif token is not None:
            # ارسال با یک توکن
            result = send_message(phone_number, token, template)
        else:
            logger.error(f"حداقل یک توکن باید ارسال شود برای {phone_number} با template {template}")
            return False
        
        if result:
            logger.info(f"پیامک با موفقیت ارسال شد به {phone_number} با template {template}")
        else:
            logger.warning(f"خطا در ارسال پیامک به {phone_number} با template {template}")
            # Retry در صورت خطا
            raise Exception(f"خطا در ارسال پیامک به {phone_number}")
        
        return result
    except Exception as exc:
        logger.error(f"خطا در ارسال async پیامک به {phone_number}: {exc}", exc_info=True)
        # Retry با exponential backoff
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_sms_batch_async(self, sms_list):
    """
    ارسال دسته‌ای SMS به صورت async
    
    Args:
        sms_list: لیست دیکشنری‌های حاوی اطلاعات SMS
            [
                {
                    'phone_number': '09123456789',
                    'template': 'template-name',
                    'token': 'value1',
                    'token2': 'value2',  # اختیاری
                    'token3': 'value3',  # اختیاری
                },
                ...
            ]
    
    Returns:
        dict: نتایج ارسال برای هر SMS
    """
    results = {}
    for sms_data in sms_list:
        phone_number = sms_data.get('phone_number')
        template = sms_data.get('template')
        token = sms_data.get('token')
        token2 = sms_data.get('token2')
        token3 = sms_data.get('token3')
        
        try:
            result = send_sms_async.delay(
                phone_number=phone_number,
                template=template,
                token=token,
                token2=token2,
                token3=token3
            )
            results[phone_number] = {
                'status': 'queued',
                'task_id': result.id
            }
        except Exception as e:
            logger.error(f"خطا در queue کردن SMS برای {phone_number}: {e}", exc_info=True)
            results[phone_number] = {
                'status': 'failed',
                'error': str(e)
            }
    
    return results

