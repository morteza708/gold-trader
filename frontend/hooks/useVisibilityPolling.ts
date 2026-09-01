import { useEffect, useRef, useCallback } from "react";

type UseVisibilityPollingOptions = {
  /** فاصله polling به میلی‌ثانیه */
  interval?: number;
  /** فعال/غیرفعال */
  enabled?: boolean;
  /** وقتی تب مرورگر مخفی است درخواست نزن */
  pauseWhenHidden?: boolean;
};

/**
 * polling سبک: فقط وقتی تب visible است + refresh فوری هنگام focus/visibility
 */
export function useVisibilityPolling(
  callback: () => void | Promise<void>,
  {
    interval = 20000,
    enabled = true,
    pauseWhenHidden = true,
  }: UseVisibilityPollingOptions = {}
) {
  const callbackRef = useRef(callback);
  const inFlightRef = useRef(false);

  callbackRef.current = callback;

  const run = useCallback(async () => {
    if (inFlightRef.current) return;
    if (pauseWhenHidden && typeof document !== "undefined" && document.visibilityState !== "visible") {
      return;
    }
    inFlightRef.current = true;
    try {
      await callbackRef.current();
    } catch {
      // خطا در سطح caller مدیریت می‌شود
    } finally {
      inFlightRef.current = false;
    }
  }, [pauseWhenHidden]);

  useEffect(() => {
    if (!enabled) return;

    run();

    const intervalId = window.setInterval(run, interval);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        run();
      }
    };
    const onFocus = () => run();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled, interval, run]);
}
