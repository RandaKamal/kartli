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
  ExternalLink,
  Calendar,
  DollarSign,
  User,
  Shield,
  Loader2,
  Check,
  Package,
} from "lucide-react";
import { Card } from "@/components/ui/card";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

interface AdminRefundsSectionProps {
  kitchenId: string;
  checkouts: CheckoutWithDetails[];
  members: KitchenMemberWithUser[];
  spaceType?: KitchenSpaceType;
}

export function AdminRefundsSection({
  kitchenId,
  checkouts: initialCheckouts,
  members,
  spaceType = "FLATSHARE",
}: AdminRefundsSectionProps) {
  const router = useRouter();
  const [checkoutsList, setCheckoutsList] = useState<CheckoutWithDetails[]>(initialCheckouts);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "settled">("all");
  const [selectedCheckout, setSelectedCheckout] = useState<CheckoutWithDetails | null>(null);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const terminology = getSpaceTerminology(spaceType);

  const memberMap = new Map<string, { displayName: string; username: string; initial: string }>();
  members.forEach((m) => {
    if (m.user_id) {
      const displayName = m.kitchen_display_name ? capitalize(m.kitchen_display_name) : "Member";
      const initial = (m.kitchen_display_name || "M").charAt(0).toUpperCase();
      const username = m.username ? `@${m.username}` : "@guest";
      memberMap.set(m.user_id, { displayName, username, initial });
    }
  });

  const getMemberInfo = (userId: string, usernameFallback?: string | null) => {
    const found = memberMap.get(userId);
    if (found) return found;
    const name = usernameFallback ? capitalize(usernameFallback) : "Roommate";
    return {
      displayName: name,
      username: usernameFallback ? `@${usernameFallback}` : "@guest",
      initial: name.charAt(0).toUpperCase(),
    };
  };

  const pendingCheckouts = checkoutsList.filter((c) => !c.is_refunded);
  const settledCheckouts = checkoutsList.filter((c) => c.is_refunded);

  const displayedCheckouts =
    filterStatus === "pending"
      ? pendingCheckouts
      : filterStatus === "settled"
      ? settledCheckouts
      : checkoutsList;

  const handleMarkAsSettled = (checkoutId: string) => {
    setSettlingId(checkoutId);
    startTransition(async () => {
      try {
        await refundCheckoutAction(kitchenId, checkoutId);
        setCheckoutsList((prev) =>
          prev.map((c) =>
            c.id === checkoutId
              ? { ...c, is_refunded: true, refunded_at: new Date() }
              : c
          )
        );
        toast.success("Checkout marked as settled & refunded!");
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to mark as refunded.");
      } finally {
        setSettlingId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card className="border border-border bg-card rounded-3xl p-4 sm:p-6 md:p-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="border border-border text-muted-foreground text-[11px] font-medium uppercase tracking-wider gap-1">
                <Receipt className="w-3 h-3 text-muted-foreground" />
                <span>ADMIN PURCHASES &amp; REFUNDS</span>
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
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-muted text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              <span>All</span>
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-full bg-background/50">
                {checkoutsList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus("pending")}
              className={`px-3.5 py-2 rounded-2xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                filterStatus === "pending"
                  ? "bg-accent-ochre/25 text-accent-warning border-accent-ochre/60 shadow-sm"
                  : "bg-accent-ochre/10 text-accent-warning border-accent-ochre/30 hover:bg-accent-ochre/20"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending</span>
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-full bg-background/50 text-accent-warning">
                {pendingCheckouts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus("settled")}
              className={`px-3.5 py-2 rounded-2xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                filterStatus === "settled"
                  ? "bg-accent-sage/25 text-accent-success border-accent-sage/60 shadow-sm"
                  : "bg-accent-sage/10 text-accent-success border-accent-sage/30 hover:bg-accent-sage/20"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Settled</span>
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-full bg-background/50 text-accent-success">
                {settledCheckouts.length}
              </span>
            </button>
          </div>
        </div>
      </Card>

      {/* Checkouts Feed */}
      {displayedCheckouts.length === 0 ? (
        <Card className="border border-dashed border-border bg-card/50 rounded-3xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center mx-auto text-muted-foreground">
            <Receipt className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              {filterStatus === "pending"
                ? "No pending refunds found"
                : filterStatus === "settled"
                ? "No settled purchases recorded yet"
                : "No purchases recorded yet"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {filterStatus === "pending"
                ? "All member supermarket checkouts and grocery refunds are currently up to date."
                : "When members purchase items and upload receipts, their checkout logs will appear here."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayedCheckouts.map((checkout) => {
            const memberInfo = getMemberInfo(checkout.user_id, checkout.username);
            const isSettling = isPending && settlingId === checkout.id;

            return (
              <Card
                key={checkout.id}
                className="border border-border bg-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm hover:border-border transition"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Member & Date Column */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 sm:min-w-[260px]">
                    <Avatar className="h-10 w-10 border border-border shrink-0">
                      <AvatarFallback className="bg-secondary text-xs font-bold text-foreground">
                        {memberInfo.initial}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground truncate">
                          {memberInfo.displayName}
                        </span>
                        <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                          {memberInfo.username}
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
                          className="text-xs font-normal bg-secondary text-secondary-foreground border-border"
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
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border">
                    {/* View Receipt Pill Button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedCheckout(checkout)}
                      className="rounded-xl text-xs font-medium h-8.5 gap-1.5 border-border hover:bg-secondary"
                    >
                      <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="truncate max-w-[100px] sm:max-w-[130px]">
                        {checkout.receipt_filename}
                      </span>
                    </Button>

                    {/* Status Badge & Settle Button */}
                    {checkout.is_refunded ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border bg-accent-sage/15 text-accent-success border-accent-sage/30">
                        <CheckCircle2 className="w-3.5 h-3.5 text-accent-success" />
                        <span>Settled</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border bg-accent-ochre/15 text-accent-warning border-accent-ochre/30">
                          <Clock className="w-3.5 h-3.5 text-accent-warning" />
                          <span>Pending</span>
                        </div>

                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={() => handleMarkAsSettled(checkout.id)}
                          disabled={isPending}
                          className="rounded-xl text-xs font-semibold h-8.5 px-3 shadow-sm gap-1.5"
                        >
                          {isSettling ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>{isSettling ? "Settling..." : "Mark as Settled"}</span>
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
        <DialogContent className="sm:max-w-md bg-card border border-border p-6 text-card-foreground rounded-3xl shadow-xl space-y-4">
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
                    <Badge variant="success" className="bg-accent-sage/15 text-accent-success border-accent-sage/30">
                      Settled
                    </Badge>
                  ) : (
                    <Badge variant="warm" className="bg-accent-ochre/15 text-accent-warning border-accent-ochre/30">
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
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-muted/50 border border-border">
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
                        className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border"
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
                  <div className="p-3 rounded-2xl bg-accent-sage/10 border border-accent-sage/25 text-accent-success flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      Settled on {new Date(selectedCheckout.refunded_at).toLocaleDateString("en-US")}
                    </span>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-2 border-t border-border flex flex-col sm:flex-row gap-2">
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
                    className="w-full sm:w-auto text-xs font-semibold rounded-xl gap-1.5 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
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
