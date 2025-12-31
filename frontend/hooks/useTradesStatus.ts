import { useState, useEffect } from 'react';
import { tradesAPI } from '@/lib/api/trades';

export interface TradesStatusData {
  trades_enabled: boolean;
  message: string;
}

export function useTradesStatus(interval = 5000) {
  const [status, setStatus] = useState<TradesStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // دریافت اولیه
    const fetchStatus = async () => {
      try {
        const data = await tradesAPI.getTradesStatus();
        setStatus(data);
        setLoading(false);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.error || 'خطا در دریافت وضعیت معاملات');
        setLoading(false);
      }
    };

    fetchStatus();

    // به‌روزرسانی خودکار هر N ثانیه
    const intervalId = setInterval(fetchStatus, interval);

    // فقط وقتی tab فعال است، polling انجام شود
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
  }, [interval]);

  return { status, loading, error };
}

