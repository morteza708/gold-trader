from kavenegar import KavenegarAPI, APIException, HTTPException
from django.conf import settings
from random import randint
from django.utils import timezone
from .models import CustomUser, CustomerProfile
import logging

logger = logging.getLogger('accounts')


def persian_to_english_numbers(text):
    """
    تبدیل اعداد فارسی به انگلیسی
    """
    persian_digits = '۰۱۲۳۴۵۶۷۸۹'
    english_digits = '0123456789'
    
    translation_table = str.maketrans(persian_digits, english_digits)
    return text.translate(translation_table)


def send_message(phone_number, message, template='otp-login'):
    """
    ارسال پیامک از طریق کاوه نگار
    """
    logger.info(f"[SMS] شروع ارسال پیامک - phone: {phone_number}, message: {message}, template: {template}")
    original_phone = str(phone_number)  # برای استفاده در exception handling
    try:
        # تبدیل اعداد فارسی به انگلیسی در شماره موبایل و اطمینان از string بودن
        phone_number = str(phone_number)
        phone_number = persian_to_english_numbers(phone_number)
        phone_number = phone_number.replace(' ', '').replace('-', '').strip()
        
        # بررسی فرمت شماره موبایل
        if not phone_number.startswith('0'):
            phone_number = '0' + phone_number
        
        # اطمینان از string بودن برای Kavenegar API
        phone_number = str(phone_number)
        message = str(message)
        
        logger.info(f"[SMS] شماره موبایل فرمت شده: {phone_number}, کد: {message}")
        
        api = KavenegarAPI(settings.KAVENEGAR_API_KEY)
        params = {
            'receptor': str(phone_number),  # حتماً string
            'template': str(template),
            'token': str(message),
            'type': 'sms',  # sms vs call
        }
        logger.info(f"[SMS] در حال ارسال به Kavenegar - params: {params}")
        response = api.verify_lookup(params)
        logger.info(f"[SMS] پیامک با موفقیت ارسال شد به {phone_number} - response: {response}")
        return True
    except APIException as e:
        logger.error(f"[SMS] APIException در ارسال پیامک OTP به {original_phone}: {e}", exc_info=True)
        logger.error(f"[SMS] Template: {template}, Token: {message}")
        return False
    except HTTPException as e:
        logger.error(f"[SMS] HTTPException در ارسال پیامک OTP به {original_phone}: {e}", exc_info=True)
        logger.error(f"[SMS] Template: {template}, Token: {message}")
        return False
    except Exception as e:
        logger.error(f"[SMS] خطای غیرمنتظره در ارسال پیامک OTP به {original_phone}: {e}", exc_info=True)
        logger.error(f"[SMS] Template: {template}, Token: {message}")
        return False


def send_double_token_message(phone_number, token, token2, template):
    """
    ارسال پیامک با دو توکن از طریق کاوه نگار
    token: کد حساب کاربر
    token2: مبلغ (ریال) یا مقدار (گرم)
    """
    try:
        # تبدیل اعداد فارسی به انگلیسی در شماره موبایل
        phone_number = persian_to_english_numbers(str(phone_number))
        phone_number = phone_number.replace(' ', '').replace('-', '')
        
        # بررسی فرمت شماره موبایل
        if not phone_number.startswith('0'):
            phone_number = '0' + phone_number
        
        api = KavenegarAPI(settings.KAVENEGAR_API_KEY)
        params = {
            'receptor': phone_number,
            'template': template,
            'token': str(token),    # توکن اول (کد حساب)
            'token2': str(token2), # توکن دوم (مبلغ یا مقدار)
            'type': 'sms',
        }
        response = api.verify_lookup(params)
        print(f"پیامک با موفقیت ارسال شد به {phone_number} با template {template}: {response}")
        return True
    except APIException as e:
        print(f"APIException در ارسال پیامک به {phone_number}: {e}")
        print(f"Template: {template}, Token: {token}, Token2: {token2}")
        return False
    except HTTPException as e:
        print(f"HTTPException در ارسال پیامک به {phone_number}: {e}")
        print(f"Template: {template}, Token: {token}, Token2: {token2}")
        return False
    except Exception as e:
        print(f"خطای غیرمنتظره در ارسال پیامک به {phone_number}: {e}")
        print(f"Template: {template}, Token: {token}, Token2: {token2}")
        import traceback
        traceback.print_exc()
        return False


def send_triple_token_message(phone_number, token, token2, token3, template):
    """
    ارسال پیامک با سه توکن از طریق کاوه نگار
    token: مبلغ کل
    token2: لیست حساب‌ها (با جداکننده |)
    token3: کد درخواست
    """
    try:
        # تبدیل اعداد فارسی به انگلیسی در شماره موبایل
        phone_number = persian_to_english_numbers(str(phone_number))
        phone_number = phone_number.replace(' ', '').replace('-', '')
        
        # بررسی فرمت شماره موبایل
        if not phone_number.startswith('0'):
            phone_number = '0' + phone_number
        
        api = KavenegarAPI(settings.KAVENEGAR_API_KEY)
        params = {
            'receptor': phone_number,
            'template': template,
            'token': str(token),    # توکن اول (مبلغ کل)
            'token2': str(token2), # توکن دوم (لیست حساب‌ها)
            'token3': str(token3), # توکن سوم (کد درخواست)
            'type': 'sms',
        }
        response = api.verify_lookup(params)
        print(f"پیامک با موفقیت ارسال شد به {phone_number} با template {template}: {response}")
        return True
    except APIException as e:
        print(f"APIException در ارسال پیامک به {phone_number}: {e}")
        print(f"Template: {template}, Token: {token}, Token2: {token2}, Token3: {token3}")
        return False
    except HTTPException as e:
        print(f"HTTPException در ارسال پیامک به {phone_number}: {e}")
        print(f"Template: {template}, Token: {token}, Token2: {token2}, Token3: {token3}")
        return False
    except Exception as e:
        print(f"خطای غیرمنتظره در ارسال پیامک به {phone_number}: {e}")
        print(f"Template: {template}, Token: {token}, Token2: {token2}, Token3: {token3}")
        import traceback
        traceback.print_exc()
        return False


def get_random_otp():
    """
    تولید کد OTP تصادفی 4 رقمی
    """
    return randint(1000, 9999)


def check_otp_expiration(phone_number):
    """
    بررسی انقضای کد OTP برای یک شماره موبایل
    """
    try:
        user = CustomUser.objects.get(phone_number=phone_number)
        return user.check_otp_expiration()
    except CustomUser.DoesNotExist:
        return False


def clean_expired_otp():
    """
    پاک کردن کدهای OTP منقضی شده
    """
    threshold = timezone.now() - timezone.timedelta(seconds=300)
    CustomUser.objects.filter(otp_code_created__lt=threshold).update(
        otp_code=None,
        otp_code_created=None
    )


def generate_account_code():
    """
    تولید کد حساب جدید (از 0001 شروع می‌شود)
    """
    # پیدا کردن بزرگترین کد حساب عددی
    profiles = CustomerProfile.objects.all()
    max_number = 0
    
    for profile in profiles:
        try:
            number = int(profile.account_code)
            if number > max_number:
                max_number = number
        except ValueError:
            # اگر کد عدد نبود، نادیده می‌گیریم
            continue
    
    # کد بعدی را تولید می‌کنیم
    new_number = max_number + 1
    
    # فرمت کردن به 4 رقم با صفرهای پیش‌رو (0001, 0002, ...)
    return f"{new_number:04d}"

