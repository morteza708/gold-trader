import { useState, useEffect } from 'react';
import { tradesAPI } from '@/lib/api/trades';

export interface GoldPriceData {
  buy: number;
  sell: number;
  trades_enabled: boolean;
  updated_at: string;
  created_at_jalali: string;
  market_change?: number | null;
  market_change_percent?: number | null;
  market_high?: number | null;
  market_low?: number | null;
  market_price_time?: string | null;
  market_symbol_name?: string | null;
}

export function useGoldPrice(interval = 5000) {
  const [prices, setPrices] = useState<GoldPriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // دریافت اولیه
    const fetchPrice = async () => {
      try {
        const data = await tradesAPI.getCurrentPrice();
        setPrices(data);
        setLoading(false);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.error || 'خطا در دریافت قیمت');
        setLoading(false);
      }
    };

    fetchPrice();

    // به‌روزرسانی خودکار هر N ثانیه
    const intervalId = setInterval(fetchPrice, interval);

    // فقط وقتی tab فعال است، polling انجام شود
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchPrice();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [interval]);

  return { prices, loading, error };
}

