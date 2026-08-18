"""
کلاینت دریافت قیمت از API ویراگلد.

قیمت‌های API به تومان هستند؛ این ماژول آن‌ها را به ریال تبدیل می‌کند.
"""
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

import requests
from django.conf import settings

import logging

logger = logging.getLogger('trades')


class ViragoldError(Exception):
    """خطای دریافت یا پردازش قیمت از ویراگلد"""


def parse_toman_price(raw_price) -> Decimal:
    """تبدیل رشته قیمت API (مثل '19,373,420' یا '2,280,500-') به Decimal تومان."""
    if raw_price is None:
        raise ViragoldError('مقدار قیمت در پاسخ API خالی است')

    cleaned = str(raw_price).replace(',', '').replace('٬', '').replace(' ', '').strip()
    if not cleaned:
        raise ViragoldError('مقدار قیمت در پاسخ API خالی است')

    if cleaned.endswith('-') and not cleaned.startswith('-'):
        cleaned = f'-{cleaned[:-1]}'

    try:
        return Decimal(cleaned)
    except InvalidOperation as exc:
        raise ViragoldError(f'فرمت قیمت نامعتبر است: {raw_price}') from exc


def toman_to_rial(toman_price: Decimal, *, require_positive: bool = True) -> Decimal:
    """تبدیل تومان به ریال و گرد کردن به عدد صحیح."""
    multiplier = Decimal(str(getattr(settings, 'VIRAGOLD_TOMAN_TO_RIAL', 10)))
    rial = (toman_price * multiplier).quantize(Decimal('1'), rounding=ROUND_HALF_UP)
    if require_positive and rial <= 0:
        raise ViragoldError(f'قیمت ریالی نامعتبر است: {rial}')
    return rial


def _auth_token() -> str:
    token = (getattr(settings, 'VIRAGOLD_API_TOKEN', '') or '').strip().strip('"').strip("'")
    if token.lower().startswith('bearer '):
        token = token[7:].strip()
    return token


def _request_headers(token: str) -> dict:
    return {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7',
        'User-Agent': (
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
            'AppleWebKit/537.36 (KHTML, like Gecko) '
            'Chrome/124.0.0.0 Safari/537.36'
        ),
    }


def _http_error_detail(response) -> str:
    body = (response.text or '').strip().replace('\n', ' ')
    if len(body) > 240:
        body = f'{body[:240]}…'
    if body:
        return f'HTTP {response.status_code} | {body}'
    return f'HTTP {response.status_code}'


def find_symbol(payload: dict, symbol_id: int) -> dict:
    groups = payload.get('groups') or []
    for group in groups:
        for symbol in group.get('symbols') or []:
            try:
                current_id = int(symbol.get('symbolId'))
            except (TypeError, ValueError):
                continue
            if current_id == int(symbol_id):
                return symbol
    raise ViragoldError(f'نماد با شناسه {symbol_id} در پاسخ API یافت نشد')


def fetch_symbol_snapshot(symbol_id: int | None = None) -> dict:
    """
    دریافت قیمت و خلاصه بازار یک نماد از ویراگلد.

    قیمت‌ها به ریال تبدیل می‌شوند. پیش‌فرض: گرم ۱۸ عیار / حواله (symbolId=1197)
    """
    token = _auth_token()
    if not token:
        raise ViragoldError('توکن API ویراگلد تنظیم نشده است')

    url = getattr(settings, 'VIRAGOLD_API_URL', 'https://api.viragold.net/api/v1/price')
    target_id = symbol_id if symbol_id is not None else int(
        getattr(settings, 'VIRAGOLD_SYMBOL_ID', 1197)
    )

    try:
        response = requests.get(
            url,
            headers=_request_headers(token),
            timeout=15,
        )
    except requests.RequestException as exc:
        raise ViragoldError(f'خطا در اتصال به API ویراگلد: {exc}') from exc

    if response.status_code == 401:
        raise ViragoldError('احراز هویت API ویراگلد نامعتبر است')
    if response.status_code == 403:
        raise ViragoldError(
            'دسترسی به API ویراگلد رد شد (403). '
            'معمولاً به‌خاطر مسدود بودن IP سرور یا فایروال است. '
            f'جزئیات: {_http_error_detail(response)}'
        )
    if response.status_code != 200:
        raise ViragoldError(
            f'پاسخ نامعتبر از API ویراگلد: {_http_error_detail(response)}'
        )

    try:
        payload = response.json()
    except ValueError as exc:
        raise ViragoldError('پاسخ API ویراگلد JSON معتبر نیست') from exc

    symbol = find_symbol(payload, target_id)
    toman_price = parse_toman_price(symbol.get('price'))
    rial_price = toman_to_rial(toman_price)

    change_rial = None
    change_percent = None
    high_rial = None
    low_rial = None
    try:
        change_rial = toman_to_rial(parse_toman_price(symbol.get('change')), require_positive=False)
    except ViragoldError:
        logger.warning('تغییر قیمت ویراگلد قابل پردازش نبود: %s', symbol.get('change'))
    try:
        change_percent = parse_toman_price(symbol.get('changePercent'))
    except ViragoldError:
        logger.warning('درصد تغییر ویراگلد قابل پردازش نبود: %s', symbol.get('changePercent'))
    try:
        high_rial = toman_to_rial(parse_toman_price(symbol.get('highPrice')))
    except ViragoldError:
        logger.warning('سقف قیمت ویراگلد قابل پردازش نبود: %s', symbol.get('highPrice'))
    try:
        low_rial = toman_to_rial(parse_toman_price(symbol.get('lowPrice')))
    except ViragoldError:
        logger.warning('کف قیمت ویراگلد قابل پردازش نبود: %s', symbol.get('lowPrice'))

    snapshot = {
        'price_rial': rial_price,
        'market_change': change_rial,
        'market_change_percent': change_percent,
        'market_high': high_rial,
        'market_low': low_rial,
        'market_price_time': (symbol.get('priceTime') or '').strip(),
        'market_symbol_name': (symbol.get('name') or '').strip(),
    }

    logger.info(
        'قیمت ویراگلد دریافت شد: symbolId=%s name=%s toman=%s rial=%s change=%s percent=%s',
        target_id,
        snapshot['market_symbol_name'],
        toman_price,
        rial_price,
        change_rial,
        change_percent,
    )
    return snapshot


def fetch_symbol_price_rial(symbol_id: int | None = None) -> Decimal:
    """
    دریافت قیمت یک نماد از ویراگلد و تبدیل به ریال.

    پیش‌فرض: گرم ۱۸ عیار / حواله (symbolId=1197)
    """
    return fetch_symbol_snapshot(symbol_id)['price_rial']
