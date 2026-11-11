"use client";

import { useState, useEffect, useTransition } from "react";
import type { CheckoutWithDetails } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { deleteReceiptForMemberAction, getMyCheckoutsAction } from "@/app/actions/checkout";
import { Receipt, ChevronDown, ChevronUp, Trash2, Loader2 } from "lucide-react";
import { ReceiptExpiryBadge } from "@/components/ReceiptExpiryBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

export function MyPurchasesSkeleton() {
  return (
    <div className="border-t border-white/[0.06] py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className="h-4 w-28 rounded-md" />
        <Skeleton className="h-4 w-6 rounded-full" />
      </div>
      <Skeleton className="w-4 h-4 rounded" />
    </div>
  );
}

export function MyPurchasesSection({
  kitchenId,
  checkouts: initialCheckouts,
}: {
  kitchenId: string;
  checkouts?: CheckoutWithDetails[];
}) {
  const { t, locale } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasFetched, setHasFetched] = useState(initialCheckouts !== undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutsList, setCheckoutsList] = useState<CheckoutWithDetails[]>(initialCheckouts || []);
  const [selectedCheckout, setSelectedCheckout] = useState<CheckoutWithDetails | null>(null);
  const [deletingReceiptId, setDeletingReceiptId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const dateLocale = locale === "de" ? "de-DE" : "en-US";

  useEffect(() => {
    if (initialCheckouts !== undefined) {
      setCheckoutsList(initialCheckouts);
      setHasFetched(true);
      setIsLoading(false);
    }
  }, [initialCheckouts]);

  const handleToggleExpand = () => {
    const nextExpanded = !isExpanded;
    setIsExpanded(nextExpanded);

    if (nextExpanded && !hasFetched) {
      setIsLoading(true);
      getMyCheckoutsAction(kitchenId)
        .then((data) => {
          setCheckoutsList(data);
          setHasFetched(true);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load user purchases:", err);
          setIsLoading(false);
        });
    }
  };

  const handleDeleteReceipt = (receiptId: string) => {
    if (!window.confirm(t.kitchen.ledger.deleteReceiptMemberConfirm)) return;
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
        toast.success(t.kitchen.ledger.receiptRemoved);
      } catch (err: any) {
        toast.error(err.message || "Failed to delete receipt.");
      } finally {
        setDeletingReceiptId(null);
      }
    });
  };

  return (
    <div className="border-t border-white/[0.06]">
      <button
        type="button"
        onClick={handleToggleExpand}
        className="w-full flex items-center justify-between gap-2 py-3.5 text-left cursor-pointer group focus:outline-none"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? t.kitchen.ledger.myPurchasesCollapse : t.kitchen.ledger.myPurchasesExpand}
      >
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
          <span className="text-sm font-medium text-foreground">
            {t.kitchen.ledger.myPurchases}
          </span>
          {hasFetched && (
            <span className="text-xs tabular-nums text-zinc-500">
              {checkoutsList.length}
            </span>
          )}
        </div>

        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
        )}
      </button>

      {isExpanded && (
        <div className="pb-2 animate-in fade-in-50 duration-200">
          {isLoading ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ) : checkoutsList.length === 0 ? (
            <p className="text-xs text-zinc-500 py-3 text-center">{t.kitchen.ledger.nothingCheckedOut}</p>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {checkoutsList.map((checkout) => {
                const itemNames = checkout.items.map((i) => i.name).join(", ");

                return (
                  <div key={checkout.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-foreground truncate">{itemNames}</p>
                      <p className="text-xs text-zinc-500 truncate tabular-nums">
                        {new Date(checkout.created_at).toLocaleDateString(dateLocale, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        <span> · {formatCurrency(checkout.total_claimed_amount, checkout.currency)}</span>
                      </p>
                      {checkout.note && (
                        <p className="text-xs text-zinc-400 truncate">&ldquo;{checkout.note}&rdquo;</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      {checkout.receipts.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSelectedCheckout(checkout)}
                          aria-label={t.kitchen.ledger.viewReceipt}
                          title={t.kitchen.ledger.viewReceipt}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-zinc-500 hover:text-foreground hover:bg-white/[0.06] transition-colors cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-[11px] text-zinc-600">
                          {checkout.totalReceiptsEverAttached > 0
                            ? t.kitchen.ledger.receiptDeleted
                            : t.kitchen.ledger.noReceipt}
                        </span>
                      )}

                      {checkout.is_refunded ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 shrink-0" />
                            {t.kitchen.ledger.refunded}
                          </span>
                          {checkout.receipts.length > 0 && checkout.refunded_at && (
                            <ReceiptExpiryBadge refundedAt={checkout.refunded_at} />
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400 whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          {t.kitchen.ledger.pendingRefund}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Receipt viewer / delete modal */}
      <Dialog open={!!selectedCheckout} onOpenChange={(open) => !open && setSelectedCheckout(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-card border border-white/[0.08] p-5 sm:p-6 text-card-foreground rounded-2xl shadow-2xl flex flex-col gap-4">
          {selectedCheckout && (
            <>
              <DialogHeader className="space-y-1 text-left">
                <DialogTitle className="text-base font-semibold text-foreground">
                  {selectedCheckout.store_name || "Supermarket Receipt"}
                </DialogTitle>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {new Date(selectedCheckout.created_at).toLocaleDateString(dateLocale, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  <span> · {formatCurrency(selectedCheckout.total_claimed_amount, selectedCheckout.currency)}</span>
                </p>
                {selectedCheckout.is_refunded && selectedCheckout.refunded_at && selectedCheckout.receipts.length > 0 && (
                  <ReceiptExpiryBadge refundedAt={selectedCheckout.refunded_at} className="mt-0.5" />
                )}
              </DialogHeader>

              <div className="space-y-3">
                {selectedCheckout.receipts.map((r) => (
                  <div key={r.id} className="relative rounded-xl overflow-hidden border border-white/[0.06] bg-zinc-900/40 p-2 sm:p-3 flex items-center justify-center min-h-[220px]">
                    <button
                      type="button"
                      onClick={() => handleDeleteReceipt(r.id)}
                      disabled={deletingReceiptId === r.id}
                      aria-label={t.kitchen.ledger.deleteReceipt}
                      className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-card/90 border border-white/[0.08] text-zinc-500 hover:text-destructive hover:border-destructive/40 transition shadow-sm cursor-pointer disabled:opacity-50"
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
                      className="max-h-[75vh] w-auto max-w-full object-contain rounded-md border border-white/[0.06]"
                    />
                  </div>
                ))}
              </div>

              <DialogFooter className="pt-3 border-t border-white/[0.06]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCheckout(null)}
                  className="rounded-lg text-xs h-8 px-3"
                >
                  {t.common.close}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
