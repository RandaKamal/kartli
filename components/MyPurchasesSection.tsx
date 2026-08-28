import type { CheckoutWithDetails } from "@/types";
import { Receipt, CheckCircle2, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function MyPurchasesSection({ checkouts }: { checkouts: CheckoutWithDetails[] }) {
  return (
    <Card className="border-zinc-800/80 bg-zinc-900/90 rounded-3xl p-6 shadow-sm space-y-4">
      <h2 className="text-base font-semibold text-white flex items-center gap-2">
        <Receipt className="w-4 h-4 text-zinc-400" />
        <span>My Purchases</span>
        <Badge variant="secondary" className="text-xs font-mono">
          {checkouts.length}
        </Badge>
      </h2>

      {checkouts.length === 0 ? (
        <p className="text-xs text-zinc-500 py-2">Nothing checked out yet.</p>
      ) : (
        <div className="divide-y divide-zinc-800">
          {checkouts.map((checkout) => (
            <div key={checkout.id} className="py-3 flex items-center justify-between gap-3 text-sm hover:bg-zinc-800/20 px-2 rounded-xl transition">
              <div>
                <p className="font-medium text-white">{checkout.items.map((i) => i.name).join(", ")}</p>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">{new Date(checkout.created_at).toLocaleDateString("en-US")}</p>
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
    </Card>
  );
}

