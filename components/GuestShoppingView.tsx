"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { PublicKitchenContext, ShoppingListItem } from "@/types";
import {
  ShoppingBag,
  Check,
  Circle,
  CheckCircle2,
  RotateCcw,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Package,
  ArrowRight,
  Sparkles,
  Search,
  ShoppingCart as CartIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export interface GuestShoppingViewProps {
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
  const isMember = !!sessionUser?.isMember;
  const [openItems, setOpenItems] = useState<ShoppingListItem[]>(initialOpenItems);
  const [inCartItems, setInCartItems] = useState<ShoppingListItem[]>(initialInCartItems);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [showInCart, setShowInCart] = useState(false);
  const [isRefreshing, startTransition] = useTransition();
  const [isMutating, startMutation] = useTransition();

  // Load guest cookie on initial mount
  useEffect(() => {
    if (sessionUser?.isMember) return;
    // Merge cookie with server-staged items so checks survive cookie loss/reloads
    const saved = readGuestCartCookie(kitchen.id);
    const staged = initialOpenItems.filter((i) => i.is_guest_staged).map((i) => i.id);
    const merged = Array.from(new Set([...saved, ...staged]));
    if (merged.length > 0) {
      setCheckedIds(new Set(merged));
      writeGuestCartCookie(kitchen.id, merged);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kitchen.id]);

  useEffect(() => {
    setOpenItems(initialOpenItems);
    setInCartItems(initialInCartItems);
  }, [initialOpenItems, initialInCartItems]);

  // Guest view: one unified list. Items in a roommate's cart are is_purchased rows.
  const guestItems = [...openItems, ...inCartItems];
  const isGuestChecked = (item: ShoppingListItem) =>
    !!item.is_purchased || checkedIds.has(item.id);
  const guestCheckedCount = guestItems.filter(isGuestChecked).length;
  const guestProgressPercent =
    guestItems.length > 0 ? Math.round((guestCheckedCount / guestItems.length) * 100) : 0;

  const handleToggleItem = (item: ShoppingListItem) => {
    // Case A: Authenticated member (real-time server action)
    if (isMember) {
      setOpenItems((prev) => prev.filter((i) => i.id !== item.id));
      setInCartItems((prev) => [
        ...prev,
        {
          ...item,
          is_purchased: true,
          purchased_by_name: sessionUser?.username ?? null,
        },
      ]);

      startMutation(async () => {
        try {
          await moveToCartAction(kitchen.id, item.id, item.name);
          toast.success(`Moved "${item.name}" to cart`);
        } catch (err: any) {
          setOpenItems(initialOpenItems);
          setInCartItems(initialInCartItems);
          toast.error(err.message || "Failed to move item to cart.");
        }
      });
      return;
    }

    // Case B: Unauthenticated guest (cookie-tracked checkmarks + server staging).
    // Items already in a roommate's cart are read-only for guests.
    if (item.is_purchased) return;

    const isNowChecked = !checkedIds.has(item.id);
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (isNowChecked) {
        next.add(item.id);
      } else {
        next.delete(item.id);
      }
      writeGuestCartCookie(kitchen.id, Array.from(next));
      return next;
    });

    startMutation(async () => {
      try {
        await stageGuestShoppingItemAction({
          kitchenId: kitchen.id,
          itemId: item.id,
          isStaged: isNowChecked,
        });
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

  // Member view: needed items only (in-cart items get their own card below).
  const filteredOpenItems = openItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  // Guest view: unified list, unchecked first, checked items sink to the bottom.
  const guestFiltered = guestItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );
  const guestRows = [
    ...guestFiltered.filter((item) => !isGuestChecked(item)),
    ...guestFiltered.filter((item) => isGuestChecked(item)),
  ];

  const checkedCount = openItems.filter((item) => checkedIds.has(item.id)).length;
  const totalNeeded = openItems.length;
  const memberProgressPercent =
    totalNeeded > 0 ? Math.round((checkedCount / totalNeeded) * 100) : 0;

  const renderGuestRow = (item: ShoppingListItem) => {
    const roommateCart = !!item.is_purchased;
    const checked = isGuestChecked(item);
    const roommateName = item.purchased_by_name ? capitalize(item.purchased_by_name) : null;
    const hint = roommateCart
      ? `In ${roommateName ?? "a roommate"}'s cart`
      : checked
      ? "In your cart · tap to undo"
      : "Tap to put in cart";

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleToggleItem(item)}
        disabled={roommateCart || isMutating}
        className={`w-full text-left p-3.5 rounded-xl border transition-all duration-150 flex items-center justify-between gap-3 select-none ${
          roommateCart ? "cursor-default" : "cursor-pointer active:scale-[0.99]"
        } ${
          checked
            ? "bg-muted/40 border-border/50 opacity-75 shadow-none"
            : "bg-card border-border/80 hover:border-foreground/20 hover:bg-muted/30 shadow-xs"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {checked ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
          ) : (
            <Circle className="w-5 h-5 shrink-0 text-foreground/40" />
          )}
          <div className="min-w-0 flex-1">
            <span
              className={`text-sm font-medium tracking-tight block truncate ${
                checked ? "line-through text-muted-foreground" : "text-foreground"
              }`}
            >
              {item.name}
            </span>
            <span className="text-[11px] text-muted-foreground block truncate">{hint}</span>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-1.5">
          {item.pantry_item_id ? (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium text-muted-foreground">
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
  };

  return (
    <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-4 pb-32 sm:pb-32">
      {/* Sleek, Focused Mobile-First Shopping Header */}
      <Card className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 space-y-3.5 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
              {kitchen.name}
            </h1>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border/60 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>{isMember ? "Live Sync" : "Guest Mode"}</span>
            </span>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5 transition-colors cursor-pointer shrink-0"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {/* Live Progress Bar */}
        {(isMember ? totalNeeded + inCartItems.length : guestItems.length) > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-border/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">
                {isMember
                  ? `${inCartItems.length} of ${totalNeeded + inCartItems.length} in cart`
                  : `${guestCheckedCount} of ${guestItems.length} collected`}
              </span>
              <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
                {isMember
                  ? `${Math.round((inCartItems.length / (totalNeeded + inCartItems.length || 1)) * 100)}%`
                  : `${guestProgressPercent}%`}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                style={{
                  width: `${isMember
                    ? Math.round((inCartItems.length / (totalNeeded + inCartItems.length || 1)) * 100)
                    : guestProgressPercent}%`,
                }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Search / Filter if items exist */}
      {(isMember ? totalNeeded : guestItems.length) > 4 && (
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Quick search items..."
            className="h-9 pl-9 pr-3 text-xs rounded-lg bg-card border-border/80"
          />
        </div>
      )}

      {/* Main Checklist */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <span>{isMember ? "Needed Items" : "Shopping list"}</span>
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border/60 tabular-nums">
              {isMember ? totalNeeded : guestItems.length}
            </span>
          </div>

          {!isMember && checkedCount > 0 && (
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

        {isMember ? (
          filteredOpenItems.length === 0 ? (
            <EmptyState searchQuery={searchQuery} />
          ) : (
            <div className="space-y-2">
              {filteredOpenItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleToggleItem(item)}
                  disabled={isMutating}
                  className="w-full text-left p-3 rounded-xl border transition-all duration-150 flex items-center justify-between gap-3 select-none cursor-pointer active:scale-[0.99] bg-card border-border/80 hover:border-foreground/20 hover:bg-muted/30 text-foreground shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-5 h-5 rounded-md border flex items-center justify-center shrink-0 border-foreground/40 bg-background text-transparent">
                      <Check className="w-3.5 h-3.5 stroke-[3] scale-50 opacity-0" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium tracking-tight block truncate text-foreground">
                        {item.name}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground font-medium mr-1 hidden sm:inline">
                      Tap to put in cart
                    </span>
                    {item.pantry_item_id ? (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium text-muted-foreground">
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
              ))}
            </div>
          )
        ) : guestRows.length === 0 ? (
          <EmptyState searchQuery={searchQuery} />
        ) : (
          <div className="space-y-2">{guestRows.map(renderGuestRow)}</div>
        )}
      </div>

      {/* Member only: items in household carts, with Return */}
      {isMember && inCartItems.length > 0 && (
        <Card className="border border-border/70 bg-card rounded-xl overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setShowInCart(!showInCart)}
            className="w-full p-3.5 flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              <CartIcon className="w-4 h-4 text-emerald-500" />
              <span>In Cart / Staged</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border/60 tabular-nums">
                {inCartItems.length}
              </span>
            </div>
            {showInCart ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showInCart && (
            <div className="p-3.5 pt-0 divide-y divide-border/60">
              {inCartItems.map((item) => {
                const isMine =
                  item.purchased_by === sessionUser?.id ||
                  item.purchased_by_name?.toLowerCase() === sessionUser?.username?.toLowerCase();
                const attribution = isMine
                  ? "You"
                  : item.purchased_by_name
                  ? capitalize(item.purchased_by_name)
                  : terminology.cartAttributionFallback;

                return (
                  <div
                    key={item.id}
                    className="py-2 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
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
                          className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1 rounded-md"
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

      {/* Persistent Floating Bottom Pill for Guests with Cart Items */}
      {!isMember && checkedCount > 0 && (
        <div className="fixed bottom-3 sm:bottom-4 inset-x-3 sm:inset-x-4 max-w-2xl mx-auto z-40 pointer-events-auto p-3 sm:p-3.5 rounded-xl bg-card/95 backdrop-blur-md border border-border/80 shadow-lg flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-foreground font-medium truncate tabular-nums">
              <strong>{checkedCount} item{checkedCount === 1 ? "" : "s"}</strong> in temporary cart
            </span>
          </div>

          <Button asChild size="sm" variant="default" className="rounded-lg font-medium gap-1.5 shrink-0 text-xs shadow-xs h-8">
            <Link href={`/login?callbackUrl=${encodeURIComponent(`/kitchen/${kitchen.id}`)}`}>
              <span>Claim &amp; Log In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      )}

      {/* Bottom Sticky Footer Callout */}
      <div className="pt-4 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        {isMember ? (
          <div className="flex items-center justify-between w-full">
            <span>Viewing as a household member.</span>
            <Button asChild size="sm" variant="secondary" className="rounded-lg font-medium gap-1 h-8">
              <Link href={`/kitchen/${kitchen.id}`}>
                <span>Open Dashboard</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full bg-card border border-border/80 p-3 rounded-xl shadow-xs">
            <span className="text-muted-foreground">
              Want to add items or upload receipts?
            </span>
            <Button asChild size="sm" variant="secondary" className="rounded-lg text-xs font-medium gap-1 h-8">
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

function EmptyState({ searchQuery }: { searchQuery: string }) {
  return (
    <Card className="border border-dashed border-border/80 bg-card/40 rounded-xl py-12 px-6 text-center space-y-3 shadow-xs">
      {searchQuery ? (
        <p className="text-xs text-muted-foreground">
          No items match &ldquo;{searchQuery}&rdquo;.
        </p>
      ) : (
        <>
          <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center mx-auto text-emerald-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-semibold text-foreground tracking-tight">All stocked up</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              There are no pending shopping items for this kitchen right now.
            </p>
          </div>
        </>
      )}
    </Card>
  );
}
