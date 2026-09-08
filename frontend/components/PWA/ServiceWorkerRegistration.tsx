"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let cancelled = false;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        if (cancelled) return;

        // چک آپدیت دوره‌ای
        const timer = window.setInterval(() => {
          registration.update().catch(() => undefined);
        }, 60 * 60 * 1000);

        return () => window.clearInterval(timer);
      } catch (error) {
        console.error("Service Worker registration failed:", error);
      }
    };

    void register();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
