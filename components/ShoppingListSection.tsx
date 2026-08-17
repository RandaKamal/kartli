"use client";

import { useState, useTransition, useEffect } from "react";
import { togglePurchasedAction, removeShoppingListItemAction } from "@/app/actions/pantry";
import type { ShoppingListItem } from "@/types";
import { ShoppingCart, Check, X } from "lucide-react";

export function ShoppingListSection({
  kitchenId,
  items,
}: {
  kitchenId: string;
  items: ShoppingListItem[];
}) {
  const [listItems, setListItems] = useState<ShoppingListItem[]>(items);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
  setListItems(items);
}, [items]);

  const handleTogglePurchased = (item: ShoppingListItem) => {
    setErrorMessage(null);
    const nextValue = !item.is_purchased;

    setListItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_purchased: nextValue } : i))
    );

    startTransition(async () => {
      try {
        await togglePurchasedAction(kitchenId, item.id, nextValue);
      } catch (err: any) {
        setListItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, is_purchased: item.is_purchased } : i))
        );
        setErrorMessage(err.message || "Failed to update item.");
      }
    });
  };

  const handleRemove = (itemId: string) => {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        await removeShoppingListItemAction(kitchenId, itemId);
        setListItems((prev) => prev.filter((i) => i.id !== itemId));
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to remove item.");
      }
    });
  };

  const pendingItems = listItems.filter((i) => !i.is_purchased);
  const purchasedItems = listItems.filter((i) => i.is_purchased);
  const orderedItems = [...pendingItems, ...purchasedItems];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
      <h2 className="text-base font-semibold text-white flex items-center gap-2">
        <ShoppingCart className="w-4 h-4 text-zinc-400" />
        <span>Shopping List</span>
        <span className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full font-medium">
          {pendingItems.length}
        </span>
      </h2>

      {errorMessage && (
        <div className="p-3 bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-xl font-medium">
          {errorMessage}
        </div>
      )}

      <div className="divide-y divide-zinc-800">
        {orderedItems.length === 0 && (
          <p className="text-xs text-zinc-500 py-4 text-center">
            Nothing needed right now. Marking a pantry item &ldquo;Out of Stock&rdquo; adds it here automatically.
          </p>
        )}
        {orderedItems.map((item) => (
          <div
            key={item.id}
            className="py-3 flex items-center justify-between gap-3 text-sm hover:bg-zinc-800/20 px-2 rounded-lg transition"
          >
            <span
                className={`font-medium flex-1 ${
                    item.is_purchased ? "text-zinc-500 line-through" : "text-white"
                }`}
                >
                {item.name}
                </span>

                <button
                  type="button"
                  onClick={() => handleTogglePurchased(item)}
                  disabled={isPending || !!item.checkout_id}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border disabled:opacity-50 ${
                    item.is_purchased
                      ? "bg-zinc-100 border-white text-black"
                      : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{item.checkout_id ? "Checked Out" : item.is_purchased ? "Bought" : "Mark as Bought"}</span>
                </button>

            {!item.checkout_id && (
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                disabled={isPending}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition disabled:opacity-50"
                aria-label="Remove from list"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

          </div>
        ))}
      </div>
    </div>
  );
}
