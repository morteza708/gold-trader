"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminTradesAPI,
  tradesAPI,
  type ChartRange,
  type PriceChartResponse,
} from "@/lib/api/trades";

export function usePriceChart(
  range: ChartRange,
  options?: { admin?: boolean; interval?: number }
) {
  const admin = options?.admin ?? false;
  const interval = options?.interval ?? 45000;
  const [data, setData] = useState<PriceChartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (signal: { cancelled: boolean }, showLoader: boolean) => {
      if (showLoader) {
        setLoading(true);
        setData(null);
      }
      try {
        const payload = admin
          ? await adminTradesAPI.getPriceHistory(range)
          : await tradesAPI.getPriceChart(range);
        if (signal.cancelled) return;
        setData(payload);
        setError(null);
      } catch (err: unknown) {
        if (signal.cancelled) return;
        const message =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          "خطا در دریافت نمودار قیمت";
        setError(message);
      } finally {
        if (!signal.cancelled) setLoading(false);
      }
    },
    [admin, range]
  );

  useEffect(() => {
    const signal = { cancelled: false };
    load(signal, true);

    const intervalId = setInterval(() => load(signal, false), interval);
    const onVisible = () => {
      if (document.visibilityState === "visible") load(signal, false);
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      signal.cancelled = true;
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load, interval]);

  const refresh = useCallback(() => {
    return load({ cancelled: false }, false);
  }, [load]);

  return { data, loading, error, refresh };
}
