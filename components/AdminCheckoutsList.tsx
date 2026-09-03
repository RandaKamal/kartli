"use client";

import { useState, useTransition } from "react";
import { refundCheckoutAction } from "@/app/actions/checkout";
import type { CheckoutWithDetails } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Receipt, RotateCcw, Loader2, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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

  const [selectedCheckout, setSelectedCheckout] = useState<CheckoutWithDetails | null>(null);

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
        <p className="text-xs text-muted-foreground py-4 text-center">No checkouts yet.</p>
      ) : (
        <div className="divide-y divide-border">
          {list.map((checkout) => (
            <div key={checkout.id} className="py-4 space-y-3 hover:bg-muted/40 px-2 rounded-xl transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">@{checkout.username || "unknown"}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {new Date(checkout.created_at).toLocaleDateString("en-US")} &middot; {checkout.items.length} item{checkout.items.length === 1 ? "" : "s"} &middot; {formatCurrency(checkout.total_claimed_amount, checkout.currency)}
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

              <div className="flex items-center justify-between gap-2">
                {checkout.receipt_filename ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCheckout(checkout)}
                    className="rounded-xl text-xs font-medium h-8 gap-1.5 border-border hover:bg-secondary"
                  >
                    <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>View Receipt</span>
                  </Button>
                ) : (
                  <Badge variant="secondary" className="rounded-xl text-xs font-normal h-8 px-2.5 bg-muted text-muted-foreground border border-border">
                    No Receipt
                  </Badge>
                )}
              </div>

              {checkout.note && (
                <p className="text-xs text-muted-foreground italic">&ldquo;{checkout.note}&rdquo;</p>
              )}

              <div className="flex flex-wrap gap-1.5">
                {checkout.items.map((item) => (
                  <Badge key={item.id} variant="secondary" className="text-xs font-normal flex items-center gap-1">
                    <span>{item.name}</span>
                    {item.item_price != null && (
                      <span className="font-mono text-[10px] text-muted-foreground">
                        ({formatCurrency(item.item_price, item.currency || checkout.currency)})
                      </span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full-res preview dialog */}
      <Dialog open={!!selectedCheckout} onOpenChange={(open) => !open && setSelectedCheckout(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-card border border-border p-5 text-card-foreground rounded-3xl shadow-xl flex flex-col gap-4">
          {selectedCheckout && (
            <>
              <DialogHeader className="text-left space-y-1">
                <DialogTitle className="text-base font-bold text-foreground">
                  {selectedCheckout.store_name || "Supermarket Receipt"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Submitted by @{selectedCheckout.username || "unknown"} on {new Date(selectedCheckout.created_at).toLocaleDateString("en-US")} &middot; Claimed: {formatCurrency(selectedCheckout.total_claimed_amount, selectedCheckout.currency)}
                </DialogDescription>
              </DialogHeader>

              {selectedCheckout.note && (
                <p className="text-xs text-foreground italic bg-muted/40 p-2.5 rounded-xl border border-border">&ldquo;{selectedCheckout.note}&rdquo;</p>
              )}

              {selectedCheckout.receipt_filename ? (
                <div className="relative rounded-2xl overflow-hidden border border-border bg-muted/30 p-2 flex items-center justify-center">
                  <img
                    src={
                      selectedCheckout.receipt_filename.startsWith("/")
                        ? selectedCheckout.receipt_filename
                        : `/uploads/receipts/${selectedCheckout.receipt_filename}`
                    }
                    alt="Receipt"
                    className="max-h-[75vh] w-auto max-w-full object-contain rounded-md border border-border shadow-xs"
                  />
                </div>
              ) : (
                <div className="p-6 rounded-2xl border border-dashed border-border bg-muted/20 text-center text-xs text-muted-foreground">
                  No receipt image attached
                </div>
              )}

              <DialogFooter className="pt-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setSelectedCheckout(null)} className="rounded-xl text-xs">
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

