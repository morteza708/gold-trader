"""
Support Hub — وضعیت آنلاین/آفلاین و لینک‌های تماس
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Any

from django.conf import settings as django_settings
from django.utils import timezone

DAY_ORDER = ('sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri')
DAY_LABELS_FA = {
    'sat': 'شنبه',
    'sun': 'یکشنبه',
    'mon': 'دوشنبه',
    'tue': 'سه‌شنبه',
    'wed': 'چهارشنبه',
    'thu': 'پنجشنبه',
    'fri': 'جمعه',
}
WEEKDAY_TO_KEY = {
    5: 'sat',
    6: 'sun',
    0: 'mon',
    1: 'tue',
    2: 'wed',
    3: 'thu',
    4: 'fri',
}


from .defaults import default_support_hours


def get_local_now() -> datetime:
    """زمان محلی — سازگار با USE_TZ=True و USE_TZ=False"""
    if django_settings.USE_TZ:
        return timezone.localtime(timezone.now())
    return datetime.now()


def persian_to_english_numbers(text: str) -> str:
    persian_digits = '۰۱۲۳۴۵۶۷۸۹'
    arabic_digits = '٠١٢٣٤٥٦٧٨٩'
    english_digits = '0123456789'
    for i in range(10):
        text = text.replace(persian_digits[i], english_digits[i])
        text = text.replace(arabic_digits[i], english_digits[i])
    return text


def parse_hhmm(value: str) -> tuple[int, int] | None:
    if not value or not re.match(r'^\d{2}:\d{2}$', value):
        return None
    hour, minute = map(int, value.split(':'))
    if hour > 23 or minute > 59:
        return None
    return hour, minute


def merge_support_hours(raw: dict | None) -> dict[str, dict[str, Any]]:
    base = default_support_hours()
    if not isinstance(raw, dict):
        return base
    merged = {}
    for day in DAY_ORDER:
        entry = raw.get(day) if isinstance(raw.get(day), dict) else {}
        start = entry.get('start', base[day]['start'])
        end = entry.get('end', base[day]['end'])
        merged[day] = {
            'enabled': bool(entry.get('enabled', base[day]['enabled'])),
            'start': start if parse_hhmm(start) else base[day]['start'],
            'end': end if parse_hhmm(end) else base[day]['end'],
        }
    return merged


def normalize_phone(value: str | None) -> str:
    if not value:
        return ''
    value = persian_to_english_numbers(str(value))
    return re.sub(r'\s+|-', '', value).strip()


def normalize_telegram_username(value: str | None) -> str:
    if not value:
        return ''
    username = str(value).strip().lstrip('@')
    return re.sub(r'[^a-zA-Z0-9_]', '', username)


def _day_key(dt: datetime) -> str:
    return WEEKDAY_TO_KEY[dt.weekday()]


def _is_within_slot(now: datetime, slot: dict[str, Any]) -> bool:
    if not slot.get('enabled'):
        return False
    start = parse_hhmm(slot.get('start', ''))
    end = parse_hhmm(slot.get('end', ''))
    if not start or not end:
        return False
    current = now.hour * 60 + now.minute
    start_min = start[0] * 60 + start[1]
    end_min = end[0] * 60 + end[1]
    if end_min <= start_min:
        return current >= start_min or current < end_min
    return start_min <= current < end_min


def compute_support_online(settings, now: datetime | None = None) -> bool:
    if not settings.support_enabled:
        return False
    if not settings.support_hours_enabled:
        return True
    now = now if now is not None else get_local_now()
    schedule = merge_support_hours(settings.support_hours)
    return _is_within_slot(now, schedule.get(_day_key(now), {}))


def _next_open_datetime(now: datetime, schedule: dict[str, dict[str, Any]]) -> datetime | None:
    for offset in range(0, 8):
        candidate_day = now + timedelta(days=offset)
        key = _day_key(candidate_day)
        slot = schedule.get(key, {})
        if not slot.get('enabled'):
            continue
        start = parse_hhmm(slot.get('start', ''))
        if not start:
            continue
        open_at = candidate_day.replace(hour=start[0], minute=start[1], second=0, microsecond=0)
        if offset == 0 and open_at <= now:
            if _is_within_slot(now, slot):
                return None
            end = parse_hhmm(slot.get('end', ''))
            if end:
                end_min = end[0] * 60 + end[1]
                now_min = now.hour * 60 + now.minute
                if now_min < end_min:
                    return None
            continue
        if open_at > now:
            return open_at
    return None


def format_hours_summary(schedule: dict[str, dict[str, Any]]) -> list[dict[str, str]]:
    rows = []
    for day in DAY_ORDER:
        slot = schedule.get(day, {})
        if not slot.get('enabled'):
            rows.append({
                'day': day,
                'day_label': DAY_LABELS_FA[day],
                'hours_label': 'تعطیل',
            })
        else:
            rows.append({
                'day': day,
                'day_label': DAY_LABELS_FA[day],
                'hours_label': f"{slot.get('start', '')} – {slot.get('end', '')}",
            })
    return rows


def build_whatsapp_url(phone: str) -> str | None:
    phone = normalize_phone(phone)
    if re.match(r'^09\d{9}$', phone):
        return f'https://wa.me/98{phone[1:]}'
    if re.match(r'^989\d{9}$', phone):
        return f'https://wa.me/{phone}'
    return None


def build_telegram_url(username: str) -> str | None:
    username = normalize_telegram_username(username)
    if username:
        return f'https://t.me/{username}'
    return None


def build_tel_url(phone: str) -> str | None:
    phone = normalize_phone(phone)
    if phone:
        return f'tel:{phone}'
    return None


def build_mailto_url(email: str) -> str | None:
    email = (email or '').strip()
    if email:
        return f'mailto:{email}'
    return None


def build_public_support_info(settings, now: datetime | None = None) -> dict[str, Any]:
    now = now if now is not None else get_local_now()
    schedule = merge_support_hours(settings.support_hours)
    is_online = compute_support_online(settings, now)
    next_open = None if is_online else _next_open_datetime(now, schedule)

    phone = normalize_phone(settings.support_phone)
    phone_secondary = normalize_phone(settings.support_phone_secondary)
    landline = normalize_phone(settings.support_landline)
    whatsapp = normalize_phone(settings.whatsapp_number)
    telegram = normalize_telegram_username(settings.telegram_username)
    email = (settings.support_email or '').strip()

    channels = []
    if phone:
        channels.append({
            'type': 'phone',
            'label': 'تماس با پشتیبانی',
            'value': phone,
            'url': build_tel_url(phone),
        })
    if phone_secondary:
        channels.append({
            'type': 'phone_secondary',
            'label': 'خط دوم پشتیبانی',
            'value': phone_secondary,
            'url': build_tel_url(phone_secondary),
        })
    if landline:
        channels.append({
            'type': 'landline',
            'label': 'تلفن ثابت',
            'value': landline,
            'url': build_tel_url(landline),
        })
    wa_url = build_whatsapp_url(whatsapp or phone)
    if wa_url:
        channels.append({
            'type': 'whatsapp',
            'label': 'واتساپ',
            'value': whatsapp or phone,
            'url': wa_url,
        })
    tg_url = build_telegram_url(telegram)
    if tg_url:
        channels.append({
            'type': 'telegram',
            'label': 'تلگرام',
            'value': f'@{telegram}',
            'url': tg_url,
        })
    mail_url = build_mailto_url(email)
    if mail_url:
        channels.append({
            'type': 'email',
            'label': 'ایمیل',
            'value': email,
            'url': mail_url,
        })

    default_offline = (
        'در حال حاضر خارج از ساعات پاسخگویی هستیم. '
        'لطفاً در ساعات کاری مجدداً تماس بگیرید.'
    )
    default_online = 'تیم پشتیبانی آماده پاسخگویی به شماست.'

    return {
        'enabled': bool(settings.support_enabled),
        'is_online': is_online,
        'hours_enabled': bool(settings.support_hours_enabled),
        'show_floating_button': bool(settings.support_show_floating_button),
        'show_on_public_site': bool(settings.support_show_on_public_site),
        'status_label': 'آنلاین' if is_online else 'آفلاین',
        'message': (
            (settings.support_online_message or default_online).strip()
            if is_online
            else (settings.support_offline_message or default_offline).strip()
        ),
        'hours_summary': format_hours_summary(schedule),
        'next_open_at': next_open.isoformat() if next_open else None,
        'next_open_label': (
            next_open.strftime('%Y/%m/%d %H:%M') if next_open else None
        ),
        'channels': channels,
        'has_any_channel': len(channels) > 0,
    }
