"""
سری نمودار قیمت معامله از تاریخچهٔ GoldPrice.

نقاط خام فقط هنگام تغییر قیمت ذخیره می‌شوند؛ این سرویس لنگر ابتدای بازه
و نقطهٔ «اکنون» را اضافه می‌کند تا خط در بازه‌های آرام افقی بماند،
سپس برای بازه‌های بلند downsample می‌کند.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Iterable, Optional

from django.core.cache import cache
from django.utils import timezone
from jalali_date import datetime2jalali

CHART_RANGES: dict[str, timedelta] = {
    '24h': timedelta(hours=24),
    '7d': timedelta(days=7),
    '30d': timedelta(days=30),
}

# 24h: تقریباً خام؛ ۷روز و ۳۰روز سطل زمانی
BUCKETS: dict[str, timedelta | None] = {
    '24h': None,
    '7d': timedelta(minutes=20),
    '30d': timedelta(hours=1),
}

MAX_POINTS = 300
CACHE_TTL_SECONDS = 45
CACHE_VERSION = 1
MAX_HISTORY_DAYS = 90
_EPOCH = datetime(2000, 1, 1)

VALID_RANGES = frozenset(CHART_RANGES.keys())


def parse_range(range_key: Optional[str], days: Optional[int] = None) -> str:
    if range_key:
        key = str(range_key).strip().lower()
        if key in CHART_RANGES:
            return key
        raise ValueError('بازه نامعتبر است. مقادیر مجاز: 24h، 7d، 30d')
    if days is not None:
        days = max(1, min(int(days), MAX_HISTORY_DAYS))
        if days <= 1:
            return '24h'
        if days <= 7:
            return '7d'
        return '30d'
    return '24h'


def _to_int(value) -> Optional[int]:
    if value is None:
        return None
    return int(value)


def _jalali_label(dt: datetime) -> str:
    return datetime2jalali(dt).strftime('%Y/%m/%d %H:%M')


def _parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value)


def _cache_key(include_source: bool, range_key: str) -> str:
    kind = 'admin' if include_source else 'user'
    return f'price_chart:v{CACHE_VERSION}:{kind}:{range_key}'


def invalidate_price_chart_cache() -> None:
    try:
        for include_source in (False, True):
            for range_key in CHART_RANGES:
                cache.delete(_cache_key(include_source, range_key))
    except Exception:
        pass


def _point_from_row(row, t: Optional[datetime] = None, include_source: bool = False) -> dict[str, Any]:
    ts = t or row.created_at
    point: dict[str, Any] = {
        't': ts.isoformat(),
        't_jalali': _jalali_label(ts),
        'buy': _to_int(row.buy_final_price),
        'sell': _to_int(row.sell_final_price),
    }
    if include_source:
        point['source'] = row.source
    return point


def downsample_points(
    points: list[dict[str, Any]],
    bucket: Optional[timedelta],
    max_points: int = MAX_POINTS,
) -> list[dict[str, Any]]:
    """آخرین نقطهٔ هر سطل برای خط؛ سپس سقف تعداد نقاط با حفظ ابتدا و انتها."""
    if not points:
        return []

    series = points
    if bucket and bucket.total_seconds() > 0:
        step = bucket.total_seconds()
        grouped: list[dict[str, Any]] = []
        current_key: Optional[int] = None
        current: Optional[dict[str, Any]] = None
        for point in series:
            key = int((_parse_iso(point['t']) - _EPOCH).total_seconds() // step)
            if current_key is None:
                current_key = key
                current = point
            elif key == current_key:
                current = point
            else:
                if current is not None:
                    grouped.append(current)
                current_key = key
                current = point
        if current is not None:
            grouped.append(current)
        series = grouped

    n = len(series)
    if n <= max_points:
        return series

    indexes = {0, n - 1}
    if max_points > 2:
        for i in range(1, max_points - 1):
            indexes.add(round(i * (n - 1) / (max_points - 1)))
    return [series[i] for i in sorted(indexes)]


def compute_stats(points: Iterable[dict[str, Any]], field: str = 'buy') -> dict[str, Any]:
    values = [p[field] for p in points if p.get(field) is not None]
    if not values:
        return {
            'open': None,
            'close': None,
            'high': None,
            'low': None,
            'change': None,
            'change_percent': None,
        }

    open_v = values[0]
    close_v = values[-1]
    change = close_v - open_v
    percent = round((change / open_v) * 100, 3) if open_v else None
    return {
        'open': open_v,
        'close': close_v,
        'high': max(values),
        'low': min(values),
        'change': change,
        'change_percent': percent,
    }


def _safe_cache_get(key: str):
    try:
        return cache.get(key)
    except Exception:
        return None


def _safe_cache_set(key: str, value, timeout: int) -> None:
    try:
        cache.set(key, value, timeout)
    except Exception:
        pass


def build_price_chart(
    range_key: str = '24h',
    *,
    include_source: bool = False,
    use_cache: bool = True,
) -> dict[str, Any]:
    range_key = parse_range(range_key)
    key = _cache_key(include_source, range_key)
    if use_cache:
        cached = _safe_cache_get(key)
        if cached is not None:
            return cached

    from .models import GoldPrice

    now = timezone.now()
    if now.tzinfo is not None:
        now = now.replace(tzinfo=None)

    start = now - CHART_RANGES[range_key]
    fields = ('created_at', 'buy_final_price', 'sell_final_price', 'source')

    current = GoldPrice.get_current_price()
    in_range = list(
        GoldPrice.objects.filter(created_at__gte=start)
        .only(*fields)
        .order_by('created_at')
    )
    anchor = (
        GoldPrice.objects.filter(created_at__lt=start)
        .only(*fields)
        .order_by('-created_at')
        .first()
    )

    raw: list[dict[str, Any]] = []
    if anchor is not None:
        raw.append(_point_from_row(anchor, t=start, include_source=include_source))

    for row in in_range:
        raw.append(_point_from_row(row, include_source=include_source))

    if current is not None:
        now_point = _point_from_row(current, t=now, include_source=include_source)
        if not raw:
            raw.append(now_point)
        else:
            last_ts = _parse_iso(raw[-1]['t'])
            if abs((now - last_ts).total_seconds()) > 5:
                raw.append(now_point)

    stats = compute_stats(raw, 'buy')
    series = downsample_points(raw, BUCKETS[range_key])

    payload = {
        'range': range_key,
        'generated_at': now.isoformat(),
        'label': 'قیمت معامله در اپال‌باکس',
        'series': series,
        'stats': stats,
    }
    _safe_cache_set(key, payload, CACHE_TTL_SECONDS)
    return payload
