"use client";

import { useState, useTransition, useOptimistic } from "react";
import {
  addCustomShoppingItemAction,
  moveToCartAction,
  returnToShoppingListAction,
  removeShoppingListItemAction,
} from "@/app/actions/pantry";
import type { ShoppingListItem, KitchenSpaceType } from "@/types";
import { cn } from "@/lib/utils";
import {
  ShoppingCart as CartIcon,
  Trash2,
  Check,
  Loader2,
  Plus,
  ShoppingBag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export interface ShoppingListSectionProps {
  kitchenId: string;
  items: ShoppingListItem[];
  currentUserId?: string;
  isAdmin?: boolean;
  spaceType?: KitchenSpaceType;
  onViewCart?: () => void;
  onAddToCart?: (item: ShoppingListItem) => void;
  onItemMovedToCart?: (item: ShoppingListItem) => void;
  onAllItemsMovedToCart?: (items: ShoppingListItem[]) => void;
  onPantryItemEmptied?: (pantryItemId: string) => void;
  onItemReturnedToList?: (item: ShoppingListItem) => void;
  onItemRemoved?: (item: ShoppingListItem) => void;
  onItemAdded?: (item: ShoppingListItem) => void;
  hideInput?: boolean;
}

type OptimisticUpdate =
  | { type: "UPDATE"; id: string; changes: Partial<ShoppingListItem> }
  | { type: "REMOVE"; id: string };

export function ShoppingListSection({
  kitchenId,
  items,
  currentUserId,
  isAdmin = false,
  onViewCart,
  onAddToCart,
  onItemMovedToCart,
  onAllItemsMovedToCart,
  onPantryItemEmptied,
  onItemReturnedToList,
  onItemRemoved,
  onItemAdded,
  hideInput = false,
}: ShoppingListSectionProps) {
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
  const [isAdding, setIsAdding] = useState(false);
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
        toast.success(`Added "${name}" to shopping queue`);
      } catch (err: any) {
        toast.error(err.message || "Failed to add item.");
      } finally {
        setIsAdding(false);
      }
    });
  };

  const handleAddToCart = (item: ShoppingListItem) => {
    startTransition(async () => {
      setOptimisticListItems({
        type: "UPDATE",
        id: item.id,
        changes: {
          is_purchased: true,
          purchased_by: currentUserId || null,
          is_guest_staged: false,
        },
      });

      onAddToCart?.(item);
      onItemMovedToCart?.(item);

      try {
        await moveToCartAction(kitchenId, item.id);
        toast.success(`Added "${item.name}" to cart`, {
          action: onViewCart
            ? {
                label: "View Cart",
                onClick: onViewCart,
              }
            : undefined,
        });
      } catch (err: any) {
        setOptimisticListItems({
          type: "UPDATE",
          id: item.id,
          changes: {
            is_purchased: false,
            purchased_by: null,
            is_guest_staged: false,
          },
        });
        onItemReturnedToList?.(item);
        toast.error(err.message || "Failed to put item in cart.");
      }
    });
  };

  const handleToggleCheckmark = (item: ShoppingListItem) => {
    if (checkedVisualIds.has(item.id)) return;

    // 0ms feedback: immediately check and strikethrough
    setCheckedVisualIds((prev) => new Set(prev).add(item.id));

    setTimeout(() => {
      startTransition(async () => {
        setOptimisticListItems({
          type: "UPDATE",
          id: item.id,
          changes: {
            is_purchased: true,
            purchased_by: currentUserId || null,
            is_guest_staged: false,
          },
        });
        onAddToCart?.(item);
        onItemMovedToCart?.(item);

        setCheckedVisualIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });

        try {
          await moveToCartAction(kitchenId, item.id);
          toast.success(`Bought "${item.name}"`);
        } catch (err: any) {
          setCheckedVisualIds((prev) => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
          onItemReturnedToList?.(item);
          toast.error(err.message || "Failed to mark item as bought.");
        }
      });
    }, 280);
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
          toast.success(`Deleted "${item.name}" from queue`);
        } else {
          toast.success(`Restocked "${item.name}" in staples`);
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

  if (openItems.length === 0 && hideInput) {
    return null;
  }

  return (
    <div className="space-y-2 select-none">
      {/* Editorial Section Label */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
            Shopping Queue
          </span>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
            {openItems.length}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground/70 hidden sm:inline">
          Check off or stage to cart
        </span>
      </div>

      {/* Optional Quick Add Input */}
      {!hideInput && (
        <form onSubmit={handleAddCustomItem} className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Add one-off item (e.g. Lemons, Party Snacks)..."
            value={customItemName}
            onChange={(e) => setCustomItemName(e.target.value)}
            disabled={isAdding}
            className="flex-1 rounded-xl h-10 bg-background border-border text-foreground text-sm"
          />
          <Button
            type="submit"
            disabled={isAdding || !customItemName.trim()}
            className="rounded-xl h-10 px-4 font-semibold shrink-0 cursor-pointer"
          >
            {isAdding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-1" />
            )}
            <span>Add</span>
          </Button>
        </form>
      )}

      {/* Checklist Queue */}
      {openItems.length === 0 ? (
        <div className="py-6 px-4 text-center rounded-2xl border border-dashed border-border/70 bg-card/40 space-y-1 select-none">
          <p className="text-xs font-semibold text-foreground">Queue is clear</p>
          <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
            All staples are stocked and no ad-hoc items are pending.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {openItems.map((item) => {
            const isChecked = item.is_purchased || checkedVisualIds.has(item.id);
            const isStaple = !!item.pantry_item_id;

            return (
              <div
                key={item.id}
                className={cn(
                  "group w-full flex items-center justify-between rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 transition-all select-none gap-3",
                  isChecked
                    ? "bg-emerald-500/10 border border-emerald-500/20 opacity-60"
                    : "bg-card text-card-foreground border border-border/70 hover:border-border shadow-xs"
                )}
              >
                {/* Left: Dedicated Circular Checkbox */}
                <button
                  type="button"
                  onClick={() => handleToggleCheckmark(item)}
                  aria-label={isChecked ? `Mark ${item.name} as pending` : `Mark ${item.name} as bought`}
                  className={cn(
                    "w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isChecked
                      ? "bg-emerald-500 text-white dark:text-black border-emerald-500 shadow-xs scale-105"
                      : "border-muted-foreground/30 hover:border-emerald-500 bg-background/50"
                  )}
                >
                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                </button>

                {/* Center: Item Title & Staple/Ad-hoc Badge */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className={cn(
                      "text-sm font-semibold truncate transition-all duration-200",
                      isChecked
                        ? "line-through text-muted-foreground/60"
                        : "text-foreground"
                    )}
                  >
                    {item.name}
                  </span>
                  {isStaple ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25 shrink-0"
                    >
                      Staple
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border-border shrink-0"
                    >
                      {item.purchased_by_name ? `@${item.purchased_by_name}` : "One-off"}
                    </Badge>
                  )}
                </div>

                {/* Right: + Put in Cart Action Button & Delete Button */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleAddToCart(item)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Put ${item.name} in cart`}
                  >
                    <CartIcon className="w-3.5 h-3.5" />
                    <span>+ Put in Cart</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemove(item)}
                    className="opacity-70 sm:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                    title="Delete item"
                    aria-label={`Delete ${item.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ShoppingListSection;
