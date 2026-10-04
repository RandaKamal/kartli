"use client";

import { useState, useTransition, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import {
  addCustomShoppingItemAction,
  moveToCartAction,
  returnToShoppingListAction,
  removeShoppingListItemAction,
  duplicateShoppingListItemAction,
} from "@/app/actions/pantry";
import type { ShoppingListItem, KitchenSpaceType } from "@/types";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
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
  const { t } = useTranslation();
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

  const handleDuplicateItem = (item: ShoppingListItem) => {
    const tempId = `temp-${Date.now()}`;
    const duplicated: ShoppingListItem = {
      ...item,
      id: tempId,
      is_in_cart: true,
      is_purchased: false,
      purchased_by: currentUserId || null,
      is_guest_staged: false,
    };
    onItemAdded?.(duplicated);
    toast.success(`Added duplicate "${item.name}" to your basket`);

    startTransition(async () => {
      try {
        const newItem = await duplicateShoppingListItemAction(kitchenId, item.id, true);
        onItemAdded?.(newItem);
      } catch (err: any) {
        toast.error(err.message || "Failed to duplicate item.");
      }
    });
  };

  const openItems = optimisticListItems.filter(
    (i) => !i.is_in_cart && !i.is_purchased && !i.is_guest_staged
  );

  const inCartItems = optimisticListItems.filter(
    (i) => (i.is_in_cart || i.is_guest_staged) && !i.checkout_id
  );

  if (openItems.length === 0 && inCartItems.length === 0 && hideInput) {
    return null;
  }

  return (
    <div className="space-y-2 select-none">
      {/* Editorial Section Label */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
            {t.kitchen.queue.title}
          </span>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
            {openItems.length}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground/70 hidden sm:inline">
          {t.kitchen.queue.subtitle}
        </span>
      </div>

      {/* Optional Quick Add Input */}
      {!hideInput && (
        <form onSubmit={handleAddCustomItem} className="flex items-center gap-2">
          <Input
            type="text"
            placeholder={t.kitchen.commandBar.placeholder}
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
            <span>{t.kitchen.commandBar.add}</span>
          </Button>
        </form>
      )}

      {/* Checklist Queue */}
      {openItems.length === 0 ? (
        <div className="py-6 px-4 text-center rounded-2xl border border-dashed border-border/70 bg-card/40 space-y-1 select-none">
          <p className="text-xs font-semibold text-foreground">{t.kitchen.queue.emptyState}</p>
          <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
            {t.kitchen.queue.emptyStateDesc}
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
                      {t.kitchen.queue.stapleBadge}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border-border shrink-0 self-start sm:self-auto"
                    >
                      {item.purchased_by_name ? `@${item.purchased_by_name}` : t.kitchen.queue.oneOffBadge}
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
                    <span>{t.kitchen.queue.putInCart}</span>
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

      {/* In-Cart / Active Restock Section */}
      {inCartItems.length > 0 && (
        <div className="space-y-1.5 pt-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.5)]" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                {t.kitchen.queue.activeRestock}
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25">
                {inCartItems.length}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground/70 hidden sm:inline">
              {t.kitchen.queue.activeRestockSub}
            </span>
          </div>

          <div className="space-y-1.5">
            {inCartItems.map((item) => {
              const isMine = item.purchased_by === currentUserId && !item.is_guest_staged;
              const stagedLabel = isMine
                ? t.kitchen.queue.inYourCart
                : item.is_guest_staged
                ? `${t.kitchen.queue.inCartBy} · @guest`
                : `${t.kitchen.queue.inCartBy} · @${item.purchased_by_name || "roommate"}`;

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2.5 px-4 rounded-2xl bg-cyan-500/[0.04] dark:bg-cyan-500/[0.06] border border-cyan-500/25 select-none gap-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 min-w-0 flex-1">
                    <span className="font-semibold text-sm text-foreground truncate">
                      {item.name}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 border border-cyan-500/30 shrink-0 self-start sm:self-auto"
                    >
                      {stagedLabel}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isMine ? (
                      <button
                        type="button"
                        onClick={() => onViewCart?.()}
                        className="h-8 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <CartIcon className="w-3.5 h-3.5" />
                        <span>View Cart</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDuplicateItem(item)}
                        className="h-8 px-3 rounded-xl bg-secondary/80 hover:bg-secondary text-foreground border border-border/80 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                        title="Add another to your cart"
                      >
                        <Plus className="w-3.5 h-3.5 text-primary" />
                        <span>+ Add Duplicate</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ShoppingListSection;
