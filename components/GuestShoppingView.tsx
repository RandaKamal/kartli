"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { PublicKitchenContext, ShoppingListItem } from "@/types";
import {
  ShoppingBag,
  Check,
  RotateCcw,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Package,
  ArrowRight,
  Sparkles,
  Users,
  Search,
  ShoppingCart as CartIcon,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { capitalize } from "@/lib/utils";
import {
  readGuestCartCookie,
  writeGuestCartCookie,
  clearGuestCartCookieClient,
} from "@/lib/guestCart";
import {
  moveToCartAction,
  returnToShoppingListAction,
  stageGuestShoppingItemAction,
} from "@/app/actions/pantry";
import { getSpaceTerminology } from "@/lib/spaceTerminology";
import { toast } from "sonner";

interface GuestShoppingViewProps {
  kitchen: PublicKitchenContext;
  openItems: ShoppingListItem[];
  inCartItems: ShoppingListItem[];
  sessionUser: {
    id: string;
    username: string;
    isMember: boolean;
    role?: "ADMIN" | "MEMBER" | null;
  } | null;
}

export function GuestShoppingView({
  kitchen,
  openItems: initialOpenItems,
  inCartItems: initialInCartItems,
  sessionUser,
}: GuestShoppingViewProps) {
  const router = useRouter();
  const terminology = getSpaceTerminology(kitchen.space_type);
  const [openItems, setOpenItems] = useState<ShoppingListItem[]>(initialOpenItems);
  const [inCartItems, setInCartItems] = useState<ShoppingListItem[]>(initialInCartItems);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [showInCart, setShowInCart] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [isRefreshing, startTransition] = useTransition();
  const [isMutating, startMutation] = useTransition();

  // Load guest cookie on initial mount
  useEffect(() => {
    const saved = readGuestCartCookie(kitchen.id);
    if (saved && saved.length > 0) {
      setCheckedIds(new Set(saved));
    }
  }, [kitchen.id]);

  useEffect(() => {
    setOpenItems(initialOpenItems);
    setInCartItems(initialInCartItems);
  }, [initialOpenItems, initialInCartItems]);

  const handleToggleItem = (item: ShoppingListItem) => {
    // Case A: Authenticated member (real-time server action)
    if (sessionUser?.isMember) {
      setOpenItems((prev) => prev.filter((i) => i.id !== item.id));
      setInCartItems((prev) => [
        ...prev,
        {
          ...item,
          is_purchased: true,
          purchased_by_name: sessionUser.username,
        },
      ]);

      startMutation(async () => {
        try {
          await moveToCartAction(kitchen.id, item.id);
          toast.success(`Moved "${item.name}" to cart`);
        } catch (err: any) {
          setOpenItems(initialOpenItems);
          setInCartItems(initialInCartItems);
          toast.error(err.message || "Failed to move item to cart.");
        }
      });
      return;
    }

    // Case B: Unauthenticated guest (local + cookie persistence + server staging)
    const isNowChecked = !checkedIds.has(item.id);
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (isNowChecked) {
        next.add(item.id);
      } else {
        next.delete(item.id);
      }

      const itemArray = Array.from(next);
      writeGuestCartCookie(kitchen.id, itemArray);
      return next;
    });

    startMutation(async () => {
      try {
        await stageGuestShoppingItemAction({
          kitchenId: kitchen.id,
          itemId: item.id,
          isStaged: isNowChecked,
        });

        if (isNowChecked) {
          toast.info(`Saved "${item.name}" in temporary cart. Log in to claim.`, {
            duration: 2500,
          });
        }
      } catch (err: any) {
        // Revert local state on failure
        setCheckedIds((prev) => {
          const next = new Set(prev);
          if (isNowChecked) next.delete(item.id);
          else next.add(item.id);
          writeGuestCartCookie(kitchen.id, Array.from(next));
          return next;
        });
        toast.error(err.message || "Failed to update item.");
      }
    });
  };

  const handleReturnInCartItem = (item: ShoppingListItem) => {
    if (!sessionUser?.isMember) return;
    const isMine =
      item.purchased_by === sessionUser.id ||
      item.purchased_by_name?.toLowerCase() === sessionUser.username?.toLowerCase();
    if (!isMine) {
      toast.error("You cannot modify another roommate's staged cart.");
      return;
    }

    setInCartItems((prev) => prev.filter((i) => i.id !== item.id));
    setOpenItems((prev) => [...prev, { ...item, is_purchased: false, purchased_by: null }]);

    startMutation(async () => {
      try {
        await returnToShoppingListAction(kitchen.id, item.id);
        toast.success(`Returned "${item.name}" to shopping list`);
      } catch (err: any) {
        setOpenItems(initialOpenItems);
        setInCartItems(initialInCartItems);
        toast.error(err.message || "Failed to return item to list.");
      }
    });
  };

  const handleResetChecklist = () => {
    const currentChecked = Array.from(checkedIds);
    setCheckedIds(new Set());
    clearGuestCartCookieClient(kitchen.id);

    if (currentChecked.length > 0) {
      startMutation(async () => {
        try {
          await Promise.all(
            currentChecked.map((id) =>
              stageGuestShoppingItemAction({ kitchenId: kitchen.id, itemId: id, isStaged: false })
            )
          );
        } catch {
          // Ignore background cleanup errors
        }
      });
    }

    toast.info("Cleared guest checklist.");
  };

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const filteredOpenItems = openItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const checkedCount = openItems.filter((item) => checkedIds.has(item.id)).length;
  const totalNeeded = openItems.length;
  const progressPercent =
    totalNeeded > 0 ? Math.round((checkedCount / totalNeeded) * 100) : 0;

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-24">
      {/* Top Header Card */}
      <Card className="border border-border/80 bg-card rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="gap-1.5 px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider"
            >
              <ShoppingBag className="w-3 h-3 text-accent-brand" />
              <span>Supermarket Mode</span>
            </Badge>
            <Badge
              variant={sessionUser?.isMember ? "accent" : "outline"}
              className="text-[10px]"
            >
              {sessionUser?.isMember ? "Live Sync Active" : "Guest View (7-day cookie cart)"}
            </Badge>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 px-2.5 rounded-xl text-xs text-muted-foreground hover:text-foreground gap-1.5"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">
            {kitchen.name}
          </h1>
          <p className="text-xs text-muted-foreground">
            {sessionUser?.isMember
              ? "Tapping items puts them directly into your active cart."
              : "Tick off items while shopping. Your temporary cart is saved automatically."}
          </p>
        </div>

        {/* Live Progress Bar */}
        {totalNeeded > 0 && (
          <div className="pt-2 border-t border-border/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-foreground">
                {sessionUser?.isMember
                  ? `${inCartItems.length} items in cart / ${totalNeeded + inCartItems.length} total`
                  : `${checkedCount} of ${totalNeeded} items collected`}
              </span>
              <span className="text-muted-foreground font-mono text-[11px]">
                {sessionUser?.isMember
                  ? `${Math.round((inCartItems.length / (totalNeeded + inCartItems.length)) * 100)}%`
                  : `${progressPercent}%`}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-accent-success transition-all duration-300 rounded-full"
                style={{
                  width: sessionUser?.isMember
                    ? `${Math.round((inCartItems.length / (totalNeeded + inCartItems.length)) * 100)}%`
                    : `${progressPercent}%`,
                }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Search / Filter if items exist */}
      {totalNeeded > 4 && (
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Quick search items..."
            className="h-10 pl-9 pr-3 text-xs rounded-2xl bg-card border-border/80"
          />
        </div>
      )}

      {/* Main Needed Checklist */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <span>Needed Items</span>
            <Badge variant="warm" className="text-[10px] font-mono px-1.5 py-0">
              {totalNeeded}
            </Badge>
          </div>

          {!sessionUser?.isMember && checkedCount > 0 && (
            <button
              type="button"
              onClick={handleResetChecklist}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition lowercase font-medium cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>reset ticks</span>
            </button>
          )}
        </div>

        {filteredOpenItems.length === 0 ? (
          <Card className="border border-dashed border-border/80 bg-card/60 rounded-3xl p-8 text-center space-y-2">
            {searchQuery ? (
              <p className="text-xs text-muted-foreground">
                No items match &ldquo;{searchQuery}&rdquo;.
              </p>
            ) : (
              <>
                <div className="w-10 h-10 rounded-2xl bg-accent-success/10 border border-accent-success/20 text-accent-success flex items-center justify-center mx-auto">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-foreground">All Stocked Up</h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  There are currently no open items on this kitchen&apos;s shopping list.
                </p>
              </>
            )}
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredOpenItems.map((item) => {
              const isChecked = !sessionUser?.isMember && checkedIds.has(item.id);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleToggleItem(item)}
                  disabled={isMutating}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-3.5 select-none cursor-pointer shadow-xs ${
                    isChecked
                      ? "bg-secondary/30 border-border/40 text-muted-foreground"
                      : "bg-card border-border/80 hover:border-border hover:bg-secondary/20 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Check Circle */}
                    <div
                      className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                        isChecked
                          ? "bg-accent-success border-accent-success text-primary-foreground"
                          : "border-border bg-secondary/40 text-transparent"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <span
                        className={`text-sm font-medium tracking-tight block truncate ${
                          isChecked
                            ? "line-through text-muted-foreground decoration-muted-foreground/60"
                            : "text-foreground"
                        }`}
                      >
                        {item.name}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5">
                    {sessionUser?.isMember && (
                      <span className="text-[10px] text-muted-foreground font-medium mr-1 hidden sm:inline">
                        Tap to put in cart
                      </span>
                    )}
                    {item.pantry_item_id ? (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 font-medium text-muted-foreground"
                      >
                        <Package className="w-2.5 h-2.5 mr-0.5" />
                        Pantry
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-medium">
                        Custom
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* In-Cart / Staged by Roommates (Collapsible) */}
      {inCartItems.length > 0 && (
        <Card className="border border-border/70 bg-card/60 rounded-3xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowInCart(!showInCart)}
            className="w-full p-4.5 flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              <CartIcon className="w-4 h-4 text-accent-success" />
              <span>In Cart / Staged ({inCartItems.length})</span>
              <Badge variant="pending" className="text-[10px] font-mono px-1.5 py-0">
                {inCartItems.length}
              </Badge>
            </div>
            {showInCart ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showInCart && (
            <div className="p-4 pt-0 divide-y divide-border/60">
              {inCartItems.map((item) => {
                const isMine =
                  !!sessionUser &&
                  (item.purchased_by === sessionUser.id ||
                    item.purchased_by_name?.toLowerCase() === sessionUser.username?.toLowerCase());
                const attribution = isMine
                  ? "You"
                  : item.purchased_by_name
                  ? capitalize(item.purchased_by_name)
                  : terminology.cartAttributionFallback;

                return (
                  <div
                    key={item.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-success shrink-0" />
                      <span className="truncate font-medium text-muted-foreground line-through decoration-muted-foreground/40">
                        {item.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {attribution}
                      </span>
                      {isMine ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReturnInCartItem(item)}
                          disabled={isMutating}
                          className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1 rounded-lg"
                          title="Return to needed list"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Return</span>
                        </Button>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 text-muted-foreground font-medium bg-muted/20 border-border/80"
                        >
                          In {attribution}&apos;s Cart
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Household Roster Section (Collapsible) */}
      <Card className="border border-border/70 bg-card/60 rounded-3xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowRoster(!showRoster)}
          className="w-full p-4.5 flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>{terminology.kitchenMembersTitle}</span>
            <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
              {kitchen.members.filter((m) => m.is_active).length}
            </Badge>
          </div>
          {showRoster ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showRoster && (
          <div className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {kitchen.members.map((member) => (
              <div
                key={member.id}
                className="p-2.5 rounded-xl bg-secondary/30 border border-border/60 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px] font-bold bg-secondary">
                      {member.kitchen_display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate font-medium text-foreground">
                    {capitalize(member.kitchen_display_name)}
                  </span>
                </div>
                <Badge
                  variant={member.role === "ADMIN" ? "accent" : "secondary"}
                  className="text-[9px] px-1.5 py-0"
                >
                  {member.role}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Persistent Floating Bottom Pill for Guests with Cart Items */}
      {!sessionUser?.isMember && checkedCount > 0 && (
        <div className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] inset-x-3 sm:inset-x-4 max-w-xl mx-auto z-40 transform-gpu will-change-transform p-3.5 sm:p-4 rounded-2xl bg-card/95 backdrop-blur-md border border-accent-brand/50 shadow-2xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-brand shrink-0 animate-pulse" />
            <span className="text-foreground font-medium truncate">
              <strong>{checkedCount} item{checkedCount === 1 ? "" : "s"}</strong> saved in temporary cart
            </span>
          </div>

          <Button asChild size="sm" variant="default" className="rounded-xl font-semibold gap-1.5 shrink-0 text-xs shadow-xs">
            <Link href={`/login?callbackUrl=${encodeURIComponent(`/kitchen/${kitchen.id}`)}`}>
              <span>Claim &amp; Log In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      )}

      {/* Bottom Sticky Footer Callout */}
      <div className="pt-4 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        {sessionUser?.isMember ? (
          <div className="flex items-center justify-between w-full">
            <span>You are viewing as a household member.</span>
            <Button asChild size="sm" variant="default" className="rounded-xl font-semibold gap-1">
              <Link href={`/kitchen/${kitchen.id}`}>
                <span>Open Dashboard</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full bg-card border border-border/80 p-3 rounded-2xl shadow-xs">
            <span className="text-muted-foreground">
              Want to add items or upload receipts?
            </span>
            <Button asChild size="sm" variant="secondary" className="rounded-xl text-xs font-semibold gap-1">
              <Link href={`/login?callbackUrl=${encodeURIComponent(`/kitchen/${kitchen.id}`)}`}>
                <span>Sign in</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
