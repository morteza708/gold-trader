"""
کلاینت استعلام ریگیری از API تهحساب.
Domain فقط از settings خوانده می‌شود و به کلاینت برنمی‌گردد.
"""
from __future__ import annotations

import logging
import re
from typing import Any

import requests
from django.conf import settings

logger = logging.getLogger('reygiri')


class ReygiriError(Exception):
    """خطای قابل نمایش به کاربر در استعلام ریگیری"""

    def __init__(self, message: str, *, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _domain() -> str:
    domain = (getattr(settings, 'REYGIRI_DOMAIN', '') or '').strip()
    if not domain:
        raise ReygiriError(
            'سرویس ریگیری پیکربندی نشده است. با پشتیبانی تماس بگیرید.',
            status_code=503,
        )
    return domain


def _api_base() -> str:
    return (
        getattr(settings, 'REYGIRI_API_BASE', '')
        or 'https://reygiri.tahesab.ir/ReygiriAPI/'
    ).strip()


def normalize_packet_number(value: Any) -> str:
    """اعداد فارسی/عربی → انگلیسی و فقط رقم."""
    if value is None:
        raise ReygiriError('شماره پاکت الزامی است')
    text = str(value).strip()
    persian = '۰۱۲۳۴۵۶۷۸۹'
    arabic = '٠١٢٣٤٥٦٧٨٩'
    english = '0123456789'
    for i in range(10):
        text = text.replace(persian[i], english[i]).replace(arabic[i], english[i])
    text = re.sub(r'\D', '', text)
    if not text:
        raise ReygiriError('شماره پاکت نامعتبر است')
    if len(text) > 20:
        raise ReygiriError('شماره پاکت بیش از حد طولانی است')
    return text


def normalize_seri(value: Any) -> str:
    """حرف انگلیسی اختیاری A–Z؛ خالی مجاز است."""
    if value is None:
        return ''
    text = str(value).strip().upper()
    if not text:
        return ''
    if len(text) != 1 or not re.match(r'^[A-Z]$', text):
        raise ReygiriError('سری باید یک حرف انگلیسی (A تا Z) باشد یا خالی بماند')
    return text


def map_result_item(raw: dict) -> dict[str, Any]:
    return {
        'packet_number': raw.get('N'),
        'karat': raw.get('K'),
        'name': raw.get('A') or '',
        'announced_at': raw.get('D') or '',
        'companion_code': raw.get('S'),
    }


def lookup_assay(*, packet_number: str, seri: str = '', archive: bool = False) -> list[dict[str, Any]]:
    """
    فراخوانی API تهحساب و برگرداندن لیست نتایج نرمال‌شده.
    """
    n = normalize_packet_number(packet_number)
    s = normalize_seri(seri)
    domain = _domain()
    base = _api_base()

    params: dict[str, str] = {
        'Seri': s,
        'N': n,
        'FF': 'RR',
        'Domain': domain,
    }
    if archive:
        params['Archive'] = 'Y'

    timeout = float(getattr(settings, 'REYGIRI_TIMEOUT', 15) or 15)

    try:
        response = requests.get(
            base,
            params=params,
            timeout=timeout,
            headers={
                'Accept': 'application/json',
                'User-Agent': 'OpalBox-Reygiri/1.0',
            },
        )
    except requests.Timeout as exc:
        logger.warning('Reygiri timeout for packet=%s', n)
        raise ReygiriError('پاسخ سرویس ریگیری طول کشید. دوباره تلاش کنید.', status_code=504) from exc
    except requests.RequestException as exc:
        logger.error('Reygiri request failed: %s', exc, exc_info=True)
        raise ReygiriError('ارتباط با سرویس ریگیری برقرار نشد.', status_code=502) from exc

    if response.status_code >= 500:
        logger.error('Reygiri upstream %s', response.status_code)
        raise ReygiriError('سرویس ریگیری موقتاً در دسترس نیست.', status_code=502)

    if response.status_code >= 400:
        logger.warning('Reygiri client error %s for packet=%s', response.status_code, n)
        raise ReygiriError('استعلام نامعتبر است یا سرویس پاسخ نداد.', status_code=400)

    try:
        payload = response.json()
    except ValueError as exc:
        logger.error('Reygiri non-JSON response')
        raise ReygiriError('پاسخ سرویس ریگیری قابل پردازش نیست.', status_code=502) from exc

    raw_list = payload.get('result')
    if raw_list is None:
        raw_list = []
    if not isinstance(raw_list, list):
        raise ReygiriError('فرمت پاسخ سرویس ریگیری نامعتبر است.', status_code=502)

    return [map_result_item(item) for item in raw_list if isinstance(item, dict)]
