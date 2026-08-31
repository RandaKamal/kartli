"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refundCheckoutAction } from "@/app/actions/checkout";
import type { CheckoutWithDetails, KitchenMemberWithUser, KitchenSpaceType } from "@/types";
import { getSpaceTerminology } from "@/lib/spaceTerminology";
import { capitalize } from "@/lib/utils";
import {
  Receipt,
  CheckCircle2,
  Clock,
  Loader2,
  Calendar,
  Check,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface AdminRefundsSectionProps {
  kitchenId: string;
  checkouts: CheckoutWithDetails[];
  members: KitchenMemberWithUser[];
  spaceType: KitchenSpaceType;
}

type FilterStatus = "all" | "pending" | "settled";

export function AdminRefundsSection({
  kitchenId,
  checkouts: initialCheckouts,
  members,
  spaceType,
}: AdminRefundsSectionProps) {
  const router = useRouter();
  const [checkoutsList, setCheckoutsList] = useState<CheckoutWithDetails[]>(initialCheckouts);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [selectedCheckout, setSelectedCheckout] = useState<CheckoutWithDetails | null>(null);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const terminology = getSpaceTerminology(spaceType);

  const pendingCheckouts = checkoutsList.filter((c) => !c.is_refunded);
  const settledCheckouts = checkoutsList.filter((c) => c.is_refunded);

  const filteredCheckouts = checkoutsList.filter((c) => {
    if (filterStatus === "pending") return !c.is_refunded;
    if (filterStatus === "settled") return c.is_refunded;
    return true;
  });

  const getMemberInfo = (userId: string, username: string | null) => {
    const member = members.find((m) => m.user_id === userId);
    const displayName = member?.kitchen_display_name
      ? capitalize(member.kitchen_display_name)
      : username
      ? `@${username}`
      : terminology.memberLabel;
    const initial = displayName.charAt(0).toUpperCase() || "M";
    const userHandle = username ? `@${username}` : member?.username ? `@${member.username}` : "Member";

    return { displayName, initial, userHandle, role: member?.role || "MEMBER" };
  };

  const handleMarkAsSettled = (checkoutId: string) => {
    setSettlingId(checkoutId);
    startTransition(async () => {
      try {
        await refundCheckoutAction(kitchenId, checkoutId);
        setCheckoutsList((prev) =>
          prev.map((c) =>
            c.id === checkoutId ? { ...c, is_refunded: true, refunded_at: new Date() } : c
          )
        );
        toast.success("Refund marked as settled!");
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to settle refund.");
      } finally {
        setSettlingId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card className="border border-border/80 bg-card dark:bg-zinc-900/60 dark:border-zinc-800 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="accent" className="font-semibold text-[11px] uppercase tracking-wider gap-1">
                <Receipt className="w-3 h-3" />
                ADMIN PURCHASES &amp; REFUNDS
              </Badge>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Household Purchases &amp; Refunds
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Review receipts uploaded by {terminology.memberLabelPlural.toLowerCase()} and mark refunds as settled.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              className={`px-3.5 py-2 rounded-2xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                filterStatus === "all"
                  ? "bg-zinc-800 text-white border-zinc-700 shadow-sm"
                  : "bg-muted/50 dark:bg-zinc-900/50 text-muted-foreground border-border/70 dark:border-zinc-800 hover:text-foreground hover:bg-muted"
              }`}
            >
              <span>All</span>
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-full bg-background/50 dark:bg-zinc-800/80">
                {checkoutsList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus("pending")}
              className={`px-3.5 py-2 rounded-2xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                filterStatus === "pending"
                  ? "bg-[#e9c46a]/20 text-[#e9c46a] border-[#e9c46a]/50 shadow-sm"
                  : "bg-[#e9c46a]/5 text-[#e9c46a] dark:text-[#f6bd60] border-[#e9c46a]/20 hover:bg-[#e9c46a]/15"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending</span>
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-full bg-amber-950/40 text-[#e9c46a]">
                {pendingCheckouts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus("settled")}
              className={`px-3.5 py-2 rounded-2xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                filterStatus === "settled"
                  ? "bg-[#81b29a]/20 text-[#81b29a] border-[#81b29a]/50 shadow-sm"
                  : "bg-[#81b29a]/5 text-[#81b29a] dark:text-[#84a59d] border-[#81b29a]/20 hover:bg-[#81b29a]/15"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Settled</span>
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-full bg-emerald-950/40 text-[#81b29a]">
                {settledCheckouts.length}
              </span>
            </button>
          </div>
        </div>
      </Card>

      {/* Refunds Request List / Cards */}
      {filteredCheckouts.length === 0 ? (
        <Card className="border border-dashed border-border/80 dark:border-zinc-800 bg-card/40 dark:bg-zinc-900/30 rounded-3xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-muted/60 dark:bg-zinc-800/80 border border-border/80 dark:border-zinc-700 flex items-center justify-center mx-auto text-muted-foreground">
            {filterStatus === "pending" ? (
              <CheckCircle2 className="w-6 h-6 text-[#81b29a]" />
            ) : (
              <Receipt className="w-6 h-6" />
            )}
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-sm font-semibold text-foreground">
              {filterStatus === "pending"
                ? "No pending refund requests"
                : filterStatus === "settled"
                ? "No settled refunds yet"
                : "No purchases recorded"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {filterStatus === "pending"
                ? `No pending refund requests. All ${terminology.memberLabelPlural.toLowerCase()} purchases are settled.`
                : filterStatus === "settled"
                ? "Purchases marked as settled will appear in this audit log."
                : `Purchases submitted by ${terminology.memberLabelPlural.toLowerCase()} will appear here for review.`}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCheckouts.map((checkout) => {
            const memberInfo = getMemberInfo(checkout.user_id, checkout.username);
            const isSettling = isPending && settlingId === checkout.id;

            return (
              <Card
                key={checkout.id}
                className="border border-border/80 bg-card dark:bg-zinc-900/60 dark:border-zinc-800 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm hover:border-border dark:hover:border-zinc-700 transition"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Member & Date Column */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 sm:min-w-[260px]">
                    <Avatar className="h-10 w-10 border border-border/60 dark:border-zinc-700 shrink-0">
                      <AvatarFallback className="bg-secondary dark:bg-zinc-800 text-xs font-bold text-foreground">
                        {memberInfo.initial}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground truncate">
                          {memberInfo.displayName}
                        </span>
                        <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                          {memberInfo.userHandle}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                        <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span>
                          {new Date(checkout.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span>&middot;</span>
                        <span>{checkout.items.length} item{checkout.items.length === 1 ? "" : "s"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Staged Items Badge Pills */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {checkout.items.slice(0, 4).map((item) => (
                        <Badge
                          key={item.id}
                          variant="secondary"
                          className="text-xs font-normal bg-muted/60 dark:bg-zinc-800/80 text-foreground border-border/60 dark:border-zinc-700"
                        >
                          {item.name}
                        </Badge>
                      ))}
                      {checkout.items.length > 4 && (
                        <Badge
                          variant="outline"
                          className="text-xs text-muted-foreground font-mono"
                        >
                          +{checkout.items.length - 4} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Receipt & Action Group */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/60">
                    {/* View Receipt Pill Button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedCheckout(checkout)}
                      className="rounded-xl text-xs font-medium h-8.5 gap-1.5 border-border/80 dark:border-zinc-700 hover:bg-muted dark:hover:bg-zinc-800"
                    >
                      <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="truncate max-w-[100px] sm:max-w-[130px]">
                        {checkout.receipt_filename}
                      </span>
                    </Button>

                    {/* Status Badge & Settle Button */}
                    {checkout.is_refunded ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border bg-[#81b29a]/10 text-[#81b29a] dark:text-[#84a59d] border-[#81b29a]/30">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#81b29a]" />
                        <span>Settled</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border bg-[#e9c46a]/10 text-[#e9c46a] dark:text-[#f6bd60] border-[#e9c46a]/30">
                          <Clock className="w-3.5 h-3.5 text-[#e9c46a]" />
                          <span>Pending</span>
                        </div>

                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={() => handleMarkAsSettled(checkout.id)}
                          disabled={isPending}
                          className="rounded-xl text-xs font-semibold h-8.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 shadow-sm gap-1.5"
                        >
                          {isSettling ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-[#81b29a]" />
                          )}
                          <span>Mark as Settled</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Receipt Details Modal Dialog */}
      <Dialog open={!!selectedCheckout} onOpenChange={(open) => !open && setSelectedCheckout(null)}>
        <DialogContent className="sm:max-w-md bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 p-6 text-card-foreground rounded-3xl shadow-xl space-y-4">
          {selectedCheckout && (
            <>
              <DialogHeader className="space-y-1.5 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-accent-brand" />
                    <DialogTitle className="text-base font-bold text-foreground">
                      Purchase Receipt Details
                    </DialogTitle>
                  </div>
                  {selectedCheckout.is_refunded ? (
                    <Badge variant="success" className="bg-[#81b29a]/15 text-[#81b29a] border-[#81b29a]/30">
                      Settled
                    </Badge>
                  ) : (
                    <Badge variant="warm" className="bg-[#e9c46a]/15 text-[#e9c46a] border-[#e9c46a]/30">
                      Pending Refund
                    </Badge>
                  )}
                </div>
                <DialogDescription className="text-xs text-muted-foreground font-mono">
                  Receipt: {selectedCheckout.receipt_filename}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-1 text-xs">
                {/* Buyer & Date Summary */}
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-muted/40 dark:bg-zinc-800/50 border border-border/70 dark:border-zinc-700/80">
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground font-medium">Purchased by</span>
                    <p className="font-semibold text-foreground">
                      {getMemberInfo(selectedCheckout.user_id, selectedCheckout.username).displayName}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground font-medium">Date</span>
                    <p className="font-semibold text-foreground font-mono">
                      {new Date(selectedCheckout.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                {/* Items Purchased List */}
                <div className="space-y-2">
                  <span className="font-semibold text-foreground flex items-center justify-between">
                    <span>Purchased Items</span>
                    <span className="text-muted-foreground font-mono font-normal">
                      {selectedCheckout.items.length} items
                    </span>
                  </span>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {selectedCheckout.items.map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-muted/30 dark:bg-zinc-800/30 border border-border/50 dark:border-zinc-700/60"
                      >
                        <span className="text-foreground font-medium">{item.name}</span>
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          #{idx + 1}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Refund timestamp if settled */}
                {selectedCheckout.is_refunded && selectedCheckout.refunded_at && (
                  <div className="p-3 rounded-2xl bg-[#81b29a]/10 border border-[#81b29a]/20 text-[#81b29a] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      Settled on {new Date(selectedCheckout.refunded_at).toLocaleDateString("en-US")}
                    </span>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-2 border-t border-border/60 dark:border-zinc-800 flex flex-col sm:flex-row gap-2">
                {!selectedCheckout.is_refunded && (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => {
                      const id = selectedCheckout.id;
                      setSelectedCheckout(null);
                      handleMarkAsSettled(id);
                    }}
                    disabled={isPending}
                    className="w-full sm:w-auto text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5 text-[#81b29a]" />
                    <span>Mark as Settled</span>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCheckout(null)}
                  className="w-full sm:w-auto text-xs rounded-xl"
                >
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
