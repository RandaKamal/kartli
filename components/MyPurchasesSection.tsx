"use client";

import type { CheckoutWithDetails } from "@/types";
import { Receipt, CheckCircle2, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/context/i18n-context";

export function MyPurchasesSection({ checkouts }: { checkouts: CheckoutWithDetails[] }) {
  const { t, lang } = useI18n();

  return (
    <Card className="border border-border bg-card rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
      <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
        <Receipt className="w-4 h-4 text-muted-foreground" />
        <span>{t("refunds.title")}</span>
        <Badge variant="secondary" className="text-xs font-mono">
          {checkouts.length}
        </Badge>
      </h2>

      {checkouts.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">{t("refunds.noHistory")}</p>
      ) : (
        <div className="divide-y divide-border">
          {checkouts.map((checkout) => (
            <div key={checkout.id} className="py-3 flex items-center justify-between gap-3 text-sm hover:bg-muted/40 px-2 rounded-xl transition">
              <div>
                <p className="font-medium text-foreground">{checkout.items.map((i) => i.name).join(", ")}</p>
                {checkout.note && (
                  <p className="text-xs text-muted-foreground italic">&ldquo;{checkout.note}&rdquo;</p>
                )}
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {new Date(checkout.created_at).toLocaleDateString(lang === "de" ? "de-DE" : "en-US")}
                </p>
              </div>

              {checkout.is_refunded ? (
                <Badge variant="success" className="gap-1 font-semibold text-xs py-1 px-2.5 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t("common.refunded")}
                </Badge>
              ) : (
                <Badge variant="pending" className="gap-1 font-semibold text-xs py-1 px-2.5 shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                  {t("common.pending")}
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
