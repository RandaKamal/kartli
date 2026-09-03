"use client";

import { Clock, Flame } from "lucide-react";
import { daysUntilReceiptAutoDelete } from "@/lib/utils";

/**
 * Countdown pill showing days left before a refunded checkout's receipt
 * is auto-deleted by the cleanup cron (30 days after `refunded_at`).
 * Color shifts from calm → warm → critical as the deadline approaches.
 */
export function ReceiptExpiryBadge({
  refundedAt,
  className = "",
}: {
  refundedAt: string | Date;
  className?: string;
}) {
  const days = daysUntilReceiptAutoDelete(refundedAt);
  const urgency = days <= 3 ? "critical" : days <= 7 ? "warning" : "calm";

  const styles = {
    calm: "bg-muted text-muted-foreground border-border",
    warning: "bg-accent-ochre/15 text-accent-warning border-accent-ochre/30",
    critical: "bg-destructive/10 text-destructive border-destructive/30",
  }[urgency];

  const Icon = urgency === "critical" ? Flame : Clock;

  return (
    <span
      title="Time left before this receipt is auto-deleted"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold font-mono tabular-nums ${styles} ${className}`}
    >
      <Icon className="w-3 h-3" />
      <span>{days > 0 ? `${days}d left` : "Deleting today"}</span>
    </span>
  );
}
