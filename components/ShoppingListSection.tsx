"use client";

import { useState, useTransition, useOptimistic } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
        router.refresh();
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
          is_in_cart: true,
          is_purchased: false,
          purchased_by: currentUserId || null,
          is_guest_staged: false,
        },
      });

      onAddToCart?.(item);
      onItemMovedToCart?.(item);

      try {
        await moveToCartAction(kitchenId, item.id);
        router.refresh();
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
            is_in_cart: false,
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
        router.refresh();
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
    (i) => !i.is_in_cart && !i.is_purchased && !i.is_guest_staged
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
          Stage to cart for next grocery run
        </span>
      </div>

      {/* Optional Quick Add Input */}
      {!hideInput && (
        <form onSubmit={handleAddCustomItem} className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Add item (e.g. Oat Milk)..."
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
            const isStaple = !!item.pantry_item_id;

            return (
              <div
                key={item.id}
                onClick={() => handleAddToCart(item)}
                className="flex items-center justify-between py-3.5 px-4 rounded-2xl bg-card border border-border/70 hover:border-border transition-all cursor-pointer group select-none gap-3 active:scale-[0.99] duration-150"
              >
                {/* Left: Item name in bold typography + small subtitle chip */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 min-w-0 flex-1">
                  <span className="font-bold text-sm text-foreground truncate">
                    {item.name}
                  </span>
                  {isStaple ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25 shrink-0 self-start sm:self-auto"
                    >
                      Staple
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border-border shrink-0 self-start sm:self-auto"
                    >
                      {item.purchased_by_name ? `@${item.purchased_by_name}` : "One-off"}
                    </Badge>
                  )}
                </div>

                {/* Right cluster (always visible, zero hidden hover tricks) */}
                <div className="flex items-center shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(item);
                    }}
                    className="h-8 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    aria-label={`Put ${item.name} in cart`}
                  >
                    <CartIcon className="w-3.5 h-3.5" />
                    <span>+ Put in Cart</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(item);
                    }}
                    className="h-8 w-8 rounded-xl text-muted-foreground/40 hover:text-destructive flex items-center justify-center transition-colors ml-2 cursor-pointer"
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
