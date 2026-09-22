"use client";

import { useState, useTransition, useOptimistic } from "react";
import {
  addCustomShoppingItemAction,
  moveToCartAction,
  returnToShoppingListAction,
  removeShoppingListItemAction,
  moveAllNeededToCartAction,
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
  ArrowRight,
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
  onItemMovedToCart,
  onAllItemsMovedToCart,
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

  const handleToggleCheckmark = (item: ShoppingListItem) => {
    const isCurrentlyPurchased = item.is_purchased || checkedVisualIds.has(item.id);
    const nextPurchased = !isCurrentlyPurchased;

    if (nextPurchased) {
      // 0ms feedback: immediately check and strikethrough
      setCheckedVisualIds((prev) => new Set(prev).add(item.id));

      startTransition(async () => {
        setOptimisticListItems({
          type: "UPDATE",
          id: item.id,
          changes: { is_purchased: true, purchased_by: currentUserId || null, is_guest_staged: false },
        });
        onItemMovedToCart?.(item);

        setTimeout(() => {
          setCheckedVisualIds((prev) => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
        }, 280);

        try {
          await moveToCartAction(kitchenId, item.id);
          toast.success(`Bought "${item.name}" — moved to cart`);
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
          toast.success(`Returned "${item.name}" to queue`);
        } catch (err: any) {
          onItemMovedToCart?.(item);
          toast.error(err.message || "Failed to return item to list.");
        }
      });
    }
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
    (i) => !i.is_purchased && !i.is_guest_staged
  );

  if (openItems.length === 0 && hideInput) {
    return null;
  }

  return (
    <div className="space-y-2 select-none">
      {/* Editorial Section Label */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
            Shopping Queue
          </span>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
            {openItems.length}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground/60">
          Tap row to mark bought
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
        <div className="py-6 px-4 text-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] space-y-1 select-none">
          <p className="text-xs font-semibold text-white">Queue is clear</p>
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
                role="button"
                tabIndex={0}
                onClick={() => handleToggleCheckmark(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleToggleCheckmark(item);
                  }
                }}
                className={cn(
                  "group w-full flex items-center justify-between rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 transition-all cursor-pointer select-none active:scale-[0.98]",
                  isChecked
                    ? "bg-emerald-500/10 border border-emerald-500/20 opacity-50"
                    : "bg-[#121215] hover:bg-[#16161a] border border-white/[0.08] hover:border-white/20 shadow-sm"
                )}
              >
                {/* Left: Circular Checkbox + Item Name */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0",
                      isChecked
                        ? "bg-emerald-500 text-black border-emerald-500 shadow-xs scale-105"
                        : "border-white/30 group-hover:border-emerald-400/60 bg-white/[0.02]"
                    )}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>

                  <span
                    className={cn(
                      "text-sm font-semibold truncate transition-all",
                      isChecked
                        ? "line-through text-muted-foreground/60"
                        : "text-white"
                    )}
                  >
                    {item.name}
                  </span>
                </div>

                {/* Right: Chip + Hover/Touch Trash Button */}
                <div className="flex items-center gap-2 shrink-0">
                  {isStaple ? (
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25">
                      Staple
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-white/[0.06] text-muted-foreground border border-white/[0.08]">
                      {item.purchased_by_name ? `@${item.purchased_by_name}` : "One-off"}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(item);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                    title="Delete item"
                    aria-label={`Delete ${item.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
