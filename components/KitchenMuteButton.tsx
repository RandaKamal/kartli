"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, BellOff } from "lucide-react";
import { setKitchenMutedAction } from "@/app/actions/push";
import type { PushStatus } from "@/components/NotificationToggle";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const buttonClass =
  "relative z-10 h-7 w-7 rounded-md flex items-center justify-center shrink-0 transition-colors cursor-pointer text-muted-foreground hover:text-foreground hover:bg-secondary/60 disabled:opacity-50 disabled:cursor-default";

export function KitchenMuteButton({
  kitchenId,
  initialMuted,
  pushStatus,
}: {
  kitchenId: string;
  initialMuted: boolean;
  pushStatus: PushStatus;
}) {
  const { t } = useTranslation();
  const [muted, setMuted] = useState(initialMuted);
  const [saving, setSaving] = useState(false);

  // Push is off on this device: every kitchen reads as muted, and a click goes to set it up.
  if (pushStatus === "off" || pushStatus === "unsupported") {
    return (
      <Link
        href="/profile?tab=preferences#notifications"
        title={t.dashboard.notificationsOffHint}
        aria-label={t.dashboard.notificationsOffHint}
        className={buttonClass}
      >
        <BellOff className="w-3.5 h-3.5" />
      </Link>
    );
  }

  const toggle = async () => {
    const next = !muted;
    setMuted(next);
    setSaving(true);
    try {
      await setKitchenMutedAction(kitchenId, next);
      toast.success(next ? t.dashboard.kitchenMuted : t.dashboard.kitchenUnmuted);
    } catch {
      setMuted(!next);
      toast.error(t.dashboard.muteFailed);
    } finally {
      setSaving(false);
    }
  };

  const label = muted ? t.dashboard.unmuteKitchen : t.dashboard.muteKitchen;
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saving || pushStatus === "checking"}
      title={label}
      aria-label={label}
      aria-pressed={muted}
      className={cn(buttonClass, !muted && pushStatus === "on" && "text-foreground")}
    >
      {muted ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
    </button>
  );
}
