from datetime import datetime, timedelta
from unittest.mock import patch

from django.test import SimpleTestCase, TestCase, override_settings
from django.utils import timezone

from trades.chart_service import (
    compute_stats,
    downsample_points,
    parse_range,
    build_price_chart,
)
from trades.models import GoldPrice


class ParseRangeTests(SimpleTestCase):
    def test_valid_keys(self):
        self.assertEqual(parse_range('24h'), '24h')
        self.assertEqual(parse_range('7d'), '7d')
        self.assertEqual(parse_range('30d'), '30d')

    def test_days_mapping(self):
        self.assertEqual(parse_range(None, days=1), '24h')
        self.assertEqual(parse_range(None, days=7), '7d')
        self.assertEqual(parse_range(None, days=30), '30d')

    def test_invalid_raises(self):
        with self.assertRaises(ValueError):
            parse_range('1y')


class DownsampleAndStatsTests(SimpleTestCase):
    def test_stats_from_buy_series(self):
        points = [
            {'buy': 100, 'sell': 90},
            {'buy': 140, 'sell': 120},
            {'buy': 120, 'sell': 110},
        ]
        stats = compute_stats(points, 'buy')
        self.assertEqual(stats['open'], 100)
        self.assertEqual(stats['close'], 120)
        self.assertEqual(stats['high'], 140)
        self.assertEqual(stats['low'], 100)
        self.assertEqual(stats['change'], 20)
        self.assertEqual(stats['change_percent'], 20.0)

    def test_bucket_keeps_last_in_window(self):
        start = datetime(2026, 9, 13, 10, 0, 0)
        points = [
            {'t': start.isoformat(), 'buy': 1},
            {'t': (start + timedelta(minutes=5)).isoformat(), 'buy': 2},
            {'t': (start + timedelta(minutes=25)).isoformat(), 'buy': 3},
        ]
        out = downsample_points(points, timedelta(minutes=20))
        self.assertEqual([p['buy'] for p in out], [2, 3])

    def test_caps_max_points_keeps_ends(self):
        start = datetime(2026, 9, 1, 0, 0, 0)
        points = [
            {'t': (start + timedelta(minutes=i)).isoformat(), 'buy': i}
            for i in range(500)
        ]
        out = downsample_points(points, None, max_points=50)
        self.assertEqual(len(out), 50)
        self.assertEqual(out[0]['buy'], 0)
        self.assertEqual(out[-1]['buy'], 499)


@override_settings(CACHES={
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'chart-tests',
    }
})
class BuildPriceChartTests(TestCase):
    def _make_price(self, buy, sell, created_at, source='API', active=False, margin=0):
        row = GoldPrice(
            buy_base_price=buy,
            sell_base_price=sell,
            buy_margin=margin,
            sell_margin=margin,
            is_active=active,
            source=source,
        )
        row.save()
        GoldPrice.objects.filter(pk=row.pk).update(created_at=created_at, is_active=active)
        row.refresh_from_db()
        return row

    def test_anchor_and_now_points(self,):
        now = timezone.now().replace(tzinfo=None) if timezone.is_aware(timezone.now()) else timezone.now()
        with patch('trades.chart_service.timezone.now', return_value=now):
            self._make_price(
                1_000_000, 990_000,
                now - timedelta(hours=30),
                active=False,
            )
            current = self._make_price(
                1_200_000, 1_180_000,
                now - timedelta(hours=2),
                active=True,
            )
            GoldPrice.objects.exclude(pk=current.pk).update(is_active=False)

            data = build_price_chart('24h', use_cache=False)
            buys = [p['buy'] for p in data['series']]
            self.assertGreaterEqual(len(data['series']), 2)
            self.assertEqual(buys[0], 1_000_000)
            self.assertEqual(buys[-1], 1_200_000)
            self.assertEqual(data['stats']['open'], 1_000_000)
            self.assertEqual(data['stats']['close'], 1_200_000)
            self.assertNotIn('source', data['series'][0])

    def test_admin_includes_source_not_margins(self):
        now = timezone.now()
        if getattr(now, 'tzinfo', None):
            now = now.replace(tzinfo=None)
        with patch('trades.chart_service.timezone.now', return_value=now):
            self._make_price(2_000_000, 1_900_000, now - timedelta(hours=1), source='MANUAL', active=True)
            data = build_price_chart('24h', include_source=True, use_cache=False)
            self.assertIn('source', data['series'][-1])
            payload = str(data)
            self.assertNotIn('buy_base_price', payload)
            self.assertNotIn('buy_margin', payload)
