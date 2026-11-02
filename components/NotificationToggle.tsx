"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
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

/** Push state of *this* browser/device; the subscription lives in the browser, not the account. */
export type PushStatus = "checking" | "unsupported" | "off" | "on";

export interface PushNotifications {
  status: PushStatus;
  loading: boolean;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
}

export function usePushNotifications(): PushNotifications {
  const { t } = useTranslation();
  const [status, setStatus] = useState<PushStatus>("checking");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => registration.pushManager.getSubscription())
      .then((existing) => setStatus(existing ? "on" : "off"))
      .catch(() => setStatus("off"));
  }, []);

  const enable = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error(t.profile.notificationsDenied);
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
      setStatus("on");
      toast.success(t.profile.notificationsEnabled);
    } catch (error) {
      console.error(error);
      toast.error(t.profile.notificationsEnableFailed);
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
      setStatus("off");
      toast.success(t.profile.notificationsDisabled);
    } catch (error) {
      console.error(error);
      toast.error(t.profile.notificationsDisableFailed);
    } finally {
      setLoading(false);
    }
  };

  return { status, loading, enable, disable };
}

export function NotificationToggle({ push }: { push: PushNotifications }) {
  const { t } = useTranslation();
  if (push.status === "unsupported") return null;

  const isOn = push.status === "on";
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={isOn ? push.disable : push.enable}
      disabled={push.loading || push.status === "checking"}
      className="rounded-xl text-xs gap-1.5"
    >
      {push.loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : isOn ? (
        <BellOff className="w-3.5 h-3.5" />
      ) : (
        <Bell className="w-3.5 h-3.5" />
      )}
      <span>{isOn ? t.profile.disableNotifications : t.profile.enableNotifications}</span>
    </Button>
  );
}
