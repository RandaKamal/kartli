"use client";

import { useState, useOptimistic, startTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addPantryItemAction,
  setPantryItemStockAction,
  updateItemStockAction,
  deletePantryItemAction,
} from "@/app/actions/pantry";
import type { PantryItem, ShoppingListItem } from "@/types";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import {
  Package,
  Trash2,
  Plus,
  Loader2,
  Check,
  RotateCcw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export interface PantrySectionProps {
  kitchenId: string;
  items: PantryItem[];
  shoppingListItems?: ShoppingListItem[];
  currentUserId?: string;
  onItemEmptied?: (item: PantryItem) => void;
  onItemRestocked?: (item: PantryItem | string) => void;
  onItemDeleted?: (itemId: string) => void;
  onItemAdded?: (item: PantryItem) => void;
  hideInput?: boolean;
}

export function PantrySection({
  kitchenId,
  items,
  shoppingListItems = [],
  currentUserId,
  onItemEmptied,
  onItemRestocked,
  onItemDeleted,
  onItemAdded,
  hideInput = false,
}: PantrySectionProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [optimisticItems, setOptimisticItems] = useOptimistic(
    items,
    (state: PantryItem[], update: { id: string; is_out_of_stock: boolean }) =>
      state.map((p) => (p.id === update.id ? { ...p, is_out_of_stock: update.is_out_of_stock } : p))
  );
  const [newItemName, setNewItemName] = useState("");
  const [itemToDelete, setItemToDelete] = useState<PantryItem | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newItemName.trim();
    if (!name) return;

    setIsAdding(true);
    startTransition(async () => {
      try {
        const item = await addPantryItemAction(kitchenId, name);
        onItemAdded?.(item);
        setNewItemName("");
        router.refresh();
        toast.success(`Tracked "${name}" in staples`);
      } catch (err: any) {
        toast.error(err.message || "Failed to add staple.");
      } finally {
        setIsAdding(false);
      }
    });
  };

  const handleToggleStock = (item: PantryItem) => {
    const nextValue = !item.is_out_of_stock;

    startTransition(async () => {
      setOptimisticItems({ id: item.id, is_out_of_stock: nextValue });
      if (nextValue) {
        onItemEmptied?.(item);
      } else {
        onItemRestocked?.(item);
      }

      try {
        await updateItemStockAction(item.id, nextValue);
        if (nextValue) {
          toast.warning(`Marked "${item.name}" as Needed — queued on shopping list`);
        } else {
          toast.success(`Restocked "${item.name}"`);
        }
      } catch (err: any) {
        if (nextValue) {
          onItemRestocked?.(item);
        } else {
          onItemEmptied?.(item);
        }
        setOptimisticItems({ id: item.id, is_out_of_stock: !nextValue });
        toast.error(err.message || "Failed to update stock status.");
      }
    });
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    const itemId = itemToDelete.id;
    const itemName = itemToDelete.name;

    setIsDeleting(true);
    startTransition(async () => {
      try {
        await deletePantryItemAction(kitchenId, itemId);
        onItemDeleted?.(itemId);
        setItemToDelete(null);
        router.refresh();
        toast.success(`Deleted "${itemName}" from staples`);
      } catch (err: any) {
        toast.error(err.message || "Failed to delete staple.");
      } finally {
        setIsDeleting(false);
      }
    });
  };

  return (
    <>
      <div className="space-y-2.5 select-none">
        {/* Section Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Package className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
              {t.kitchen.staples.title}
            </span>
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border/70">
              {optimisticItems.length}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground/60">
            {t.kitchen.staples.tapHint}
          </span>
        </div>

        {/* Optional quick add input if not hidden */}
        {!hideInput && (
          <form onSubmit={handleAdd} className="flex items-center gap-2">
            <Input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={t.kitchen.commandBar.placeholder}
              disabled={isAdding}
              className="flex-1 rounded-xl h-10 bg-background border-border text-foreground text-sm"
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={isAdding || !newItemName.trim()}
              className="rounded-xl h-10 px-4 font-semibold shrink-0 cursor-pointer"
            >
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              <span>{t.kitchen.commandBar.add}</span>
            </Button>
          </form>
        )}

        {/* Tactile Bento Grid */}
        {optimisticItems.length === 0 ? (
          <div className="py-10 px-4 text-center rounded-2xl border border-dashed border-border/70 bg-card/40 space-y-1.5">
            <Package className="w-6 h-6 text-muted-foreground mx-auto opacity-60" />
            <p className="text-xs font-semibold text-foreground">No staples tracked yet</p>
            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Add permanent household essentials like Olive Oil, Salt, or Coffee that your kitchen should always have in stock.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {optimisticItems.map((item) => {
              const isOutOfStock = item.is_out_of_stock;
              const cartItem = shoppingListItems?.find(
                (s) =>
                  s.pantry_item_id === item.id &&
                  !s.checkout_id &&
                  (s.is_in_cart || s.is_purchased || s.is_guest_staged)
              );
              const isInCart = isOutOfStock && !!cartItem;
              const isNeeded = isOutOfStock && !cartItem;
              const isStocked = !isOutOfStock;

              const stagedByName = cartItem?.purchased_by === currentUserId
                ? "@you"
                : cartItem?.is_guest_staged
                ? "guest"
                : cartItem?.purchased_by_name
                ? `@${cartItem.purchased_by_name}`
                : "cart";

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleToggleStock(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleToggleStock(item);
                    }
                  }}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-2xl min-h-[96px] p-4 transition-all cursor-pointer select-none active:scale-[0.98]",
                    isStocked && "bg-card hover:bg-muted/40 border border-border/70 hover:border-border shadow-xs",
                    isNeeded && "bg-amber-500/[0.08] hover:bg-amber-500/[0.12] border border-amber-500/35 shadow-xs",
                    isInCart && "bg-cyan-500/[0.06] hover:bg-cyan-500/[0.10] border border-cyan-500/35 shadow-xs"
                  )}
                  title={isStocked ? "Tap to mark Empty / Needed" : "Tap to mark Stocked"}
                >
                  {/* Top Status Indicator & Trash Button */}
                  <div className="flex items-center justify-between gap-1 w-full">
                    {isStocked && (
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)] shrink-0" />
                        <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                          {t.kitchen.staples.stocked}
                        </span>
                      </div>
                    )}

                    {isNeeded && (
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30">
                          {t.kitchen.staples.emptyNeeded}
                        </span>
                      </div>
                    )}

                    {isInCart && (
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.5)] shrink-0" />
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 border border-cyan-500/30">
                          {t.kitchen.staples.inCart} · {stagedByName}
                        </span>
                      </div>
                    )}

                    {/* Subtle Delete Button (e.stopPropagation is critical) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setItemToDelete(item);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      title={t.kitchen.staples.deleteStaple}
                      aria-label={`Delete ${item.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Bottom Staple Name */}
                  <div className="pt-2">
                    <span className="text-sm font-semibold text-foreground truncate block leading-snug">
                      {item.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deletion Confirmation Modal */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive">
                <Trash2 className="w-5 h-5" />
              </div>
              <AlertDialogTitle>Delete Household Staple</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Are you sure you want to delete <strong className="text-foreground font-semibold">&ldquo;{itemToDelete?.name}&rdquo;</strong> from permanent staples?
              {itemToDelete?.is_out_of_stock && (
                <span className="block mt-1 text-accent-warning font-medium">
                  This will also remove its pending entry from the shopping queue.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
            >
              {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isDeleting ? "Deleting..." : "Delete Staple"}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default PantrySection;
