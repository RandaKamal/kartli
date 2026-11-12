"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CheckoutWithDetails } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";
import { deleteReceiptForMemberAction, getMyCheckoutsAction } from "@/app/actions/checkout";
import { Receipt, ChevronDown, ChevronUp, Trash2, Loader2, XCircle } from "lucide-react";
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
    <div className="border-t border-border py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className="h-4 w-28 rounded-md" />
        <Skeleton className="h-4 w-6 rounded-full" />
      </div>
      <Skeleton className="w-4 h-4 rounded" />
    </div>
  );
}

export interface MyPurchasesSectionProps {
  kitchenId: string;
  checkouts?: CheckoutWithDetails[];
  defaultExpanded?: boolean;
  /** Render the purchase list directly, without the accordion header. */
  standalone?: boolean;
  onReceiptDeleted?: (receiptId: string) => void;
}

export function MyPurchasesSection({
  kitchenId,
  checkouts: initialCheckouts,
  defaultExpanded = false,
  standalone = false,
  onReceiptDeleted,
}: MyPurchasesSectionProps) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
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
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    getMyCheckoutsAction(kitchenId)
      .then((data) => {
        if (isMounted) {
          setCheckoutsList(data);
          setHasFetched(true);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load user purchases:", err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [kitchenId, initialCheckouts]);

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
        onReceiptDeleted?.(receiptId);
        toast.success(t.kitchen.ledger.receiptRemoved);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete receipt.");
      } finally {
        setDeletingReceiptId(null);
      }
    });
  };

  return (
    <div className={standalone ? "" : "border-t border-border"}>
      {!standalone && (
        <button
          type="button"
          onClick={handleToggleExpand}
          className="w-full flex items-center justify-between gap-2 py-3.5 text-left cursor-pointer group focus:outline-none"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? t.kitchen.ledger.myPurchasesCollapse : t.kitchen.ledger.myPurchasesExpand}
        >
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="text-sm font-medium text-foreground">
              {t.kitchen.ledger.myPurchases}
            </span>
            {hasFetched && (
              <span className="text-xs tabular-nums text-muted-foreground">
                {checkoutsList.length}
              </span>
            )}
          </div>

          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </button>
      )}

      {(standalone || isExpanded) && (
        <div className={standalone ? "" : "pb-2 animate-in fade-in-50 duration-200"}>
          {isLoading ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ) : checkoutsList.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center">{t.kitchen.ledger.nothingCheckedOut}</p>
          ) : (
            <div className="divide-y divide-border">
              {checkoutsList.map((checkout) => {
                const itemNames = checkout.items.map((i) => i.name).join(", ");
                const isDeclined = checkout.is_declined;
                const isRefunded = checkout.is_refunded;

                return (
                  <div
                    key={checkout.id}
                    className={cn(
                      "py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 transition-opacity",
                      isDeclined && "opacity-55 text-muted-foreground"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "font-medium text-sm truncate",
                          isDeclined ? "text-muted-foreground line-through" : "text-foreground"
                        )}
                      >
                        {itemNames || checkout.store_name || t.kitchen.ledger.myPurchases}
                      </p>
                      <p className="text-xs text-muted-foreground truncate tabular-nums">
                        {new Date(checkout.created_at).toLocaleDateString(dateLocale, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {checkout.store_name && itemNames && <span> · {checkout.store_name}</span>}
                      </p>
                      {checkout.note && (
                        <p className="text-xs text-muted-foreground truncate">&ldquo;{checkout.note}&rdquo;</p>
                      )}
                      {isDeclined && checkout.decline_reason && (
                        <p className="text-[11px] text-rose-300/80 truncate mt-0.5" title={checkout.decline_reason}>
                          <span className="font-medium text-rose-400/90">
                            {t.kitchen.ledger.declineReasonLabel || "Grund"}:
                          </span>{" "}
                          {checkout.decline_reason}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums whitespace-nowrap",
                          isDeclined ? "text-muted-foreground line-through" : "text-foreground"
                        )}
                      >
                        {formatCurrency(checkout.total_claimed_amount, checkout.currency)}
                      </span>

                      {checkout.receipts.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSelectedCheckout(checkout)}
                          aria-label={t.kitchen.ledger.viewReceipt}
                          title={t.kitchen.ledger.viewReceipt}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>
                      ) : checkout.totalReceiptsEverAttached > 0 ? (
                        <div
                          className="inline-flex items-center justify-center h-8 w-8 text-muted-foreground"
                          title={t.kitchen.ledger.receiptDeleted}
                        >
                          <Receipt className="w-3.5 h-3.5 line-through opacity-50" />
                        </div>
                      ) : (
                        <div
                          className="inline-flex items-center justify-center h-8 w-8 text-muted-foreground"
                          title={t.kitchen.ledger.noReceipt}
                        >
                          <Receipt className="w-3.5 h-3.5 opacity-40" />
                        </div>
                      )}

                      {isDeclined ? (
                        <div className="flex items-center gap-1.5 text-xs text-rose-400/80 whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500/70 shrink-0" />
                          <span>{t.kitchen.ledger.declined || "Abgelehnt"}</span>
                        </div>
                      ) : isRefunded ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 shrink-0" />
                            {t.kitchen.ledger.settled || "Ausgeglichen"}
                          </span>
                          {checkout.receipts.length > 0 && checkout.refunded_at && (
                            <ReceiptExpiryBadge refundedAt={checkout.refunded_at} />
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          {t.kitchen.ledger.pending || "Offen"}
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
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-card border border-border p-5 sm:p-6 text-card-foreground rounded-xl shadow-2xl flex flex-col gap-4">
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
                {selectedCheckout.is_declined && (
                  <div className="p-3 rounded-lg bg-rose-500/[0.05] border border-rose-500/20 text-rose-300 text-xs flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 font-medium">
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{t.kitchen.ledger.declined || "Abgelehnt"}</span>
                    </div>
                    {selectedCheckout.decline_reason && (
                      <p className="text-[11px] text-rose-300/80 pl-5.5">
                        <span className="font-semibold text-rose-200">{t.kitchen.ledger.declineReasonLabel || "Grund"}:</span> {selectedCheckout.decline_reason}
                      </p>
                    )}
                  </div>
                )}
                {selectedCheckout.is_refunded && selectedCheckout.refunded_at && selectedCheckout.receipts.length > 0 && (
                  <ReceiptExpiryBadge refundedAt={selectedCheckout.refunded_at} className="mt-0.5" />
                )}
              </DialogHeader>

              <div className="space-y-3">
                {selectedCheckout.receipts.map((r) => (
                  <div key={r.id} className="relative rounded-xl overflow-hidden border border-border bg-muted/40 p-2 sm:p-3 flex items-center justify-center min-h-[220px]">
                    <button
                      type="button"
                      onClick={() => handleDeleteReceipt(r.id)}
                      disabled={deletingReceiptId === r.id}
                      aria-label={t.kitchen.ledger.deleteReceipt}
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
                      className="max-h-[75vh] w-auto max-w-full object-contain rounded-md border border-border"
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
