"""هویت صدور فاکتور — از تنظیمات ادمین با fallback به env"""
from __future__ import annotations

import base64
import os
from typing import Any

from django.conf import settings as django_settings


def get_invoice_issuer(request=None) -> dict[str, Any]:
    from .models import SystemSettings

    obj = SystemSettings.get_settings()
    brand_name = (obj.invoice_brand_name or '').strip() or getattr(
        django_settings, 'BRAND_NAME', 'اپال‌باکس'
    )
    company_name = (obj.invoice_company_name or '').strip() or getattr(
        django_settings, 'BRAND_COMPANY_NAME', f'شرکت {brand_name}'
    )
    tagline = (obj.invoice_tagline or '').strip() or 'سامانه هوشمند معاملات طلا'
    national_id = (obj.invoice_national_id or '').strip()
    address = (obj.invoice_address or '').strip()
    phone = (obj.invoice_phone or '').strip()

    logo_url = None
    if obj.invoice_logo:
        try:
            url = obj.invoice_logo.url
            if request:
                logo_url = request.build_absolute_uri(url)
            else:
                logo_url = url
        except ValueError:
            logo_url = None

    stamp_url = None
    if obj.invoice_stamp:
        try:
            url = obj.invoice_stamp.url
            if request:
                stamp_url = request.build_absolute_uri(url)
            else:
                stamp_url = url
        except ValueError:
            stamp_url = None

    return {
        'brand_name': brand_name,
        'company_name': company_name,
        'national_id': national_id,
        'address': address,
        'phone': phone,
        'tagline': tagline,
        'logo_url': logo_url,
        'has_custom_logo': bool(obj.invoice_logo),
        'stamp_url': stamp_url,
        'has_stamp': bool(obj.invoice_stamp),
    }


def load_invoice_logo_base64() -> str | None:
    """لوگو برای PDF؛ اول آپلود ادمین، بعد فایل env/static"""
    from .models import SystemSettings

    obj = SystemSettings.get_settings()
    if obj.invoice_logo:
        try:
            path = obj.invoice_logo.path
            if os.path.isfile(path):
                with open(path, 'rb') as f:
                    return base64.b64encode(f.read()).decode('utf-8')
        except Exception:
            pass

    brand_invoice_logo = getattr(django_settings, 'BRAND_INVOICE_LOGO', 'brand/OpalBox-mark.png')
    candidates = []
    if os.path.isabs(brand_invoice_logo):
        candidates.append(brand_invoice_logo)
    else:
        candidates.append(os.path.join(django_settings.BASE_DIR, 'static', brand_invoice_logo))
    candidates.extend([
        os.path.join(django_settings.BASE_DIR, 'static', 'brand', 'OpalBox-mark.png'),
        os.path.join(django_settings.BASE_DIR, '..', 'frontend', 'public', 'OpalBox-mark.png'),
    ])
    for candidate in candidates:
        abs_logo = os.path.abspath(candidate)
        if os.path.isfile(abs_logo):
            try:
                with open(abs_logo, 'rb') as logo_file:
                    return base64.b64encode(logo_file.read()).decode('utf-8')
            except Exception:
                continue
    return None


def load_invoice_stamp_base64() -> str | None:
    """مهر / امضای دیجیتال آپلودشده برای PDF (با برش حاشیه و پس‌زمینه شفاف)."""
    from .models import SystemSettings
    from .invoice_stamp import stamp_file_to_png_base64

    obj = SystemSettings.get_settings()
    if not obj.invoice_stamp:
        return None
    try:
        path = obj.invoice_stamp.path
    except Exception:
        return None
    return stamp_file_to_png_base64(path)


def load_invoice_font_base64() -> str | None:
    """فونت فارسی مشترک فاکتورها (معامله و برداشت طلا)"""
    font_paths = [
        os.path.join(django_settings.BASE_DIR, 'static', 'fonts', 'IRANYekanXVF.woff2'),
        os.path.join(django_settings.BASE_DIR, '..', 'frontend', 'fonts', 'IRANYekanXVF.woff2'),
    ]
    for path in font_paths:
        abs_path = os.path.abspath(path)
        if os.path.isfile(abs_path):
            try:
                with open(abs_path, 'rb') as font_file:
                    return base64.b64encode(font_file.read()).decode('utf-8')
            except Exception:
                continue
    return None
