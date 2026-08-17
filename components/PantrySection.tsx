"use client";

import { useState, useTransition, useEffect } from "react";
import {
  addPantryItemAction,
  setPantryItemStockAction,
  deletePantryItemAction,
} from "@/app/actions/pantry";
import type { PantryItem } from "@/types";
import { Package, PackageX, Trash2, Plus } from "lucide-react";

export function PantrySection({
  kitchenId,
  items,
}: {
  kitchenId: string;
  items: PantryItem[];
}) {
  const [pantryItems, setPantryItems] = useState<PantryItem[]>(items);
  const [newItemName, setNewItemName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
  setPantryItems(items);
    }, [items]);


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

  const handleDelete = (itemId: string) => {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        await deletePantryItemAction(kitchenId, itemId);
        setPantryItems((prev) => prev.filter((p) => p.id !== itemId));
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to delete item.");
      }
    });
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
      <h2 className="text-base font-semibold text-white flex items-center gap-2">
        <Package className="w-4 h-4 text-zinc-400" />
        <span>Pantry & Inventory</span>
        <span className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full font-medium">
          {pantryItems.length}
        </span>
      </h2>

      <form onSubmit={handleAdd} className="flex items-center gap-2">
        <input
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder="e.g. Eggs, Milk, Rice"
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
            <span
              className={`font-medium ${
                item.is_out_of_stock ? "text-zinc-500 line-through" : "text-white"
              }`}
            >
              {item.name}
            </span>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleToggleStock(item)}
                disabled={isPending}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border disabled:opacity-50 ${
                  item.is_out_of_stock
                    ? "bg-zinc-100 border-white text-black"
                    : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                }`}
              >
                <PackageX className="w-3.5 h-3.5" />
                <span>{item.is_out_of_stock ? "Out of Stock" : "Mark Out of Stock"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                disabled={isPending}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition disabled:opacity-50"
                aria-label="Delete item"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
