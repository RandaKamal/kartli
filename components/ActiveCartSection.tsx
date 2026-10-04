"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  returnToShoppingListAction,
  clearCartAction,
  completeItemPurchaseAction,
  moveToCartAction,
  moveAllNeededToCartAction,
  duplicateShoppingListItemAction,
} from "@/app/actions/pantry";
import type { ShoppingListItem, KitchenSpaceType, PantryItem } from "@/types";
import { getSpaceTerminology } from "@/lib/spaceTerminology";
import { capitalize, cn } from "@/lib/utils";
import { CheckoutDialog } from "@/components/CheckoutDialog";
import {
  ShoppingCart as CartIcon,
  RotateCcw,
  Trash2,
  Receipt,
  Users,
  ShoppingBag,
  User,
  Check,
  Plus,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export interface ActiveCartSectionProps {
  kitchenId: string;
  items: ShoppingListItem[];
  pantryItems?: PantryItem[];
  currentUserId: string;
  spaceType?: KitchenSpaceType;
  onSwitchTab?: (tab: string) => void;
  onItemReturnedToList?: (item: ShoppingListItem) => void;
  onItemMovedToCart?: (item: ShoppingListItem) => void;
  onItemPurchasedToggle?: (item: ShoppingListItem, isPurchased: boolean) => void;
  onQuickAddStaple?: (pantryItem: PantryItem) => void;
  onAllItemsMovedToCart?: () => void;
}

export function ActiveCartSection({
  kitchenId,
  items,
  pantryItems = [],
  currentUserId,
  spaceType = "FLATSHARE",
  onSwitchTab,
  onItemReturnedToList,
  onItemMovedToCart,
  onItemPurchasedToggle,
  onQuickAddStaple,
  onAllItemsMovedToCart,
}: ActiveCartSectionProps) {
  const router = useRouter();
  const [allItems, setAllItems] = useState<ShoppingListItem[]>(items);
  const [isPending, startTransition] = useTransition();
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  // Quick-Add Staples Collapsible Tray State
  const [isStaplesTrayOpen, setIsStaplesTrayOpen] = useState(true);
  const [stapleSearch, setStapleSearch] = useState("");

  const terminology = getSpaceTerminology(spaceType);

  useEffect(() => {
    setAllItems(items);
  }, [items]);

  // Partition items
  const neededItems = allItems.filter(
    (i) => !i.is_in_cart && !i.is_purchased && !i.is_guest_staged
  );

  const myCartItems = allItems.filter(
    (i) =>
      (i.is_in_cart || i.is_purchased) &&
      !i.is_guest_staged &&
      !i.checkout_id &&
      i.purchased_by === currentUserId
  );

  const otherCartItems = allItems.filter(
    (i) =>
      (i.is_in_cart || i.is_purchased || i.is_guest_staged) &&
      !i.checkout_id &&
      (i.purchased_by !== currentUserId || i.is_guest_staged)
  );

  const filteredStaples = pantryItems.filter((staple) =>
    staple.name.toLowerCase().includes(stapleSearch.trim().toLowerCase())
  );

  // One-tap move needed item directly to basket
  const handleMoveNeededToCart = (item: ShoppingListItem) => {
    const updated: ShoppingListItem = {
      ...item,
      is_in_cart: true,
      is_purchased: false,
      purchased_by: currentUserId,
      is_guest_staged: false,
    };

    setAllItems((prev) =>
      prev.map((i) => (i.id === item.id ? updated : i))
    );

    onItemMovedToCart?.(updated);

    startTransition(async () => {
      try {
        await moveToCartAction(kitchenId, item.id);
        router.refresh();
        toast.success(`Added "${item.name}" to your basket`);
      } catch (err: any) {
        setAllItems(items);
        toast.error(err.message || "Failed to add item to basket.");
      }
    });
  };

  // One-tap move all needed items to basket
  const handleAllNeededToCart = () => {
    if (neededItems.length === 0) return;

    setAllItems((prev) =>
      prev.map((i) =>
        !i.is_in_cart && !i.is_purchased && !i.is_guest_staged
          ? { ...i, is_in_cart: true, is_purchased: false, purchased_by: currentUserId }
          : i
      )
    );

    onAllItemsMovedToCart?.();

    startTransition(async () => {
      try {
        await moveAllNeededToCartAction(kitchenId);
        router.refresh();
        toast.success("All needed items moved to your basket");
      } catch (err: any) {
        setAllItems(items);
        toast.error(err.message || "Failed to move items to basket.");
      }
    });
  };

  // Toggle item bought (large touch target check-off)
  const handleToggleItemBought = (item: ShoppingListItem) => {
    const nextPurchased = !item.is_purchased;
    const updated: ShoppingListItem = {
      ...item,
      is_purchased: nextPurchased,
      is_in_cart: true,
    };

    setAllItems((prev) =>
      prev.map((i) => (i.id === item.id ? updated : i))
    );

    onItemPurchasedToggle?.(item, nextPurchased);

    startTransition(async () => {
      try {
        await completeItemPurchaseAction(kitchenId, item.id, nextPurchased);
        router.refresh();
        toast.success(
          nextPurchased ? `Marked "${item.name}" as bought` : `Unchecked "${item.name}"`
        );
      } catch (err: any) {
        setAllItems(items);
        toast.error(err.message || "Failed to update item.");
      }
    });
  };

  // Return item from basket to needed queue
  const handleReturnToList = (item: ShoppingListItem) => {
    if (item.purchased_by !== currentUserId) {
      toast.error(`You cannot modify another ${terminology.memberLabel.toLowerCase()}'s cart.`);
      return;
    }

    const updatedItem: ShoppingListItem = {
      ...item,
      is_in_cart: false,
      is_purchased: false,
      purchased_by: null,
      is_guest_staged: false,
    };

    setAllItems((prev) =>
      prev.map((i) => (i.id === item.id ? updatedItem : i))
    );

    onItemReturnedToList?.(updatedItem);

    startTransition(async () => {
      try {
        await returnToShoppingListAction(kitchenId, item.id);
        router.refresh();
        toast.success(`Returned "${item.name}" to shopping queue`);
      } catch (err: any) {
        setAllItems(items);
        toast.error(err.message || "Failed to return item to list.");
      }
    });
  };

  // Duplicate an item staged by another roommate into current user's basket
  const handleDuplicateItem = (item: ShoppingListItem) => {
    const tempId = `temp-${Date.now()}`;
    const duplicated: ShoppingListItem = {
      ...item,
      id: tempId,
      is_in_cart: true,
      is_purchased: false,
      purchased_by: currentUserId,
      is_guest_staged: false,
    };
    setAllItems((prev) => [duplicated, ...prev]);
    onItemMovedToCart?.(duplicated);
    toast.success(`Added duplicate "${item.name}" to your basket`);

    startTransition(async () => {
      try {
        const newItem = await duplicateShoppingListItemAction(kitchenId, item.id, true);
        setAllItems((prev) => prev.map((i) => (i.id === tempId ? newItem : i)));
      } catch (err: any) {
        setAllItems(items);
        toast.error(err.message || "Failed to duplicate item.");
      }
    });
  };

  // Clear all items in user's basket
  const handleClearCart = () => {
    const count = myCartItems.length;
    if (count === 0) return;

    const clearedItems = myCartItems.map((i) => ({
      ...i,
      is_in_cart: false,
      is_purchased: false,
      purchased_by: null,
      is_guest_staged: false,
    }));

    setAllItems((prev) =>
      prev.map((i) => {
        if (
          (i.is_in_cart || i.is_purchased) &&
          !i.is_guest_staged &&
          !i.checkout_id &&
          i.purchased_by === currentUserId
        ) {
          return { ...i, is_in_cart: false, is_purchased: false, purchased_by: null, is_guest_staged: false };
        }
        return i;
      })
    );

    clearedItems.forEach((item) => onItemReturnedToList?.(item));

    startTransition(async () => {
      try {
        await clearCartAction(kitchenId);
        router.refresh();
        toast.success(`Returned ${count} item${count === 1 ? "" : "s"} to shopping queue`);
      } catch (err: any) {
        setAllItems(items);
        toast.error(err.message || "Failed to clear cart.");
      }
    });
  };

  const handleProceedToCheckout = () => {
    if (myCartItems.length === 0) {
      toast.error("Your basket is empty.");
      return;
    }
    setIsCheckoutModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 1. COMPACT "QUICK-ADD STAPLES" COLLAPSIBLE TRAY */}
      {pantryItems && pantryItems.length > 0 && (
        <Card className="border border-border/80 bg-card rounded-2xl overflow-hidden shadow-xs">
          <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3 bg-muted/20">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-foreground tracking-tight">
                    Quick-Add Staples
                  </h3>
                  <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 border-border">
                    {pantryItems.length}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  Forgot something? Tap any essential to grab it directly into your basket.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsStaplesTrayOpen(!isStaplesTrayOpen)}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0 rounded-lg gap-1"
            >
              <span>{isStaplesTrayOpen ? "Collapse" : "Expand"}</span>
              {isStaplesTrayOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
          </div>

          {isStaplesTrayOpen && (
            <div className="p-3.5 sm:p-4 pt-2 border-t border-border/60 space-y-3">
              {pantryItems.length > 8 && (
                <div className="relative w-full max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                  <Input
                    value={stapleSearch}
                    onChange={(e) => setStapleSearch(e.target.value)}
                    placeholder="Search staples..."
                    className="h-8 pl-8 pr-3 text-xs rounded-lg bg-secondary/30 border-border/70"
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                {filteredStaples.map((staple) => {
                  const isInMyCart = myCartItems.some((i) => i.pantry_item_id === staple.id);
                  const isNeeded = neededItems.some((i) => i.pantry_item_id === staple.id);

                  if (isInMyCart) {
                    const cartItem = myCartItems.find((i) => i.pantry_item_id === staple.id);
                    return (
                      <button
                        key={staple.id}
                        type="button"
                        onClick={() => cartItem && handleReturnToList(cartItem)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-500/10 hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 shadow-2xs select-none cursor-pointer transition-all group"
                        title="Tap to remove from basket and return to queue"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5] group-hover:hidden" />
                        <RotateCcw className="w-3.5 h-3.5 hidden group-hover:inline stroke-[2.5]" />
                        <span className="line-through group-hover:no-underline">{staple.name}</span>
                        <span className="text-[10px] font-mono opacity-70 ml-0.5 group-hover:hidden">In Basket</span>
                        <span className="text-[10px] font-mono opacity-70 ml-0.5 hidden group-hover:inline">Remove</span>
                      </button>
                    );
                  }

                  if (isNeeded) {
                    const neededItem = neededItems.find((i) => i.pantry_item_id === staple.id)!;
                    return (
                      <button
                        key={staple.id}
                        type="button"
                        onClick={() => handleMoveNeededToCart(neededItem)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-800 dark:text-amber-200 transition-all cursor-pointer shadow-2xs active:scale-95 select-none"
                        title="Click to drop into your basket"
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-500" />
                        <span>{staple.name}</span>
                        <span className="text-[10px] font-mono text-amber-700 dark:text-amber-300 font-normal ml-0.5">
                          + Basket
                        </span>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={staple.id}
                      type="button"
                      onClick={() => onQuickAddStaple?.(staple)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-secondary/60 hover:bg-secondary border border-border/70 hover:border-border text-foreground transition-all cursor-pointer shadow-2xs active:scale-95 select-none"
                      title="Grab staple into basket"
                    >
                      <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{staple.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* 2. NEEDED ITEMS QUICK-REFERENCE (Tap directly into basket) */}
      {neededItems.length > 0 && (
        <Card className="border border-border/80 bg-card rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                    Needed for This Run
                  </h3>
                  <Badge variant="secondary" className="text-xs font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25">
                    {neededItems.length}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tap any item to drop it directly into your basket.
                </p>
              </div>
            </div>

            {neededItems.length > 1 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAllNeededToCart}
                disabled={isPending}
                className="h-8.5 rounded-xl text-xs font-semibold px-3 border-border hover:bg-secondary shrink-0 gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Put All in Basket</span>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {neededItems.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => handleMoveNeededToCart(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleMoveNeededToCart(item);
                  }
                }}
                className="group flex items-center justify-between p-3 rounded-xl border border-border/70 bg-secondary/30 hover:bg-secondary/60 hover:border-border transition-all cursor-pointer select-none active:scale-[0.99] min-h-[50px]"
                title="Tap to put in basket"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-6 h-6 rounded-lg bg-background border border-border/80 flex items-center justify-center text-muted-foreground group-hover:text-foreground group-hover:border-primary shrink-0 transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                    {item.name}
                  </span>
                  {item.pantry_item_id ? (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0 border border-border/40">
                      Staple
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0 border border-border/40">
                      Custom
                    </span>
                  )}
                </div>

                <span className="text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-1 shrink-0 ml-2">
                  <span>+ Basket</span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 3. ACTIVE SHOPPING CHECKLIST WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Your Basket */}
        <Card className="border border-border/80 bg-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/60">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CartIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-tight">
                  Your Basket
                </h2>
                <Badge
                  variant="secondary"
                  className="text-xs font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
                >
                  {myCartItems.length}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Check off items as you place them into your shopping basket.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {myCartItems.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearCart}
                  disabled={isPending}
                  className="rounded-xl text-xs font-semibold h-8.5 px-3 border-border hover:bg-secondary gap-1 cursor-pointer"
                  title="Empty basket"
                >
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="hidden sm:inline">Empty</span>
                </Button>
              )}

              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleProceedToCheckout}
                disabled={myCartItems.length === 0}
                className="rounded-xl text-xs font-bold h-8.5 px-3.5 gap-1.5 shadow-sm cursor-pointer"
                title="Proceed to checkout"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Checkout</span>
              </Button>
            </div>
          </div>

          {myCartItems.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-border bg-muted/20 space-y-2.5">
              <div className="w-10 h-10 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mx-auto text-muted-foreground">
                <CartIcon className="w-5 h-5" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <p className="text-xs sm:text-sm font-semibold text-foreground">
                  Your basket is currently empty
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {neededItems.length > 0
                    ? "Tap any item in 'Needed for This Run' above to add it to your basket."
                    : "Tap a staple from the Quick-Add tray or browse your kitchen board."}
                </p>
              </div>
              {onSwitchTab && (
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onSwitchTab("kitchen")}
                    className="rounded-xl text-xs font-semibold gap-1.5 h-8.5 px-3.5 cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Go to Kitchen Board</span>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {myCartItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "p-3 sm:p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 min-h-[56px] select-none",
                    item.is_purchased
                      ? "bg-muted/30 border-border/50 opacity-80"
                      : "bg-secondary/40 hover:bg-secondary/70 border-border/80 shadow-2xs"
                  )}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleToggleItemBought(item)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleToggleItemBought(item);
                      }
                    }}
                    className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleItemBought(item);
                      }}
                      aria-label={
                        item.is_purchased
                          ? `Mark ${item.name} as not bought`
                          : `Mark ${item.name} as bought`
                      }
                      className={cn(
                        "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 cursor-pointer",
                        item.is_purchased
                          ? "bg-accent-brand border-accent-brand text-accent-foreground shadow-xs"
                          : "border-muted-foreground/40 hover:border-accent-brand bg-background"
                      )}
                    >
                      {item.is_purchased && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "text-sm sm:text-base font-semibold block truncate leading-tight transition-all",
                          item.is_purchased
                            ? "line-through text-muted-foreground"
                            : "text-foreground"
                        )}
                      >
                        {item.name}
                      </span>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {item.is_purchased ? "✓ In Basket • Bought" : "To Pick Up"}
                        </span>
                        {item.pantry_item_id && (
                          <span className="text-[9px] font-mono text-muted-foreground/70 uppercase">
                            • Staple
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleReturnToList(item)}
                      disabled={isPending}
                      className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
                      title="Return to needed list"
                      aria-label={`Return ${item.name} to list`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Right Column: Roommate Carts (Read-Only) */}
        <Card className="border border-border/80 bg-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-base font-semibold text-foreground">
                Staged by {terminology.memberLabelPlural}
              </h3>
              <Badge variant="secondary" className="text-xs font-mono">
                {otherCartItems.length}
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground">Read-only store view</span>
          </div>

          {otherCartItems.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-border bg-muted/20">
              <p className="text-xs text-muted-foreground">
                No items currently staged by {terminology.memberLabelPlural.toLowerCase()}.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {otherCartItems.map((item) => {
                const isGuest = item.is_guest_staged;
                const attribution = isGuest
                  ? "Guest"
                  : item.purchased_by_name
                  ? capitalize(item.purchased_by_name)
                  : terminology.cartAttributionFallback;

                return (
                  <div
                    key={item.id}
                    className="py-3 flex items-center justify-between gap-3 text-sm hover:bg-muted/40 px-2 rounded-xl transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 flex-wrap">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isGuest ? "bg-accent-ochre" : "bg-accent-sage/70"
                        }`}
                      />
                      <span className="font-medium text-muted-foreground truncate">
                        {item.name}
                      </span>
                      {item.pantry_item_id && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 font-medium text-muted-foreground shrink-0 border-border"
                        >
                          Staple
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isGuest ? (
                        <Badge
                          variant="warm"
                          className="text-[10px] px-2 py-0.5 font-medium shrink-0 bg-accent-ochre/15 text-accent-warning border-accent-ochre/30 gap-1"
                        >
                          <User className="w-3 h-3" />
                          <span>Guest</span>
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-2 py-0.5 text-muted-foreground shrink-0 bg-muted/40 border-border gap-1"
                        >
                          <User className="w-3 h-3 text-muted-foreground/70" />
                          <span>In {attribution}&apos;s Cart</span>
                        </Badge>
                      )}

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDuplicateItem(item)}
                        className="h-7 px-2 text-[11px] font-semibold text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
                        title="Add duplicate to my basket"
                      >
                        <Plus className="w-3 h-3 mr-0.5" />
                        <span>Duplicate</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <CheckoutDialog
        kitchenId={kitchenId}
        stagedCartItems={myCartItems.map((i) => ({
          id: i.id,
          name: i.name,
          pantry_item_id: i.pantry_item_id,
        }))}
        isOpen={isCheckoutModalOpen}
        onOpenChange={setIsCheckoutModalOpen}
      />
    </div>
  );
}
