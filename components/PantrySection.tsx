"use client";

import { useState, useTransition, useEffect } from "react";
import {
  addPantryItemAction,
  setPantryItemStockAction,
  deletePantryItemAction,
} from "@/app/actions/pantry";
import type { PantryItem } from "@/types";
import { Package, Trash2, Plus, AlertTriangle, Check, Loader2 } from "lucide-react";

export function PantrySection({
  kitchenId,
  items,
}: {
  kitchenId: string;
  items: PantryItem[];
}) {
  const [pantryItems, setPantryItems] = useState<PantryItem[]>(items);
  const [newItemName, setNewItemName] = useState("");
  const [itemToDelete, setItemToDelete] = useState<PantryItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setPantryItems(items);
  }, [items]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && itemToDelete) {
        setItemToDelete(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [itemToDelete]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newItemName.trim();
    if (!name) return;
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const item = await addPantryItemAction(kitchenId, name);
        setPantryItems((prev) => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)));
        setNewItemName("");
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to add item.");
      }
    });
  };

  const handleToggleStock = (item: PantryItem) => {
    setErrorMessage(null);
    const nextValue = !item.is_out_of_stock;

    setPantryItems((prev) =>
      prev.map((p) => (p.id === item.id ? { ...p, is_out_of_stock: nextValue } : p))
    );

    startTransition(async () => {
      try {
        await setPantryItemStockAction(kitchenId, item.id, nextValue);
      } catch (err: any) {
        setPantryItems((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, is_out_of_stock: item.is_out_of_stock } : p))
        );
        setErrorMessage(err.message || "Failed to update stock status.");
      }
    });
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    const itemId = itemToDelete.id;
    setErrorMessage(null);

    startTransition(async () => {
      try {
        await deletePantryItemAction(kitchenId, itemId);
        setPantryItems((prev) => prev.filter((p) => p.id !== itemId));
        setItemToDelete(null);
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to delete item.");
      }
    });
  };

  const outOfStockCount = pantryItems.filter((i) => i.is_out_of_stock).length;

  return (
    <>
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Package className="w-4 h-4 text-zinc-400" />
            <span>Pantry & Inventory</span>
            <span className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full font-medium">
              {pantryItems.length}
            </span>
          </h2>
          {outOfStockCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-200 font-medium">
              <AlertTriangle className="w-3 h-3 text-zinc-300" />
              <span>{outOfStockCount} empty</span>
            </span>
          )}
        </div>

        <form onSubmit={handleAdd} className="flex items-center gap-2">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="e.g. Eggs, Milk, Rice, Coffee"
            className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm transition"
          />
          <button
            type="submit"
            disabled={isPending || !newItemName.trim()}
            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 disabled:opacity-50 text-sm transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </form>

        {errorMessage && (
          <div className="p-3 bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-xl font-medium">
            {errorMessage}
          </div>
        )}

        <div className="divide-y divide-zinc-800">
          {pantryItems.length === 0 && (
            <p className="text-xs text-zinc-500 py-4 text-center">
              No pantry items yet. Add your first item above.
            </p>
          )}
          {pantryItems.map((item) => (
            <div
              key={item.id}
              className="py-3 flex items-center justify-between gap-3 text-sm hover:bg-zinc-800/20 px-2 rounded-lg transition"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span
                  className={`font-medium truncate ${
                    item.is_out_of_stock ? "text-zinc-400" : "text-white"
                  }`}
                >
                  {item.name}
                </span>

                {item.is_out_of_stock ? (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-zinc-800 border border-zinc-700 text-zinc-200 shrink-0"
                    title="Out of stock - on shopping list"
                  >
                    <AlertTriangle className="w-3 h-3 text-zinc-300" />
                    <span>Empty</span>
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-950/60 border border-zinc-800/80 text-zinc-500 shrink-0"
                    title="In stock"
                  >
                    <Check className="w-3 h-3 text-zinc-500" />
                    <span>In Stock</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleStock(item)}
                  disabled={isPending}
                  title={
                    item.is_out_of_stock
                      ? "Restock item (removes from shopping list)"
                      : "Mark as empty (adds to shopping list)"
                  }
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border disabled:opacity-50 ${
                    item.is_out_of_stock
                      ? "bg-white border-white text-black hover:bg-zinc-200"
                      : "bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 hover:text-white hover:border-zinc-600"
                  }`}
                >
                  {item.is_out_of_stock ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Restock</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Mark Empty</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setItemToDelete(item)}
                  disabled={isPending}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition disabled:opacity-50"
                  title="Delete item from pantry"
                  aria-label={`Delete ${item.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deletion Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 id="delete-dialog-title" className="text-base font-bold text-white tracking-tight">
                  Delete Pantry Item
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Are you sure you want to delete <strong className="text-white">&ldquo;{itemToDelete.name}&rdquo;</strong> from the pantry?
                </p>
                {itemToDelete.is_out_of_stock && (
                  <p className="text-xs text-zinc-500">
                    This will also remove its pending entry from the shopping list.
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={isPending}
                className="px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 text-xs transition shadow-sm disabled:opacity-50"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />}
                <span>{isPending ? "Deleting..." : "Delete Item"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
