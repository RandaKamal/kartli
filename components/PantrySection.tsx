"use client";

import { useState, useTransition, useEffect } from "react";
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
import { useI18n } from "@/context/i18n-context";

export function PantrySection({
  kitchenId,
  items,
}: {
  kitchenId: string;
  items: PantryItem[];
}) {
  const { t } = useI18n();
  const [pantryItems, setPantryItems] = useState<PantryItem[]>(items);
  const [newItemName, setNewItemName] = useState("");
  const [itemToDelete, setItemToDelete] = useState<PantryItem | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPantryItems(items);
  }, [items]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newItemName.trim();
    if (!name) return;

    startTransition(async () => {
      try {
        const item = await addPantryItemAction(kitchenId, name);
        setPantryItems((prev) => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)));
        setNewItemName("");
        toast.success(`Added "${name}" to pantry`);
      } catch (err: any) {
        toast.error(err.message || "Failed to add item.");
      }
    });
  };

  const handleToggleStock = (item: PantryItem) => {
    const nextValue = !item.is_out_of_stock;

    setPantryItems((prev) =>
      prev.map((p) => (p.id === item.id ? { ...p, is_out_of_stock: nextValue } : p))
    );

    startTransition(async () => {
      try {
        await setPantryItemStockAction(kitchenId, item.id, nextValue);
        if (nextValue) {
          toast.warning(t("pantry.markedEmpty", { name: item.name }));
        } else {
          toast.success(t("pantry.restocked", { name: item.name }));
        }
      } catch (err: any) {
        setPantryItems((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, is_out_of_stock: item.is_out_of_stock } : p))
        );
        toast.error(err.message || "Failed to update stock status.");
      }
    });
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    const itemId = itemToDelete.id;
    const itemName = itemToDelete.name;

    startTransition(async () => {
      try {
        await deletePantryItemAction(kitchenId, itemId);
        setPantryItems((prev) => prev.filter((p) => p.id !== itemId));
        setItemToDelete(null);
        toast.success(`Deleted "${itemName}" from pantry`);
      } catch (err: any) {
        toast.error(err.message || "Failed to delete item.");
      }
    });
  };

  const outOfStockCount = pantryItems.filter((i) => i.is_out_of_stock).length;

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
            <span>{t("pantry.title")}</span>
            <Badge variant="secondary" className="text-xs font-mono">
              {pantryItems.length}
            </Badge>
          </h2>

          <div className="flex items-center gap-2">
            {outOfStockCount > 0 && (
              <Badge variant="warm" className="gap-1 font-medium text-xs bg-accent-ochre/15 text-accent-warning border-accent-ochre/30">
                <AlertTriangle className="w-3 h-3 text-accent-warning" />
                <span>{outOfStockCount} {t("pantry.empty")}</span>
              </Badge>
            )}

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
        </div>

        {/* Content Body - Collapsible on mobile (< md), always expanded on desktop (md:) */}
        <div className={cn("space-y-4 pt-1 md:pt-0", isMobileOpen ? "block" : "hidden md:block")}>
          <form onSubmit={handleAdd} className="flex items-center gap-2">
            <Input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={t("pantry.placeholder")}
              className="flex-1 rounded-xl h-10 bg-background border-border"
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={isPending || !newItemName.trim()}
              className="rounded-xl h-10 px-4 font-medium shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{t("pantry.add")}</span>
            </Button>
          </form>

          <div className="divide-y divide-border">
            {pantryItems.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">
                {t("pantry.noItems")}
              </p>
            )}
            {pantryItems.map((item) => (
              <div
                key={item.id}
                className="py-3 flex items-center justify-between gap-3 text-sm hover:bg-muted/40 px-2 rounded-xl transition"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className={`font-medium truncate ${
                      item.is_out_of_stock ? "text-muted-foreground line-through decoration-muted-foreground/50" : "text-foreground"
                    }`}
                  >
                    {item.name}
                  </span>

                  {item.is_out_of_stock ? (
                    <Badge
                      variant="warm"
                      className="text-[10px] px-2 py-0.5 gap-1 shrink-0 font-medium bg-accent-ochre/15 text-accent-warning border-accent-ochre/30"
                      title="Out of stock - on shopping list"
                    >
                      <AlertTriangle className="w-3 h-3 text-accent-warning" />
                      <span>{t("common.empty")}</span>
                    </Badge>
                  ) : (
                    <Badge
                      variant="success"
                      className="text-[10px] px-2 py-0.5 gap-1 shrink-0 font-medium bg-accent-sage/15 text-accent-success border-accent-sage/30"
                      title="In stock"
                    >
                      <Check className="w-3 h-3 text-accent-success" />
                      <span>{t("pantry.inStock")}</span>
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant={item.is_out_of_stock ? "success" : "secondary"}
                    size="sm"
                    onClick={() => handleToggleStock(item)}
                    disabled={isPending}
                    title={
                      item.is_out_of_stock
                        ? "Restock item (removes from shopping list)"
                        : "Mark as empty (adds to shopping list)"
                    }
                    className="h-8 px-3 rounded-lg text-xs font-semibold"
                  >
                    {item.is_out_of_stock ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{t("pantry.restock")}</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-accent-warning" />
                        <span>{t("pantry.markEmpty")}</span>
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setItemToDelete(item)}
                    disabled={isPending}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                    title="Delete item from pantry"
                    aria-label={`Delete ${item.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
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
              <AlertDialogTitle>{t("pantry.deleteTitle")}</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              {t("pantry.deleteConfirm", { name: itemToDelete?.name || "" })}
              {itemToDelete?.is_out_of_stock && (
                <span className="block mt-1 text-accent-warning font-medium">
                  {t("pantry.deleteConfirmSub")}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isPending ? t("common.deleting") : t("pantry.deleteAction")}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
