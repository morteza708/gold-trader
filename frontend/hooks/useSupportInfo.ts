"use client";

import { useCallback, useEffect, useState } from "react";
import { supportAPI, SupportInfo } from "@/lib/api/support";

const EMPTY: SupportInfo = {
  enabled: false,
  is_online: false,
  hours_enabled: false,
  show_floating_button: false,
  show_on_public_site: false,
  status_label: "آفلاین",
  message: "",
  hours_summary: [],
  next_open_at: null,
  next_open_label: null,
  channels: [],
  has_any_channel: false,
};

export function useSupportInfo(options?: { pollMs?: number; enabled?: boolean }) {
  const pollMs = options?.pollMs ?? 60000;
  const hookEnabled = options?.enabled ?? true;
  const [info, setInfo] = useState<SupportInfo>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (silent = false) => {
    if (!hookEnabled) return;
    if (!silent) setLoading(true);
    try {
      const data = await supportAPI.getInfo();
      setInfo(data);
      setError(null);
    } catch {
      setError("بارگذاری اطلاعات پشتیبانی ناموفق بود");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [hookEnabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!hookEnabled || pollMs <= 0) return;
    const id = setInterval(() => refresh(true), pollMs);
    return () => clearInterval(id);
  }, [hookEnabled, pollMs, refresh]);

  return { info, loading, error, refresh };
}
