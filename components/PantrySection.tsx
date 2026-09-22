"use client";

import { useState, useTransition, useOptimistic } from "react";
import {
  addPantryItemAction,
  setPantryItemStockAction,
  deletePantryItemAction,
} from "@/app/actions/pantry";
import type { PantryItem } from "@/types";
import { cn } from "@/lib/utils";
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
  onItemEmptied?: (item: PantryItem) => void;
  onItemRestocked?: (itemId: string) => void;
  onItemDeleted?: (itemId: string) => void;
  onItemAdded?: (item: PantryItem) => void;
  hideInput?: boolean;
}

export function PantrySection({
  kitchenId,
  items,
  onItemEmptied,
  onItemRestocked,
  onItemDeleted,
  onItemAdded,
  hideInput = false,
}: PantrySectionProps) {
  const [optimisticItems, setOptimisticItems] = useOptimistic(
    items,
    (state: PantryItem[], update: { id: string; is_out_of_stock: boolean }) =>
      state.map((p) => (p.id === update.id ? { ...p, is_out_of_stock: update.is_out_of_stock } : p))
  );
  const [newItemName, setNewItemName] = useState("");
  const [itemToDelete, setItemToDelete] = useState<PantryItem | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [, startTransition] = useTransition();

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

    // Zero-latency optimistic update
    startTransition(async () => {
      setOptimisticItems({ id: item.id, is_out_of_stock: nextValue });

      if (nextValue) {
        onItemEmptied?.(item);
      } else {
        onItemRestocked?.(item.id);
      }

      try {
        await setPantryItemStockAction(kitchenId, item.id, nextValue);
        if (nextValue) {
          toast.warning(`Marked "${item.name}" as Needed — queued on shopping list`);
        } else {
          toast.success(`Restocked "${item.name}"`);
        }
      } catch (err: any) {
        if (nextValue) {
          onItemRestocked?.(item.id);
        } else {
          onItemEmptied?.(item);
        }
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
      <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between select-none">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-lg font-bold text-white tracking-tight">
                Household Staples Catalog
              </h2>
              <Badge variant="secondary" className="text-xs font-mono font-medium">
                {optimisticItems.length}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Permanent essentials · Tap any tile to toggle out-of-stock
            </p>
          </div>
        </div>

        {/* Optional quick add input if not hidden */}
        {!hideInput && (
          <form onSubmit={handleAdd} className="flex items-center gap-2">
            <Input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Track new staple (e.g. Olive Oil)..."
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
              <span>Add</span>
            </Button>
          </form>
        )}

        {/* Tactile Bento Grid */}
        {optimisticItems.length === 0 ? (
          <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] space-y-2">
            <Package className="w-7 h-7 text-muted-foreground mx-auto opacity-70" />
            <p className="text-sm font-semibold text-white">No staples tracked yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Add permanent household essentials like Olive Oil, Salt, or Coffee that your kitchen should always have in stock.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {optimisticItems.map((item) => {
              const isOutOfStock = item.is_out_of_stock;

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
                    "group relative flex flex-col justify-between rounded-2xl p-4 transition-all cursor-pointer select-none active:scale-[0.97] min-h-[100px]",
                    isOutOfStock
                      ? "bg-amber-500/[0.12] hover:bg-amber-500/[0.18] border border-amber-500/35 shadow-md shadow-amber-500/5"
                      : "bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.16] shadow-sm"
                  )}
                  title={isOutOfStock ? "Tap to mark In Stock" : "Tap to mark Empty / Needed"}
                >
                  {/* Top Status Indicator & Trash Button */}
                  <div className="flex items-center justify-between gap-1 w-full">
                    {isOutOfStock ? (
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                        </span>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Empty
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0" />
                        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-400/90">
                          In Stock
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
                      title="Delete staple"
                      aria-label={`Delete ${item.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Bottom Staple Name */}
                  <div className="pt-3">
                    <span className="text-sm sm:text-base font-bold text-white truncate block leading-snug">
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
