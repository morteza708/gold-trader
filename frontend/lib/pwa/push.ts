/**
 * Web Push helpers — subscribe/unsubscribe + VAPID
 */

import apiClient from "@/lib/api/client";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function fetchVapidPublicKey(): Promise<{
  publicKey: string;
  configured: boolean;
}> {
  const response = await apiClient.get<{ publicKey: string; configured: boolean }>(
    "/notifications/push/vapid-public-key/"
  );
  return response.data;
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  const { publicKey, configured } = await fetchVapidPublicKey();
  if (!configured || !publicKey) {
    throw new Error("VAPID_NOT_CONFIGURED");
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }

  const json = subscription.toJSON();
  await apiClient.post("/notifications/push/subscribe/", {
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    },
  });

  return subscription;
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  try {
    await apiClient.post("/notifications/push/unsubscribe/", { endpoint });
  } catch {
    /* ignore API errors; still unsubscribe locally */
  }
  await subscription.unsubscribe();
}

export async function ensurePushSubscription(): Promise<"subscribed" | "skipped" | "denied"> {
  if (!isPushSupported()) return "skipped";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission !== "granted") return "skipped";

  try {
    await subscribeToPush();
    return "subscribed";
  } catch (e) {
    const err = e as Error;
    if (err.message === "VAPID_NOT_CONFIGURED") return "skipped";
    throw e;
  }
}
