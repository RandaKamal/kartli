"use client";

import { useState, useTransition, useEffect, useOptimistic } from "react";
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
  AlertTriangle,
  Check,
  Loader2,
  ChevronDown,
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

interface PantrySectionProps {
  kitchenId: string;
  items: PantryItem[];
  onItemEmptied?: (item: PantryItem) => void;
  onItemRestocked?: (itemId: string) => void;
  onItemDeleted?: (itemId: string) => void;
  onItemAdded?: (item: PantryItem) => void;
}

export function PantrySection({
  kitchenId,
  items,
  onItemEmptied,
  onItemRestocked,
  onItemDeleted,
  onItemAdded,
}: PantrySectionProps) {
  const [optimisticItems, setOptimisticItems] = useOptimistic(
    items,
    (state: PantryItem[], update: { id: string; is_out_of_stock: boolean }) =>
      state.map((p) => (p.id === update.id ? { ...p, is_out_of_stock: update.is_out_of_stock } : p))
  );
  const [newItemName, setNewItemName] = useState("");
  const [itemToDelete, setItemToDelete] = useState<PantryItem | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
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
        toast.success(`Added "${name}" to pantry`);
      } catch (err: any) {
        toast.error(err.message || "Failed to add item.");
      } finally {
        setIsAdding(false);
      }
    });
  };

  const handleToggleStock = (item: PantryItem) => {
    const nextValue = !item.is_out_of_stock;

    // Instant optimistic update on local badge and memory list (0ms perceived latency)
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
          toast.warning(`Marked "${item.name}" as Empty — added to shopping list`);
        } else {
          toast.success(`Restocked "${item.name}"`);
        }
      } catch (err: any) {
        // Rollback state on error
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
        toast.success(`Deleted "${itemName}" from pantry`);
      } catch (err: any) {
        toast.error(err.message || "Failed to delete item.");
      } finally {
        setIsDeleting(false);
      }
    });
  };

  const outOfStockCount = optimisticItems.filter((i) => i.is_out_of_stock).length;

  return (
    <>
      <Card className="border border-border bg-card rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
        {/* Header - Clickable on mobile to toggle expansion */}
        <div
          onClick={() => setIsMobileOpen((prev) => !prev)}
          className="flex items-center justify-between cursor-pointer md:cursor-default select-none group"
        >
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <span>Pantry &amp; Inventory</span>
            <Badge variant="secondary" className="text-xs font-mono">
              {optimisticItems.length}
            </Badge>
          </h2>

          {/* Mobile-only Chevron Indicator */}
          <div className="p-1 rounded-lg text-muted-foreground group-hover:text-foreground transition md:hidden">
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform duration-200",
                isMobileOpen && "rotate-180"
              )}
            />
          </div>
        </div>

        {/* Content Body - Collapsible on mobile (< md), always expanded on desktop (md:) */}
        <div className={cn("space-y-4 pt-1 md:pt-0", isMobileOpen ? "block" : "hidden md:block")}>
          <form onSubmit={handleAdd} className="flex items-center gap-2">
            <Input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="e.g. Eggs, Milk, Rice, Coffee"
              className="flex-1 rounded-xl h-10 bg-background border-border"
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={isAdding || !newItemName.trim()}
              className="rounded-xl h-10 px-4 font-medium shrink-0"
            >
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Add</span>
            </Button>
          </form>

          {optimisticItems.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No pantry items yet. Add your first item above.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Section A: Needs Restock */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1 pt-1 pb-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
                      Needs Restock
                    </span>
                    <span className="bg-secondary text-muted-foreground px-2 py-0.5 rounded-full text-[10px] font-medium">
                      {outOfStockCount}
                    </span>
                  </div>
                  {outOfStockCount > 0 && (
                    <span className="text-[11px] text-muted-foreground/60 hidden sm:inline">
                      Auto-added to shopping list
                    </span>
                  )}
                </div>

                {outOfStockCount === 0 ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl border border-border/60 bg-muted/20 text-xs text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>All staples are in stock.</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {optimisticItems
                      .filter((i) => i.is_out_of_stock)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="bg-amber-500/[0.04] border border-amber-500/15 rounded-xl px-3 py-2 flex items-center justify-between gap-3 text-sm transition hover:border-amber-500/25"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className="font-medium truncate text-muted-foreground line-through decoration-muted-foreground/50">
                              {item.name}
                            </span>
                            <span
                              className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-medium px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1"
                              title="Out of stock - on shopping list"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              <span>Empty</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleStock(item)}
                              title="Restock item (removes from shopping list)"
                              className="h-8 px-3 text-xs font-medium bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Restock</span>
                            </button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setItemToDelete(item)}
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                              title="Delete item from pantry"
                              aria-label={`Delete ${item.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Section B: In Stock */}
              <div className="space-y-2 border-t border-border/40 pt-4 mt-3">
                <div className="flex items-center justify-between px-1 pb-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
                      In Stock
                    </span>
                    <span className="bg-secondary text-muted-foreground px-2 py-0.5 rounded-full text-[10px] font-medium">
                      {optimisticItems.length - outOfStockCount}
                    </span>
                  </div>
                </div>

                {optimisticItems.length - outOfStockCount === 0 ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl border border-border/60 bg-muted/20 text-xs text-muted-foreground">
                    <span>No items currently marked in stock.</span>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {optimisticItems
                      .filter((i) => !i.is_out_of_stock)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="py-2.5 px-2 flex items-center justify-between gap-3 text-sm hover:bg-muted/40 rounded-xl transition"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className="font-medium truncate text-foreground">
                              {item.name}
                            </span>
                            <span
                              className="bg-secondary text-muted-foreground border border-border text-[10px] px-2 py-0.5 rounded-md font-medium shrink-0 flex items-center gap-1"
                              title="In stock"
                            >
                              <Check className="w-3 h-3 text-muted-foreground/70" />
                              <span>In Stock</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleStock(item)}
                              title="Mark as empty (adds to shopping list)"
                              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 border border-transparent rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Mark Empty</span>
                            </button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setItemToDelete(item)}
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                              title="Delete item from pantry"
                              aria-label={`Delete ${item.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Deletion Confirmation Modal via shadcn AlertDialog */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive">
                <Trash2 className="w-5 h-5" />
              </div>
              <AlertDialogTitle>Delete Pantry Item</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Are you sure you want to delete <strong className="text-foreground font-semibold">&ldquo;{itemToDelete?.name}&rdquo;</strong> from the pantry?
              {itemToDelete?.is_out_of_stock && (
                <span className="block mt-1 text-accent-warning font-medium">
                  This will also remove its pending entry from the shopping list.
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
              <span>{isDeleting ? "Deleting..." : "Delete Item"}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
