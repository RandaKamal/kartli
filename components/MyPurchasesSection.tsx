"use client";

import { useState } from "react";
import type { CheckoutWithDetails } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Receipt, CheckCircle2, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function MyPurchasesSection({ checkouts }: { checkouts: CheckoutWithDetails[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="border border-border bg-card rounded-3xl p-4 sm:p-6 shadow-sm space-y-3 transition-all">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 text-left cursor-pointer group focus:outline-none"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? "Collapse purchases history" : "Expand purchases history"}
      >
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition" />
          <h2 className="text-base font-semibold text-foreground group-hover:text-foreground transition">
            My Purchases
          </h2>
          <Badge variant="secondary" className="text-xs font-mono">
            {checkouts.length}
          </Badge>
        </div>

        <div className="p-1 rounded-lg text-muted-foreground group-hover:text-foreground group-hover:bg-muted transition">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isExpanded && (
        <div className="pt-2 animate-in fade-in-50 duration-200">
          {checkouts.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 text-center">Nothing checked out yet.</p>
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
                      {new Date(checkout.created_at).toLocaleDateString("en-US")} &middot; {formatCurrency(checkout.total_claimed_amount, checkout.currency)}
                      {checkout.receipts.length > 0 && ` · ${checkout.receipts.length} receipt${checkout.receipts.length === 1 ? "" : "s"}`}
                    </p>
                  </div>

                  {checkout.is_refunded ? (
                    <Badge variant="success" className="gap-1 font-semibold text-xs py-1 px-2.5 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Refunded
                    </Badge>
                  ) : (
                    <Badge variant="pending" className="gap-1 font-semibold text-xs py-1 px-2.5 shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      Pending Refund
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
