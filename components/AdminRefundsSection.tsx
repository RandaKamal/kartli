"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ReceiptExpiryBadge } from "@/components/ReceiptExpiryBadge";
import {
  refundCheckoutAction,
  declineCheckoutAction,
  deleteReceiptForAdminAction,
  getKitchenCheckoutsAction,
} from "@/app/actions/checkout";
import { getKitchenMembersAction } from "@/app/actions/kitchen";
import type { CheckoutWithDetails, KitchenMemberWithUser, KitchenSpaceType } from "@/types";
import { capitalize, formatCurrency } from "@/lib/utils";
import {
  Receipt,
  CheckCircle2,
  Loader2,
  Check,
  Package,
  Store,
  MessageSquare,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

export function AdminRefundsSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-9 w-64 rounded-lg" />
      <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 divide-y divide-white/[0.06]">
        <Skeleton className="h-[68px] w-full rounded-none" />
        <Skeleton className="h-[68px] w-full rounded-none" />
        <Skeleton className="h-[68px] w-full rounded-none" />
      </div>
    </div>
  );
}

interface AdminRefundsSectionProps {
  kitchenId: string;
  checkouts?: CheckoutWithDetails[];
  members?: KitchenMemberWithUser[];
  spaceType?: KitchenSpaceType;
  onCheckoutsLoaded?: (checkouts: CheckoutWithDetails[]) => void;
  onCheckoutUpdated?: (checkout: Partial<CheckoutWithDetails> & { id: string }) => void;
}

export function AdminRefundsSection({
  kitchenId,
  checkouts: initialCheckouts,
  members,
  onCheckoutsLoaded,
  onCheckoutUpdated,
}: AdminRefundsSectionProps) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [isLoading, setIsLoading] = useState(
    initialCheckouts === undefined || members === undefined
  );
  const [checkoutsList, setCheckoutsList] = useState<CheckoutWithDetails[]>(initialCheckouts || []);
  const [membersList, setMembersList] = useState<KitchenMemberWithUser[]>(members || []);
  const [filterStatus, setFilterStatus] = useState<"pending" | "all" | "settled" | "declined">("pending");
  const [selectedCheckout, setSelectedCheckout] = useState<CheckoutWithDetails | null>(null);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [activeDeclineCheckoutId, setActiveDeclineCheckoutId] = useState<string | null>(null);
  const [decliningReason, setDecliningReason] = useState("");
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deletingReceiptId, setDeletingReceiptId] = useState<string | null>(null);

  useEffect(() => {
    if (initialCheckouts !== undefined && members !== undefined) {
      setCheckoutsList(initialCheckouts);
      setMembersList(members);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const promises: [Promise<CheckoutWithDetails[]>, Promise<KitchenMemberWithUser[]>] = [
      initialCheckouts !== undefined ? Promise.resolve(initialCheckouts) : getKitchenCheckoutsAction(kitchenId),
      members !== undefined ? Promise.resolve(members) : getKitchenMembersAction(kitchenId),
    ];

    Promise.all(promises)
      .then(([chk, mem]) => {
        if (isMounted) {
          setCheckoutsList(chk);
          setMembersList(mem);
          setIsLoading(false);
          onCheckoutsLoaded?.(chk);
        }
      })
      .catch((err) => {
        console.error("Failed to load admin refunds data:", err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [kitchenId, initialCheckouts, members]);

  const memberMap = new Map<string, { displayName: string; username: string; initial: string }>();
  membersList.forEach((m) => {
    if (m.user_id) {
      const displayName = m.kitchen_display_name ? capitalize(m.kitchen_display_name) : (t.kitchenSettings.memberSingular || "Member");
      const initial = (m.kitchen_display_name || "M").charAt(0).toUpperCase();
      const username = m.username ? `@${m.username}` : "@guest";
      memberMap.set(m.user_id, { displayName, username, initial });
    }
  });

  if (isLoading) {
    return <AdminRefundsSkeleton />;
  }

  const getMemberInfo = (userId: string | null, usernameFallback?: string | null) => {
    if (userId) {
      const found = memberMap.get(userId);
      if (found) return found;
    }
    const name = usernameFallback ? capitalize(usernameFallback) : (t.kitchen.header.roommateSingular || "Roommate");
    return {
      displayName: name,
      username: usernameFallback ? `@${usernameFallback}` : "@guest",
      initial: name.charAt(0).toUpperCase(),
    };
  };

  const pendingCheckouts = checkoutsList.filter((c) => !c.is_refunded && !c.is_declined);
  const settledCheckouts = checkoutsList.filter((c) => c.is_refunded);
  const declinedCheckouts = checkoutsList.filter((c) => c.is_declined);

  const displayedCheckouts =
    filterStatus === "pending"
      ? pendingCheckouts
      : filterStatus === "settled"
      ? settledCheckouts
      : filterStatus === "declined"
      ? declinedCheckouts
      : checkoutsList;

  const handleMarkAsSettled = (checkoutId: string) => {
    setSettlingId(checkoutId);
    startTransition(async () => {
      try {
        await refundCheckoutAction(kitchenId, checkoutId);
        const updated = {
          id: checkoutId,
          is_refunded: true,
          is_declined: false,
          refunded_at: new Date(),
        };
        setCheckoutsList((prev) =>
          prev.map((c) =>
            c.id === checkoutId ? { ...c, ...updated } : c
          )
        );
        onCheckoutUpdated?.(updated);
        toast.success(t.kitchen.ledger.settledSuccess);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to mark as refunded.");
      } finally {
        setSettlingId(null);
      }
    });
  };

  const handleDeclineCheckout = (checkoutId: string, reason?: string) => {
    setDecliningId(checkoutId);
    startTransition(async () => {
      try {
        await declineCheckoutAction(checkoutId, reason);
        const now = new Date().toISOString();
        const updated = {
          id: checkoutId,
          is_declined: true,
          is_refunded: false,
          declined_at: now,
          decline_reason: reason?.trim() || null,
          receipts: [],
          receipt_filename: null,
        };
        setCheckoutsList((prev) =>
          prev.map((c) =>
            c.id === checkoutId ? { ...c, ...updated } : c
          )
        );
        onCheckoutUpdated?.(updated);
        setActiveDeclineCheckoutId(null);
        toast.success(t.kitchen.ledger.declinedSuccess || "Einkauf abgelehnt und Beleg entfernt");
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to decline checkout.");
      } finally {
        setDecliningId(null);
      }
    });
  };

  const handleDeleteReceipt = (receiptId: string) => {
    if (!window.confirm(t.kitchen.ledger.deleteReceiptAdminConfirm)) return;
    setDeletingReceiptId(receiptId);
    startTransition(async () => {
      try {
        await deleteReceiptForAdminAction(kitchenId, receiptId);
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

  const dateLocale = locale === "de" ? "de-DE" : "en-US";

  const filters: Array<{ key: "all" | "pending" | "settled" | "declined"; label: string; count: number }> = [
    { key: "all", label: t.kitchen.ledger.filterAll, count: checkoutsList.length },
    { key: "pending", label: t.kitchen.ledger.filterPending, count: pendingCheckouts.length },
    { key: "settled", label: t.kitchen.ledger.filterSettled, count: settledCheckouts.length },
    { key: "declined", label: t.kitchen.ledger.filterDeclined || "Abgelehnt", count: declinedCheckouts.length },
  ];

  const emptyStateTitle =
    filterStatus === "pending"
      ? t.kitchen.ledger.noPendingRefunds
      : filterStatus === "settled"
      ? t.kitchen.ledger.noSettledPurchases
      : filterStatus === "declined"
      ? (t.kitchen.ledger.noDeclinedPurchases || "Keine abgelehnten Einkäufe")
      : t.kitchen.ledger.noPurchases;

  const emptyStateDescription =
    filterStatus === "pending"
      ? t.kitchen.ledger.noPendingRefundsDesc
      : filterStatus === "declined"
      ? (t.kitchen.ledger.noDeclinedPurchasesDesc || "Hier erscheinen Einkäufe, die abgelehnt wurden.")
      : t.kitchen.ledger.noPurchasesDesc;

  return (
    <div className="space-y-4">
      {/* Segmented status filter */}
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center bg-zinc-900/80 p-1 rounded-lg border border-white/[0.06]">
          {filters.map((filter) => {
            const isActive = filterStatus === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setFilterStatus(filter.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-zinc-800 text-white shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <span>{filter.label}</span>
                <span className={cn("text-[11px] tabular-nums", isActive ? "text-zinc-400" : "text-zinc-600")}>
                  {filter.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Checkouts feed */}
      {displayedCheckouts.length === 0 ? (
        <div className="py-14 text-center space-y-2">
          <Receipt className="w-5 h-5 mx-auto text-zinc-600" />
          <p className="text-sm font-medium text-zinc-300">{emptyStateTitle}</p>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">{emptyStateDescription}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 divide-y divide-white/[0.06]">
          {displayedCheckouts.map((checkout) => {
            const memberInfo = getMemberInfo(checkout.user_id, checkout.username);
            const isSettling = isPending && settlingId === checkout.id;
            const itemNames = checkout.items.map((item) => item.name).join(", ");

            return (
              <div
                key={checkout.id}
                className="px-4 py-3.5 transition-colors hover:bg-white/[0.02]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  {/* Left: identity + context */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-zinc-800 text-[11px] font-semibold text-zinc-300">
                        {memberInfo.initial}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2 min-w-0">
                        <span className="font-medium text-sm text-foreground truncate">
                          {memberInfo.displayName}
                        </span>
                        <span className="text-[11px] text-zinc-500 truncate">
                          {memberInfo.username}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-500 truncate tabular-nums">
                        {new Date(checkout.created_at).toLocaleDateString(dateLocale, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {itemNames && <span> · {itemNames}</span>}
                      </p>

                      {checkout.note && (
                        <p className="text-xs text-zinc-400 truncate">
                          &ldquo;{checkout.note}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: amount + receipt + status/action */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-11 sm:pl-0">
                    <span className="text-sm font-semibold text-foreground tabular-nums whitespace-nowrap">
                      {formatCurrency(checkout.total_claimed_amount, checkout.currency)}
                    </span>

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
                    ) : checkout.totalReceiptsEverAttached > 0 ? (
                      <div
                        className="inline-flex items-center justify-center h-8 w-8 text-zinc-600"
                        title={t.kitchen.ledger.receiptDeleted}
                      >
                        <Receipt className="w-3.5 h-3.5 line-through opacity-50" />
                      </div>
                    ) : (
                      <div
                        className="inline-flex items-center justify-center h-8 w-8 text-zinc-700"
                        title={t.kitchen.ledger.noReceipt}
                      >
                        <Receipt className="w-3.5 h-3.5 opacity-40" />
                      </div>
                    )}

                    {checkout.is_declined ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="inline-flex items-center gap-1.5 text-xs text-rose-400 whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                          {t.kitchen.ledger.declined || "Abgelehnt"}
                        </span>
                        {checkout.decline_reason && (
                          <span className="text-[11px] text-rose-300/80 truncate max-w-[160px] sm:max-w-xs" title={checkout.decline_reason}>
                            {checkout.decline_reason}
                          </span>
                        )}
                      </div>
                    ) : checkout.is_refunded ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400 whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 shrink-0" />
                          {t.kitchen.ledger.settled}
                        </span>
                        {checkout.receipts.length > 0 && checkout.refunded_at && (
                          <ReceiptExpiryBadge refundedAt={checkout.refunded_at} />
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400 whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          {t.kitchen.ledger.pending}
                        </span>

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleMarkAsSettled(checkout.id)}
                          disabled={isPending}
                          className="h-8 px-3 rounded-lg text-xs font-medium gap-1.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/25 transition-colors cursor-pointer"
                        >
                          {isSettling ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>{isSettling ? t.kitchen.ledger.settlingAction : t.kitchen.ledger.settleAction}</span>
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (activeDeclineCheckoutId === checkout.id) {
                              setActiveDeclineCheckoutId(null);
                            } else {
                              setActiveDeclineCheckoutId(checkout.id);
                              setDecliningReason("");
                            }
                          }}
                          disabled={isPending}
                          className="h-8 px-3 rounded-lg text-xs font-medium text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-white/[0.08] hover:border-rose-500/25 transition-colors cursor-pointer"
                          title={t.kitchen.ledger.declineAction || "Ablehnen"}
                        >
                          <span>{t.kitchen.ledger.declineAction || "Ablehnen"}</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline decline confirmation bar as a clean full-width sub-row */}
                {activeDeclineCheckoutId === checkout.id && (
                  <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-2 animate-in fade-in-50 duration-150">
                    <Input
                      value={decliningReason}
                      onChange={(e) => setDecliningReason(e.target.value)}
                      placeholder={t.kitchen.ledger.declineReasonPlaceholder || "Optionaler Grund (z. B. Ungültiger Beleg)"}
                      className="h-8 text-xs bg-zinc-900/90 border-white/[0.1] text-foreground placeholder:text-zinc-500 flex-1 min-w-0"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleDeclineCheckout(checkout.id, decliningReason);
                        } else if (e.key === "Escape") {
                          setActiveDeclineCheckoutId(null);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleDeclineCheckout(checkout.id, decliningReason)}
                      disabled={isPending && decliningId === checkout.id}
                      className="h-8 px-3 text-xs font-medium rounded-lg bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shrink-0"
                    >
                      {isPending && decliningId === checkout.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      ) : null}
                      <span>{t.kitchen.ledger.confirmDecline || "Ablehnen"}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveDeclineCheckoutId(null)}
                      disabled={isPending && decliningId === checkout.id}
                      className="h-8 px-2.5 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer shrink-0"
                    >
                      {t.kitchen.ledger.cancelDecline || "Abbrechen"}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Full resolution receipt preview */}
      <Dialog open={!!selectedCheckout} onOpenChange={(open) => !open && setSelectedCheckout(null)}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[92vh] overflow-y-auto bg-card border border-white/[0.08] p-5 sm:p-6 text-card-foreground rounded-xl shadow-2xl flex flex-col gap-4">
          {selectedCheckout && (
            <>
              <DialogHeader className="space-y-2 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-muted-foreground shrink-0" />
                    <DialogTitle className="text-base font-semibold text-foreground">
                      {selectedCheckout.store_name || "Supermarket Receipt"}
                    </DialogTitle>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400 shrink-0">
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        selectedCheckout.is_refunded ? "bg-emerald-500/80" : "bg-amber-500"
                      )}
                    />
                    {selectedCheckout.is_refunded
                      ? t.kitchen.ledger.settled
                      : t.kitchen.ledger.pendingRefund}
                  </span>
                </div>

                <DialogDescription asChild>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {t.kitchen.ledger.submittedBy}{" "}
                      <strong className="text-foreground font-medium">
                        {getMemberInfo(selectedCheckout.user_id, selectedCheckout.username).displayName}
                      </strong>{" "}
                      ({getMemberInfo(selectedCheckout.user_id, selectedCheckout.username).username})
                    </span>
                    <span>&middot;</span>
                    <span className="tabular-nums">
                      {new Date(selectedCheckout.created_at).toLocaleDateString(dateLocale, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span>&middot;</span>
                    <span className="font-medium text-foreground tabular-nums">
                      {t.kitchen.ledger.claimed}: {formatCurrency(selectedCheckout.total_claimed_amount || 0, selectedCheckout.currency)}
                      {selectedCheckout.total_receipt_amount != null && (
                        <span className="text-muted-foreground font-normal">
                          {" "}({t.kitchen.ledger.total}: {formatCurrency(selectedCheckout.total_receipt_amount, selectedCheckout.currency)})
                        </span>
                      )}
                    </span>
                  </div>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {selectedCheckout.note && (
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-1">
                    <span className="text-[11px] font-medium text-zinc-500 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{t.kitchen.ledger.noteToAdmin}</span>
                    </span>
                    <p className="text-xs text-foreground">&ldquo;{selectedCheckout.note}&rdquo;</p>
                  </div>
                )}

                {selectedCheckout.receipts.length > 0 ? (
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
                          alt={`Receipt for ${selectedCheckout.store_name || "household purchase"}`}
                          className="max-h-[75vh] w-auto max-w-full object-contain rounded-md border border-white/[0.06]"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01] text-center space-y-1.5">
                    <Receipt className="w-4 h-4 mx-auto text-zinc-600" />
                    <p className="text-xs font-medium text-foreground">{t.kitchen.ledger.noReceiptAttached}</p>
                    <p className="text-[11px] text-muted-foreground">{t.kitchen.ledger.noReceiptAttachedDesc}</p>
                  </div>
                )}

                {selectedCheckout.items.length > 0 && (
                  <div className="space-y-2 p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                    <div className="flex items-center justify-between text-xs font-medium text-foreground">
                      <span className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{t.kitchen.ledger.claimedItems.replace("{count}", String(selectedCheckout.items.length))}</span>
                      </span>
                      <span className="tabular-nums text-zinc-500">
                        {formatCurrency(selectedCheckout.total_claimed_amount || 0, selectedCheckout.currency)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedCheckout.items.map((item) => (
                        <span
                          key={item.id}
                          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-zinc-900/60 border border-white/[0.06] text-zinc-300"
                        >
                          <span>{item.name}</span>
                          {item.item_price != null && (
                            <span className="tabular-nums text-[10px] text-zinc-500">
                              ({formatCurrency(item.item_price, item.currency || selectedCheckout.currency)})
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

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

                {selectedCheckout.is_refunded && selectedCheckout.refunded_at && (
                  <div className="p-3 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/15 text-emerald-300/90 text-xs flex items-center justify-between gap-2 flex-wrap">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>
                        {t.kitchen.ledger.settledOn.replace("{date}", new Date(selectedCheckout.refunded_at).toLocaleDateString(dateLocale, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }))}
                      </span>
                    </span>
                    {selectedCheckout.receipts.length > 0 && (
                      <ReceiptExpiryBadge refundedAt={selectedCheckout.refunded_at} />
                    )}
                  </div>
                )}
              </div>

              <DialogFooter className="pt-3 border-t border-white/[0.06] flex flex-col sm:flex-row gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCheckout(null)}
                  className="rounded-lg text-xs h-8 px-3"
                >
                  {t.common.close}
                </Button>
                {!selectedCheckout.is_refunded && !selectedCheckout.is_declined && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const id = selectedCheckout.id;
                      setSelectedCheckout(null);
                      handleMarkAsSettled(id);
                    }}
                    disabled={isPending}
                    className="h-8 px-3 rounded-lg text-xs font-medium gap-1.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/25 transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{t.kitchen.ledger.markAsSettled}</span>
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
