"use client";

import { useState, useTransition } from "react";
import { refundCheckoutAction } from "@/app/actions/checkout";
import type { CheckoutWithDetails } from "@/types";
import { Receipt, RotateCcw, Loader2, CheckCircle2 } from "lucide-react";

export function AdminCheckoutsList({
  kitchenId,
  checkouts,
}: {
  kitchenId: string;
  checkouts: CheckoutWithDetails[];
}) {
  const [list, setList] = useState<CheckoutWithDetails[]>(checkouts);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRefund = (checkoutId: string) => {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        await refundCheckoutAction(kitchenId, checkoutId);
        setList((prev) =>
          prev.map((c) => (c.id === checkoutId ? { ...c, is_refunded: true, refunded_at: new Date() } : c))
        );
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to refund.");
      }
    });
  };

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="p-3 bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-xl font-medium">{errorMessage}</div>
      )}

      {list.length === 0 ? (
        <p className="text-xs text-zinc-500 py-4 text-center">No checkouts yet.</p>
      ) : (
        <div className="divide-y divide-zinc-800">
          {list.map((checkout) => (
            <div key={checkout.id} className="py-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">@{checkout.username || "unknown"}</p>
                  <p className="text-xs text-zinc-500">
                    {new Date(checkout.created_at).toLocaleDateString("en-US")} &middot; {checkout.items.length} item{checkout.items.length === 1 ? "" : "s"}
                  </p>
                </div>

                {checkout.is_refunded ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-100 text-black">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Refunded
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRefund(checkout.id)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white disabled:opacity-50 transition"
                  >
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    <span>Refund</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Receipt className="w-3.5 h-3.5" />
                <span>Receipt uploaded: {checkout.receipt_filename}</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {checkout.items.map((item) => (
                  <span key={item.id} className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">
                    {item.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
