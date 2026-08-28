"use client";

import { useState, useTransition } from "react";
import { refundCheckoutAction } from "@/app/actions/checkout";
import type { CheckoutWithDetails } from "@/types";
import { Receipt, RotateCcw, Loader2, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function AdminCheckoutsList({
  kitchenId,
  checkouts,
}: {
  kitchenId: string;
  checkouts: CheckoutWithDetails[];
}) {
  const [list, setList] = useState<CheckoutWithDetails[]>(checkouts);
  const [isPending, startTransition] = useTransition();

  const handleRefund = (checkoutId: string) => {
    startTransition(async () => {
      try {
        await refundCheckoutAction(kitchenId, checkoutId);
        setList((prev) =>
          prev.map((c) => (c.id === checkoutId ? { ...c, is_refunded: true, refunded_at: new Date() } : c))
        );
        toast.success("Checkout marked as refunded!");
      } catch (err: any) {
        toast.error(err.message || "Failed to refund.");
      }
    });
  };

  return (
    <div className="space-y-4">
      {list.length === 0 ? (
        <p className="text-xs text-zinc-500 py-4 text-center">No checkouts yet.</p>
      ) : (
        <div className="divide-y divide-zinc-800">
          {list.map((checkout) => (
            <div key={checkout.id} className="py-4 space-y-3 hover:bg-zinc-800/20 px-2 rounded-xl transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">@{checkout.username || "unknown"}</p>
                  <p className="text-xs text-zinc-500 font-mono mt-0.5">
                    {new Date(checkout.created_at).toLocaleDateString("en-US")} &middot; {checkout.items.length} item{checkout.items.length === 1 ? "" : "s"}
                  </p>
                </div>

                {checkout.is_refunded ? (
                  <Badge variant="success" className="gap-1 font-semibold text-xs py-1 px-3">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Refunded
                  </Badge>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleRefund(checkout.id)}
                    disabled={isPending}
                    className="rounded-lg text-xs font-semibold h-8"
                  >
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RotateCcw className="w-3.5 h-3.5 mr-1" />}
                    <span>Refund</span>
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Receipt className="w-3.5 h-3.5 text-zinc-500" />
                <span>Receipt uploaded: <span className="font-mono text-zinc-300">{checkout.receipt_filename}</span></span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {checkout.items.map((item) => (
                  <Badge key={item.id} variant="secondary" className="text-xs font-normal">
                    {item.name}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

