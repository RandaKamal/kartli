"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getVapidPublicKey, subscribeToPush, unsubscribeFromPush } from "@/app/actions/push";
import { useTranslation } from "@/lib/i18n";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function NotificationToggle() {
  const { t } = useTranslation();
  const [subscribed, setSubscribed] = useState(false);
  const [supported, setSupported] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupported(false);
      return;
    }
    navigator.serviceWorker.register("/sw.js").then(async (registration) => {
      const existing = await registration.pushManager.getSubscription();
      setSubscribed(!!existing);
    });
  }, []);

  const enable = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error(t.kitchenSettings.notificationsDenied);
        return;
      }
      const publicKey = await getVapidPublicKey();
      if (!publicKey) throw new Error("VAPID_PUBLIC_KEY is not configured on the server.");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = subscription.toJSON();
      await subscribeToPush({
        endpoint: json.endpoint!,
        keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
      });
      setSubscribed(true);
      toast.success(t.kitchenSettings.notificationsEnabled);
    } catch (error) {
      console.error(error);
      toast.error(t.kitchenSettings.notificationsEnableFailed);
    } finally {
      setLoading(false);
    }
  };

  const disable = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeFromPush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      toast.success(t.kitchenSettings.notificationsDisabled);
    } catch (error) {
      console.error(error);
      toast.error(t.kitchenSettings.notificationsDisableFailed);
    } finally {
      setLoading(false);
    }
  };

  if (!supported) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={subscribed ? disable : enable}
      disabled={loading}
      className="rounded-xl text-xs gap-1.5"
    >
      {subscribed ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
      <span>
        {subscribed ? t.kitchenSettings.disableNotifications : t.kitchenSettings.enableNotifications}
      </span>
    </Button>
  );
}
