"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";

type PushState = "loading" | "unsupported" | "denied" | "prompt" | "subscribed";

export function PushNotifications() {
  const [state, setState] = useState<PushState>("loading");

  const subscribe = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      await registration.update();

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.error("VAPID public key not configured");
        return;
      }

      // Convert VAPID key to Uint8Array
      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding)
          .replace(/-/g, "+")
          .replace(/_/g, "/");
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      };

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // Send subscription to server
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (res.ok) {
        setState("subscribed");
      }
    } catch (err) {
      console.error("Push subscription error:", err);
    }
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }

    // Check current permission state
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    if (Notification.permission === "granted") {
      // Check if already subscribed
      navigator.serviceWorker.ready.then(async (registration) => {
        const existing = await registration.pushManager.getSubscription();
        if (existing) {
          // Re-send subscription to server (in case server restarted and lost in-memory store)
          try {
            await fetch("/api/push/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ subscription: existing.toJSON() }),
            });
          } catch {
            // ignore
          }
          setState("subscribed");
        } else {
          setState("prompt");
        }
      });
      return;
    }

    setState("prompt");
  }, []);

  const handleClick = async () => {
    if (state === "subscribed") {
      // Send a test notification
      try {
        await fetch("/api/push/test", { method: "POST" });
      } catch {
        // ignore
      }
      return;
    }

    if (state === "prompt") {
      await subscribe();
    }
  };

  // Don't render if unsupported
  if (state === "unsupported" || state === "loading") {
    return null;
  }

  return (
    <button
      onClick={handleClick}
      className="relative flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
      title={
        state === "subscribed"
          ? "Уведомления включены (нажмите для теста)"
          : state === "denied"
            ? "Уведомления заблокированы в браузере"
            : "Включить уведомления"
      }
    >
      {state === "subscribed" ? (
        <BellRing className="h-4 w-4 text-indigo-400" />
      ) : state === "denied" ? (
        <BellOff className="h-4 w-4" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
    </button>
  );
}
