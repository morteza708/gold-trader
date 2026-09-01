import { useState, useEffect, useCallback } from 'react';
import { tradesAPI, adminTradesAPI } from '@/lib/api/trades';
import type { MarketStatusData } from '@/lib/utils/marketStatus';

export type TradesStatusData = MarketStatusData;

export function useTradesStatus(interval = 5000, admin = false) {
  const [status, setStatus] = useState<TradesStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = admin
        ? await adminTradesAPI.getTradesStatus()
        : await tradesAPI.getTradesStatus();
      setStatus(data);
      setLoading(false);
      setError(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'خطا در دریافت وضعیت بازار');
      setLoading(false);
    }
  }, [admin]);

  useEffect(() => {
    fetchStatus();
    const intervalId = setInterval(fetchStatus, interval);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [interval, fetchStatus]);

  return { status, loading, error, refresh: fetchStatus };
}
