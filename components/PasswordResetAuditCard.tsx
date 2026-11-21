"use client";

import { History, ShieldCheck } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import type { PasswordResetAuditEntry } from "@/types";

export function PasswordResetAuditCard({
  entries,
}: {
  entries: PasswordResetAuditEntry[];
}) {
  const { t, locale } = useTranslation();

  const formatDateTime = (value: Date | string) => {
    try {
      return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value));
    } catch {
      return String(value);
    }
  };

  return (
    <Card className="p-6 rounded-2xl border border-border/80 bg-card shadow-sm space-y-4">
      <CardHeader className="p-0 space-y-1">
        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
          <History className="w-5 h-5 text-muted-foreground" />
          <span>{t.settings.resetAuditTitle}</span>
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          {t.settings.resetAuditSubtitle}
        </CardDescription>
      </CardHeader>

      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          {t.settings.resetAuditEmpty}
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const isUsed = Boolean(entry.used_at);
            const isExpired =
              !isUsed && new Date(entry.expires_at).getTime() <= Date.now();
            const statusLabel = isUsed
              ? t.settings.resetAuditStatusUsed
              : isExpired
              ? t.settings.resetAuditStatusExpired
              : t.settings.resetAuditStatusActive;

            const statusBadgeCls = isUsed
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : isExpired
              ? "bg-muted text-muted-foreground border-border/60"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";

            const issuerText = entry.created_by_username
              ? t.settings.resetAuditCreatedBy
                  .replace("{kitchen}", entry.kitchen_name)
                  .replace("{admin}", entry.created_by_username)
              : t.settings.resetAuditCreatedByUnknown.replace(
                  "{kitchen}",
                  entry.kitchen_name
                );

            return (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/20 border border-border/70"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {issuerText}
                    </p>
                    {entry.requires_second_kitchen_check && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border/60">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        {t.settings.resetAuditSecondKitchenRequired}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDateTime(entry.created_at)}
                  </p>
                </div>

                <span
                  className={`shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${statusBadgeCls}`}
                >
                  {statusLabel}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
