import type { CheckoutWithDetails } from "@/types";
import { Receipt, CheckCircle2, Clock } from "lucide-react";

export function MyPurchasesSection({ checkouts }: { checkouts: CheckoutWithDetails[] }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
      <h2 className="text-base font-semibold text-white flex items-center gap-2">
        <Receipt className="w-4 h-4 text-zinc-400" />
        <span>My Purchases</span>
      </h2>

      {checkouts.length === 0 ? (
        <p className="text-xs text-zinc-500 py-2">Nothing checked out yet.</p>
      ) : (
        <div className="divide-y divide-zinc-800">
          {checkouts.map((checkout) => (
            <div key={checkout.id} className="py-3 flex items-center justify-between gap-3 text-sm">
              <div>
                <p className="font-medium text-white">{checkout.items.map((i) => i.name).join(", ")}</p>
                <p className="text-xs text-zinc-500">{new Date(checkout.created_at).toLocaleDateString("en-US")}</p>
              </div>

              {checkout.is_refunded ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-100 text-black shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Refunded
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                  Pending
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
