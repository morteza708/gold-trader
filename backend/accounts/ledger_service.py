"""
دفترچه فعالیت یکپارچه کاربر برای پنل ادمین (فقط‌خواندنی).
"""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from jalali_date import datetime2jalali

from trades.models import Trade
from treasury.models import OperationalJournal
from wallet.models import DepositRequest, Wallet, WithdrawalRequest


def _jalali(dt: datetime | None) -> str | None:
    if not dt:
        return None
    return datetime2jalali(dt).strftime('%Y/%m/%d %H:%M')


def build_user_ledger(user, *, limit: int = 100) -> dict:
    wallet, _ = Wallet.objects.get_or_create(user=user)
    events: list[dict] = []

    trades = (
        Trade.objects.filter(user=user)
        .order_by('-created_at')[:limit]
    )
    for t in trades:
        channel = getattr(t, 'channel', 'PLATFORM')
        title = 'خرید طلا' if t.trade_type == 'BUY' else 'فروش طلا'
        if channel == 'MANUAL':
            title = f'{title} (دستی)'
        events.append({
            'kind': 'trade',
            'kind_display': 'معامله',
            'id': t.id,
            'created_at': t.created_at.isoformat(),
            'created_at_jalali': _jalali(t.created_at),
            'title': title,
            'status': t.status,
            'status_display': t.get_status_display() if hasattr(t, 'get_status_display') else t.status,
            'amount_label': f'{t.amount} گرم',
            'money_label': f'{int(t.total):,} ریال',
            'ref_code': t.invoice_number or t.tracking_code,
            'meta': {
                'trade_type': t.trade_type,
                'channel': channel,
                'settlement_mode': getattr(t, 'settlement_mode', None),
            },
        })

    deposits = (
        DepositRequest.objects.filter(user=user)
        .order_by('-created_at')[:limit]
    )
    for d in deposits:
        events.append({
            'kind': 'deposit',
            'kind_display': 'واریز',
            'id': d.id,
            'created_at': d.created_at.isoformat(),
            'created_at_jalali': _jalali(d.created_at),
            'title': 'واریز ریال',
            'status': d.status,
            'status_display': d.get_status_display(),
            'amount_label': None,
            'money_label': f'{int(d.amount):,} ریال',
            'ref_code': d.request_code,
            'meta': {},
        })

    withdrawals = (
        WithdrawalRequest.objects.filter(user=user)
        .order_by('-created_at')[:limit]
    )
    for w in withdrawals:
        is_gold = w.withdrawal_type == 'GOLD'
        events.append({
            'kind': 'withdrawal',
            'kind_display': 'برداشت',
            'id': w.id,
            'created_at': w.created_at.isoformat(),
            'created_at_jalali': _jalali(w.created_at),
            'title': 'برداشت طلا' if is_gold else 'برداشت ریال',
            'status': w.status,
            'status_display': w.get_status_display(),
            'amount_label': f'{w.amount} گرم' if is_gold else None,
            'money_label': None if is_gold else f'{int(w.amount):,} ریال',
            'ref_code': w.request_code,
            'meta': {'withdrawal_type': w.withdrawal_type},
        })

    journals = (
        OperationalJournal.objects.filter(user=user)
        .order_by('-created_at')[:limit]
    )
    for j in journals:
        if j.asset == OperationalJournal.Asset.GOLD:
            amount_label = f'{j.amount} گرم'
            money_label = None
        else:
            amount_label = None
            money_label = f'{int(Decimal(j.amount)):,} ریال'
        events.append({
            'kind': 'journal',
            'kind_display': 'دفتر عملیات',
            'id': j.id,
            'created_at': j.created_at.isoformat(),
            'created_at_jalali': _jalali(j.created_at),
            'title': j.get_event_type_display(),
            'status': j.event_type,
            'status_display': j.get_asset_display(),
            'amount_label': amount_label,
            'money_label': money_label,
            'ref_code': f'{j.reference_type}:{j.reference_id}' if j.reference_type else None,
            'meta': {
                'note': j.note or '',
                'event_type': j.event_type,
                'asset': j.asset,
            },
        })

    events.sort(key=lambda e: e['created_at'] or '', reverse=True)
    events = events[:limit]

    return {
        'user_id': user.id,
        'balances': {
            'rial_balance': int(wallet.rial_balance),
            'gold_balance': str(wallet.gold_balance),
            'available_rial': int(wallet.get_available_rial_balance()),
            'available_gold': str(wallet.get_available_gold_balance()),
            'pending_withdrawal_rial': int(wallet.pending_withdrawal_rial),
            'pending_withdrawal_gold': str(wallet.pending_withdrawal_gold),
            'pending_trade_rial': int(getattr(wallet, 'pending_trade_rial', 0) or 0),
        },
        'events': events,
        'counts': {
            'trades': Trade.objects.filter(user=user).count(),
            'deposits': DepositRequest.objects.filter(user=user).count(),
            'withdrawals': WithdrawalRequest.objects.filter(user=user).count(),
            'journal': OperationalJournal.objects.filter(user=user).count(),
        },
    }
