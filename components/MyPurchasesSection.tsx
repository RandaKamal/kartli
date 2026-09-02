"use client";

import { useState, useTransition } from "react";
import type { CheckoutWithDetails } from "@/types";
import { formatCurrency, daysUntilReceiptAutoDelete } from "@/lib/utils";
import { deleteReceiptForMemberAction } from "@/app/actions/checkout";
import { Receipt, CheckCircle2, Clock, ChevronDown, ChevronUp, Trash2, Loader2 } from "lucide-react";
import { ReceiptExpiryBadge } from "@/components/ReceiptExpiryBadge";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function MyPurchasesSection({
  kitchenId,
  checkouts: initialCheckouts,
}: {
  kitchenId: string;
  checkouts: CheckoutWithDetails[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [checkoutsList, setCheckoutsList] = useState<CheckoutWithDetails[]>(initialCheckouts);
  const [selectedCheckout, setSelectedCheckout] = useState<CheckoutWithDetails | null>(null);
  const [deletingReceiptId, setDeletingReceiptId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDeleteReceipt = (receiptId: string) => {
    if (!window.confirm("Remove this receipt from your view? This won't delete the admin's copy.")) return;
    setDeletingReceiptId(receiptId);
    startTransition(async () => {
      try {
        await deleteReceiptForMemberAction(kitchenId, receiptId);
        setCheckoutsList((prev) =>
          prev.map((c) => ({ ...c, receipts: c.receipts.filter((r) => r.id !== receiptId) }))
        );
        setSelectedCheckout((prev) =>
          prev ? { ...prev, receipts: prev.receipts.filter((r) => r.id !== receiptId) } : prev
        );
        toast.success("Receipt removed from your view.");
      } catch (err: any) {
        toast.error(err.message || "Failed to delete receipt.");
      } finally {
        setDeletingReceiptId(null);
      }
    });
  };

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
            {checkoutsList.length}
          </Badge>
        </div>

        <div className="p-1 rounded-lg text-muted-foreground group-hover:text-foreground group-hover:bg-muted transition">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isExpanded && (
        <div className="pt-2 animate-in fade-in-50 duration-200">
          {checkoutsList.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 text-center">Nothing checked out yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {checkoutsList.map((checkout) => (
                <div key={checkout.id} className="py-3 flex items-center justify-between gap-3 text-sm hover:bg-muted/40 px-2 rounded-xl transition">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{checkout.items.map((i) => i.name).join(", ")}</p>
                    {checkout.note && (
                      <p className="text-xs text-muted-foreground italic">&ldquo;{checkout.note}&rdquo;</p>
                    )}
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {new Date(checkout.created_at).toLocaleDateString("en-US")} &middot; {formatCurrency(checkout.total_claimed_amount, checkout.currency)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {checkout.receipts.length > 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCheckout(checkout)}
                        className="rounded-xl text-xs font-medium h-8 gap-1.5 border-border hover:bg-secondary"
                      >
                        <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>View{checkout.receipts.length > 1 ? ` (${checkout.receipts.length})` : ""}</span>
                      </Button>
                    ) : checkout.totalReceiptsEverAttached > 0 ? (
                      <Badge variant="secondary" className="rounded-xl text-xs font-normal h-8 px-2.5 bg-muted text-muted-foreground border border-border flex items-center justify-center">
                        Receipt Deleted
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="rounded-xl text-xs font-normal h-8 px-2.5 bg-muted text-muted-foreground border border-border flex items-center justify-center">
                        No Receipt
                      </Badge>
                    )}

                    {checkout.is_refunded ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="success" className="gap-1 font-semibold text-xs py-1 px-2.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Refunded
                        </Badge>
                        {checkout.receipts.length > 0 && checkout.refunded_at && (
                          <ReceiptExpiryBadge refundedAt={checkout.refunded_at} />
                        )}
                      </div>
                    ) : (

                      <Badge variant="pending" className="gap-1 font-semibold text-xs py-1 px-2.5 shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                        Pending Refund
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Receipt viewer / delete modal */}
      <Dialog open={!!selectedCheckout} onOpenChange={(open) => !open && setSelectedCheckout(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-card border border-border p-5 sm:p-6 text-card-foreground rounded-3xl shadow-xl flex flex-col gap-4">
          {selectedCheckout && (
            <>
              <DialogHeader className="space-y-1 text-left">
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  {selectedCheckout.store_name || "Supermarket Receipt"}
                </DialogTitle>
                <p className="text-xs text-muted-foreground font-mono">
                  {new Date(selectedCheckout.created_at).toLocaleDateString("en-US")} &middot; {formatCurrency(selectedCheckout.total_claimed_amount, selectedCheckout.currency)}
                </p>
                {selectedCheckout.is_refunded && selectedCheckout.refunded_at && selectedCheckout.receipts.length > 0 && (
                  <ReceiptExpiryBadge refundedAt={selectedCheckout.refunded_at} className="mt-0.5" />
                )}
              </DialogHeader>

              <div className="space-y-3">
                {selectedCheckout.receipts.map((r) => (
                  <div key={r.id} className="relative rounded-2xl overflow-hidden border border-border bg-muted/30 p-2 sm:p-3 flex items-center justify-center min-h-[220px]">
                    <button
                      type="button"
                      onClick={() => handleDeleteReceipt(r.id)}
                      disabled={deletingReceiptId === r.id}
                      aria-label="Delete this receipt"
                      className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-card/90 border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {deletingReceiptId === r.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <img
                      src={r.receipt_filename}
                      alt={`Receipt for ${selectedCheckout.store_name || "your purchase"}`}
                      className="max-h-[75vh] w-auto max-w-full object-contain rounded-md border border-border shadow-xs"
                    />
                  </div>
                ))}
              </div>

              <DialogFooter className="pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCheckout(null)}
                  className="rounded-xl text-xs h-9 border-border"
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
