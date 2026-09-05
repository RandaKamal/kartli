"use client";

import { useState, useTransition, useEffect, useOptimistic, useMemo } from "react";
import {
  addCustomShoppingItemAction,
  moveToCartAction,
  returnToShoppingListAction,
  removeShoppingListItemAction,
  moveAllNeededToCartAction,
  setPantryItemStockAction,
} from "@/app/actions/pantry";
import type { ShoppingListItem, KitchenSpaceType } from "@/types";
import { getSpaceWording } from "@/lib/space-wording";
import { cn } from "@/lib/utils";
import {
  ShoppingCart as CartIcon,
  Trash2,
  CheckCheck,
  Check,
  Loader2,
  Plus,
  ShoppingBag,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ShoppingListSectionProps {
  kitchenId: string;
  items: ShoppingListItem[];
  currentUserId?: string;
  isAdmin?: boolean;
  spaceType?: KitchenSpaceType;
  onViewCart?: () => void;
  onItemMovedToCart?: (item: ShoppingListItem) => void;
  onAllItemsMovedToCart?: (items: ShoppingListItem[]) => void;
  onPantryItemEmptied?: (pantryItemId: string) => void;
  onItemReturnedToList?: (item: ShoppingListItem) => void;
  onItemRemoved?: (item: ShoppingListItem) => void;
  onItemAdded?: (item: ShoppingListItem) => void;
}

type OptimisticUpdate =
  | { type: "UPDATE"; id: string; changes: Partial<ShoppingListItem> }
  | { type: "REMOVE"; id: string };

export function ShoppingListSection({
  kitchenId,
  items,
  currentUserId,
  isAdmin = false,
  spaceType = "FLATSHARE",
  onViewCart,
  onItemMovedToCart,
  onAllItemsMovedToCart,
  onPantryItemEmptied,
  onItemReturnedToList,
  onItemRemoved,
  onItemAdded,
}: ShoppingListSectionProps) {
  const wording = getSpaceWording(spaceType);
  const [optimisticListItems, setOptimisticListItems] = useOptimistic(
    items,
    (state: ShoppingListItem[], update: OptimisticUpdate) => {
      switch (update.type) {
        case "UPDATE":
          return state.map((item) =>
            item.id === update.id ? { ...item, ...update.changes } : item
          );
        case "REMOVE":
          return state.filter((item) => item.id !== update.id);
        default:
          return state;
      }
    }
  );
  const [customItemName, setCustomItemName] = useState("");
  const [showCheckedOut, setShowCheckedOut] = useState(true);
  const [clearedCheckedOut, setClearedCheckedOut] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isMovingAll, setIsMovingAll] = useState(false);
  const [reAddingItemId, setReAddingItemId] = useState<string | null>(null);
  const [checkedVisualIds, setCheckedVisualIds] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    const name = customItemName.trim();
    if (!name) return;

    setIsAdding(true);
    startTransition(async () => {
      try {
        const newItem = await addCustomShoppingItemAction(kitchenId, name);
        onItemAdded?.(newItem);
        setCustomItemName("");
        toast.success(`Added "${name}" to shopping list`);
      } catch (err: any) {
        toast.error(err.message || "Failed to add item.");
      } finally {
        setIsAdding(false);
      }
    });
  };

  const handleToggleCheckmark = (item: ShoppingListItem) => {
    const isCurrentlyPurchased = item.is_purchased || checkedVisualIds.has(item.id);
    const nextPurchased = !isCurrentlyPurchased;

    if (nextPurchased) {
      // Immediately mark as checked and strikethrough in UI (0ms feedback)
      setCheckedVisualIds((prev) => new Set(prev).add(item.id));

      startTransition(async () => {
        setOptimisticListItems({
          type: "UPDATE",
          id: item.id,
          changes: { is_purchased: true, purchased_by: currentUserId || null, is_guest_staged: false },
        });
        onItemMovedToCart?.(item);

        // Keep strikethrough visible briefly so user sees the completed checkmark before moving to cart
        setTimeout(() => {
          setCheckedVisualIds((prev) => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
        }, 500);

        try {
          await moveToCartAction(kitchenId, item.id);
          toast.success(`Moved "${item.name}" to cart`);
        } catch (err: any) {
          setCheckedVisualIds((prev) => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
          onItemReturnedToList?.(item);
          toast.error(err.message || "Failed to put item in cart.");
        }
      });
    } else {
      // Uncheck / return to needed list
      setCheckedVisualIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });

      startTransition(async () => {
        setOptimisticListItems({
          type: "UPDATE",
          id: item.id,
          changes: { is_purchased: false, purchased_by: null, is_guest_staged: false },
        });
        onItemReturnedToList?.(item);

        try {
          await returnToShoppingListAction(kitchenId, item.id);
          toast.success(`Returned "${item.name}" to shopping list`);
        } catch (err: any) {
          onItemMovedToCart?.(item);
          toast.error(err.message || "Failed to return item to list.");
        }
      });
    }
  };

  const handleMoveToCart = (item: ShoppingListItem) => {
    startTransition(async () => {
      setOptimisticListItems({
        type: "UPDATE",
        id: item.id,
        changes: { is_purchased: true, purchased_by: currentUserId || null, is_guest_staged: false },
      });
      onItemMovedToCart?.(item);

      try {
        await moveToCartAction(kitchenId, item.id);
        toast.success(`Moved "${item.name}" to cart`);
      } catch (err: any) {
        onItemReturnedToList?.(item);
        toast.error(err.message || "Failed to put item in cart.");
      }
    });
  };

  const handleRemove = (item: ShoppingListItem) => {
    if (item.is_purchased && item.purchased_by && item.purchased_by !== currentUserId && !isAdmin) {
      toast.error("You cannot delete an item staged in another roommate's cart.");
      return;
    }

    const isCustom = !item.pantry_item_id;

    startTransition(async () => {
      setOptimisticListItems({ type: "REMOVE", id: item.id });
      onItemRemoved?.(item);

      try {
        await removeShoppingListItemAction(kitchenId, item.id);
        if (isCustom) {
          toast.success(`Deleted "${item.name}" from shopping list`);
        } else {
          toast.success(`Removed "${item.name}" from list & restocked in pantry`);
        }
      } catch (err: any) {
        onItemReturnedToList?.(item);
        toast.error(err.message || "Failed to remove item.");
      }
    });
  };

  const openItems = optimisticListItems.filter(
    (i) => (!i.is_purchased && !i.is_guest_staged) || checkedVisualIds.has(i.id)
  );
  const myStagedItemsCount = optimisticListItems.filter(
    (i) =>
      i.is_purchased &&
      !i.is_guest_staged &&
      !i.checkout_id &&
      i.purchased_by === currentUserId &&
      !checkedVisualIds.has(i.id)
  ).length;

  const handleMoveAllToCart = () => {
    if (openItems.length === 0 || isMovingAll) return;
    const itemsToMove = [...openItems];
    setIsMovingAll(true);

    startTransition(async () => {
      // Optimistically update all open items
      for (const item of itemsToMove) {
        setOptimisticListItems({
          type: "UPDATE",
          id: item.id,
          changes: { is_purchased: true, purchased_by: currentUserId || null, is_guest_staged: false },
        });
      }
      onAllItemsMovedToCart?.(itemsToMove);

      try {
        await moveAllNeededToCartAction(kitchenId);
        toast.success(`Moved all ${itemsToMove.length} items to cart`);
      } catch (err: any) {
        for (const item of itemsToMove) {
          setOptimisticListItems({
            type: "UPDATE",
            id: item.id,
            changes: { is_purchased: false, purchased_by: null, is_guest_staged: false },
          });
          onItemReturnedToList?.(item);
        }
        toast.error(err.message || "Failed to move items to cart.");
      } finally {
        setIsMovingAll(false);
      }
    });
  };

  // Distinct recently checked-out items by name (up to 8 items) for 1-click re-ordering
  const resolvedItems = optimisticListItems.filter((i) => !!i.checkout_id);
  const uniqueRecentCheckedOut = useMemo(() => {
    const map = new Map<string, ShoppingListItem>();
    for (let i = resolvedItems.length - 1; i >= 0; i--) {
      const item = resolvedItems[i];
      const key = item.name.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, item);
      }
    }
    return Array.from(map.values()).slice(0, 8);
  }, [resolvedItems]);

  const handleReAddItem = (item: ShoppingListItem) => {
    const alreadyNeeded = openItems.some(
      (open) => open.name.trim().toLowerCase() === item.name.trim().toLowerCase()
    );
    if (alreadyNeeded) {
      toast.info(`"${item.name}" is already on your shopping list`);
      return;
    }

    setReAddingItemId(item.id);
    startTransition(async () => {
      try {
        if (item.pantry_item_id) {
          await setPantryItemStockAction(kitchenId, item.pantry_item_id, true);
          const newItem: ShoppingListItem = {
            id: `temp-${Date.now()}`,
            kitchen_id: kitchenId,
            pantry_item_id: item.pantry_item_id,
            name: item.name,
            item_price: item.item_price,
            currency: item.currency,
            is_purchased: false,
            purchased_by: null,
            is_guest_staged: false,
            checkout_id: null,
            created_at: new Date(),
          };
          onItemAdded?.(newItem);
          onPantryItemEmptied?.(item.pantry_item_id);
        } else {
          const newItem = await addCustomShoppingItemAction(kitchenId, item.name);
          onItemAdded?.(newItem);
        }
        toast.success(`Added "${item.name}" back to shopping list`);
      } catch (err: any) {
        toast.error(err.message || `Failed to re-add "${item.name}".`);
      } finally {
        setReAddingItemId(null);
      }
    });
  };

  return (
    <Card className="border border-border bg-card rounded-3xl p-4 sm:p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">Shopping List</h2>
        </div>

        {openItems.length > 0 && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleMoveAllToCart}
            disabled={isMovingAll}
            className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 border border-border/80 hover:border-primary/40 hover:bg-secondary text-foreground hover:text-primary transition-all cursor-pointer shadow-2xs active:scale-95"
            title="Move all needed items directly into your cart"
          >
            {isMovingAll ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CartIcon className="w-3.5 h-3.5 text-primary" />
            )}
            <span>Add All to Cart</span>
          </Button>
        )}
      </div>

      {/* Add Custom Item Input */}
      <form onSubmit={handleAddCustomItem} className="flex gap-2">
        <Input
          type="text"
          placeholder="Add extra item (e.g. Oat Milk, Coffee)..."
          value={customItemName}
          onChange={(e) => setCustomItemName(e.target.value)}
          disabled={isAdding}
          className="text-sm h-9 rounded-xl bg-background border-border text-foreground"
        />
        <Button
          type="submit"
          disabled={isAdding || !customItemName.trim()}
          size="sm"
          className="h-9 px-3 shrink-0 rounded-xl"
        >
          {isAdding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-1" />
          )}
          <span>Add</span>
        </Button>
      </form>

      {/* Needed Items List */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
            Needed Items
          </span>
          <span className="bg-secondary text-muted-foreground px-2 py-0.5 rounded-full text-[10px] font-medium">
            {openItems.length}
          </span>
        </div>

        {openItems.length === 0 ? (
          <div className="py-8 text-center rounded-2xl border border-dashed border-border bg-muted/30">
            <CheckCheck className="w-6 h-6 text-accent-success mx-auto mb-1.5 opacity-80" />
            <p className="text-sm font-medium text-foreground">{wording.emptyListHeading}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {wording.emptyListSub}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {openItems.map((item) => {
              const isChecked = item.is_purchased || checkedVisualIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-sm hover:bg-muted/40 px-2 rounded-xl transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isChecked}
                      onClick={() => handleToggleCheckmark(item)}
                      className={cn(
                        "w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer shrink-0",
                        isChecked
                          ? "bg-accent-success text-white border-accent-success shadow-xs"
                          : "border-border hover:border-accent-success/80 hover:bg-accent-success/10"
                      )}
                      title={isChecked ? "Checked (staged in cart)" : "Check off item"}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    <span
                      className={cn(
                        "font-medium truncate transition-all",
                        isChecked
                          ? "text-muted-foreground line-through decoration-muted-foreground/50"
                          : "text-foreground"
                      )}
                    >
                      {item.name}
                    </span>

                    {item.pantry_item_id ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 font-medium text-muted-foreground shrink-0 border-border"
                      >
                        Pantry
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 font-medium shrink-0 bg-secondary text-secondary-foreground"
                      >
                        Custom
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleMoveToCart(item)}
                      className="h-8 px-2.5 text-xs font-medium border-border hover:bg-secondary rounded-lg gap-1.5 cursor-pointer"
                      title="Put in shopping cart"
                    >
                      <CartIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Put in Cart</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemove(item)}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                      title={
                        item.pantry_item_id
                          ? "Remove from list and mark in-stock"
                          : "Delete item"
                      }
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Compact In-Cart Callout Bar (Strictly Current User's Staged Items) */}
      {myStagedItemsCount > 0 && (
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-muted/40 border border-border">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-accent-success shrink-0 shadow-xs" />
              <span className="text-xs text-muted-foreground font-medium truncate">
                <strong className="text-foreground font-semibold">{myStagedItemsCount}</strong> {myStagedItemsCount === 1 ? "item" : "items"} staged in your cart
              </span>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (onViewCart) {
                  onViewCart();
                } else if (typeof window !== "undefined") {
                  const url = new URL(window.location.href);
                  url.searchParams.set("tab", "cart");
                  window.history.replaceState({}, "", url.toString());
                }
              }}
              className="h-7 text-xs text-foreground hover:bg-muted gap-1 px-2.5 shrink-0 rounded-lg font-medium cursor-pointer"
            >
              <span>View Cart Tab</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Resolved / Recently checked out items (Expanded with 1-click re-add chips) */}
      {!clearedCheckedOut && (
        <div className="space-y-2.5 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            <span className="flex items-center gap-1.5">
              <CheckCheck className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
                Recently Checked Out
              </span>
              {uniqueRecentCheckedOut.length > 0 && (
                <span className="bg-secondary text-muted-foreground px-2 py-0.5 rounded-full text-[10px] font-medium">
                  {uniqueRecentCheckedOut.length}
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {uniqueRecentCheckedOut.length > 0 && (
                <button
                  type="button"
                  onClick={() => setClearedCheckedOut(true)}
                  className="text-[11px] font-medium normal-case tracking-normal text-muted-foreground hover:text-foreground transition cursor-pointer py-0.5 px-1.5 rounded-lg hover:bg-muted"
                  aria-label="Clear recent checked out list from view"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowCheckedOut((prev) => !prev)}
                className="text-[11px] font-medium normal-case tracking-normal text-muted-foreground hover:text-foreground transition cursor-pointer flex items-center gap-1 py-0.5 px-1.5 rounded-lg hover:bg-muted"
                aria-label={showCheckedOut ? "Hide recent checked out items" : "Show recent checked out items"}
              >
                <span>{showCheckedOut ? "Hide" : "Show"}</span>
                {showCheckedOut ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {showCheckedOut && (
            uniqueRecentCheckedOut.length === 0 ? (
              <div className="py-3 px-3 rounded-2xl border border-dashed border-border/70 bg-muted/20 text-center">
                <p className="text-xs text-muted-foreground">
                  No recently checked-out items yet. Completed groceries will appear here for fast 1-click re-ordering.
                </p>
              </div>
            ) : (
              <div className="space-y-2 animate-in fade-in-50 duration-200">
                <p className="text-[11px] text-muted-foreground px-1">
                  Quick re-add: tap any staple below to return it to your needed list:
                </p>
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {uniqueRecentCheckedOut.map((item) => {
                    const isAlreadyNeeded = openItems.some(
                      (open) => open.name.trim().toLowerCase() === item.name.trim().toLowerCase()
                    );
                    const isThisReAdding = reAddingItemId === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleReAddItem(item)}
                        disabled={isThisReAdding || isAlreadyNeeded}
                        title={
                          isAlreadyNeeded
                            ? `"${item.name}" is already on your shopping list`
                            : `Click to re-add "${item.name}" to shopping list`
                        }
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer select-none active:scale-95 shadow-2xs",
                          isAlreadyNeeded
                            ? "bg-secondary/40 border-border/60 text-muted-foreground opacity-60 cursor-default"
                            : "bg-secondary/70 hover:bg-secondary border-border hover:border-primary/40 text-foreground hover:text-primary transition-colors"
                        )}
                      >
                        {isThisReAdding ? (
                          <Loader2 className="w-3 h-3 animate-spin text-primary" />
                        ) : isAlreadyNeeded ? (
                          <Check className="w-3 h-3 text-primary" />
                        ) : (
                          <Plus className="w-3 h-3 text-primary" />
                        )}
                        <span>{item.name}</span>
                        {isAlreadyNeeded && (
                          <span className="text-[10px] text-muted-foreground/80 font-normal">
                            (Needed)
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </Card>
  );
}
