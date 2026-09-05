"""
خروجی CSV حسابداری برای دفتر عملیات و حرکت خزانه
"""
from __future__ import annotations

import csv
import io
from datetime import date, datetime, timedelta
from typing import Iterator

from .models import OperationalJournal, VaultMovement
from .services import TreasuryError

MAX_EXPORT_ROWS = 50_000
UTF8_BOM = '\ufeff'


def _date_bounds(date_from: date, date_to: date) -> tuple[datetime, datetime]:
    if date_from > date_to:
        date_from, date_to = date_to, date_from
    start = datetime.combine(date_from, datetime.min.time())
    end = datetime.combine(date_to, datetime.min.time()) + timedelta(days=1)
    return start, end


def _jalali_str(dt) -> str:
    if not dt:
        return ''
    try:
        from jalali_date import datetime2jalali
        return datetime2jalali(dt).strftime('%Y/%m/%d %H:%M')
    except Exception:
        return dt.strftime('%Y-%m-%d %H:%M')


def _iso_str(dt) -> str:
    if not dt:
        return ''
    return dt.strftime('%Y-%m-%d %H:%M:%S')


def _num(value) -> str:
    if value is None:
        return ''
    return format(value, 'f').rstrip('0').rstrip('.') if '.' in format(value, 'f') else str(value)


def _user_name(user) -> str:
    if not user:
        return ''
    name = f'{user.first_name or ""} {user.last_name or ""}'.strip()
    return name


def _csv_line(row: list) -> str:
    buf = io.StringIO()
    writer = csv.writer(buf, lineterminator='\n')
    writer.writerow(row)
    return buf.getvalue()


def journal_queryset(
    *,
    date_from: date,
    date_to: date,
    event_type: str | None = None,
    asset: str | None = None,
):
    start, end = _date_bounds(date_from, date_to)
    qs = OperationalJournal.objects.filter(
        created_at__gte=start,
        created_at__lt=end,
    ).select_related('user').order_by('created_at', 'id')
    if event_type:
        qs = qs.filter(event_type=event_type)
    if asset:
        qs = qs.filter(asset=asset)
    return qs


def vault_queryset(*, date_from: date, date_to: date):
    start, end = _date_bounds(date_from, date_to)
    return (
        VaultMovement.objects.filter(
            created_at__gte=start,
            created_at__lt=end,
        )
        .select_related('created_by')
        .order_by('created_at', 'id')
    )


def assert_export_count(qs, label: str = 'خروجی') -> int:
    count = qs.count()
    if count > MAX_EXPORT_ROWS:
        raise TreasuryError(
            f'تعداد ردیف‌های {label} ({count:,}) از سقف مجاز '
            f'({MAX_EXPORT_ROWS:,}) بیشتر است. بازه تاریخ را کوتاه‌تر کنید.'
        )
    return count


JOURNAL_HEADERS = [
    'شناسه',
    'زمان_میلادی',
    'زمان_شمسی',
    'نوع_رویداد',
    'دارایی',
    'مقدار',
    'قیمت_واحد',
    'مانده_پس_از',
    'موبایل_کاربر',
    'نام_کاربر',
    'نوع_سند',
    'شناسه_سند',
    'یادداشت',
]

VAULT_HEADERS = [
    'شناسه',
    'زمان_میلادی',
    'زمان_شمسی',
    'نوع_حرکت',
    'مقدار',
    'قیمت_واحد',
    'میانگین_قبل',
    'سود_تحقق_یافته',
    'طرف_معامله',
    'یادداشت',
    'ثبت_کننده',
]


def iter_journal_csv(
    *,
    date_from: date,
    date_to: date,
    event_type: str | None = None,
    asset: str | None = None,
) -> Iterator[str]:
    qs = journal_queryset(
        date_from=date_from,
        date_to=date_to,
        event_type=event_type,
        asset=asset,
    )
    yield UTF8_BOM + _csv_line(JOURNAL_HEADERS)
    for row in qs.iterator(chunk_size=500):
        user = row.user
        yield _csv_line([
            row.id,
            _iso_str(row.created_at),
            _jalali_str(row.created_at),
            row.get_event_type_display(),
            row.get_asset_display(),
            _num(row.amount),
            _num(row.unit_price),
            _num(row.balance_after),
            user.phone_number if user else '',
            _user_name(user),
            row.reference_type or '',
            row.reference_id if row.reference_id is not None else '',
            (row.note or '').replace('\r', ' ').replace('\n', ' '),
        ])


def iter_vault_csv(*, date_from: date, date_to: date) -> Iterator[str]:
    qs = vault_queryset(date_from=date_from, date_to=date_to)
    yield UTF8_BOM + _csv_line(VAULT_HEADERS)
    for row in qs.iterator(chunk_size=500):
        creator = row.created_by
        creator_label = ''
        if creator:
            creator_label = _user_name(creator) or (creator.phone_number or '')
        yield _csv_line([
            row.id,
            _iso_str(row.created_at),
            _jalali_str(row.created_at),
            row.get_movement_type_display(),
            _num(row.amount),
            _num(row.unit_price),
            _num(row.avg_cost_before),
            _num(row.realized_inventory_pnl),
            row.counterparty or '',
            (row.note or '').replace('\r', ' ').replace('\n', ' '),
            creator_label,
        ])


def export_filename(kind: str, date_from: date, date_to: date) -> str:
    prefix = 'daftar-amaliyat' if kind == 'journal' else 'harekat-khazane'
    return f'{prefix}-{date_from.isoformat()}-{date_to.isoformat()}.csv'
