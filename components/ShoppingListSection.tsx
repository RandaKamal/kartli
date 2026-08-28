"use client";

import { useState, useTransition, useEffect } from "react";
import {
  togglePurchasedAction,
  removeShoppingListItemAction,
  clearBoughtShoppingListItemsAction,
} from "@/app/actions/pantry";
import type { ShoppingListItem } from "@/types";
import { ShoppingCart, Check, X, Trash2, CheckCheck, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ShoppingListSection({
  kitchenId,
  items,
}: {
  kitchenId: string;
  items: ShoppingListItem[];
}) {
  const [listItems, setListItems] = useState<ShoppingListItem[]>(items);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setListItems(items);
  }, [items]);

  const handleTogglePurchased = (item: ShoppingListItem) => {
    const nextValue = !item.is_purchased;

    setListItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_purchased: nextValue } : i))
    );

    startTransition(async () => {
      try {
        await togglePurchasedAction(kitchenId, item.id, nextValue);
        if (nextValue) {
          toast.success(`Marked "${item.name}" as Bought`);
        } else {
          toast.info(`Marked "${item.name}" as Needed`);
        }
      } catch (err: any) {
        setListItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, is_purchased: item.is_purchased } : i))
        );
        toast.error(err.message || "Failed to update item.");
      }
    });
  };

  const handleRemove = (item: ShoppingListItem) => {
    startTransition(async () => {
      try {
        await removeShoppingListItemAction(kitchenId, item.id);
        setListItems((prev) => prev.filter((i) => i.id !== item.id));
        toast.success(`Removed "${item.name}" from shopping list`);
      } catch (err: any) {
        toast.error(err.message || "Failed to remove item.");
      }
    });
  };

  const handleClearBought = () => {
    const count = purchasedItems.length;
    startTransition(async () => {
      try {
        await clearBoughtShoppingListItemsAction(kitchenId);
        setListItems((prev) => prev.filter((i) => !i.is_purchased));
        toast.success(`Cleared ${count} bought item${count === 1 ? "" : "s"}`);
      } catch (err: any) {
        toast.error(err.message || "Failed to clear bought items.");
      }
    });
  };

  const pendingItems = listItems.filter((i) => !i.is_purchased);
  const purchasedItems = listItems.filter((i) => i.is_purchased);
  const orderedItems = [...pendingItems, ...purchasedItems];

  return (
    <Card className="border-border bg-card rounded-3xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">Shopping List</h2>
          <Badge variant="warm" className="text-xs font-mono">
            {pendingItems.length} needed
          </Badge>
          {purchasedItems.length > 0 && (
            <Badge variant="success" className="text-xs font-mono">
              {purchasedItems.length} bought
            </Badge>
          )}
        </div>

        {purchasedItems.length > 0 && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleClearBought}
            disabled={isPending}
            className="h-8 px-3 rounded-lg text-xs font-semibold"
            title="Clear all bought items from the shopping list"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground mr-1" />
            )}
            <span>Clear Bought ({purchasedItems.length})</span>
          </Button>
        )}
      </div>

      <div className="divide-y divide-border">
        {orderedItems.length === 0 && (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Nothing needed right now. Marking a pantry item as &ldquo;Empty&rdquo; adds it here automatically.
          </p>
        )}
        {orderedItems.map((item) => (
          <div
            key={item.id}
            className="py-3 flex items-center justify-between gap-3 text-sm hover:bg-muted/40 px-2 rounded-xl transition"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span
                className={`font-medium truncate ${
                  item.is_purchased ? "text-muted-foreground line-through decoration-muted-foreground/50" : "text-foreground"
                }`}
              >
                {item.name}
              </span>

              {item.checkout_id ? (
                <Badge
                  variant="success"
                  className="text-[10px] px-2 py-0.5 gap-1 shrink-0 font-medium"
                  title="Checked out / Resolved"
                >
                  <CheckCheck className="w-3 h-3" />
                  <span>RESOLVED</span>
                </Badge>
              ) : item.is_purchased ? (
                <Badge
                  variant="pending"
                  className="text-[10px] px-2 py-0.5 gap-1 shrink-0 font-medium"
                  title="Marked as bought, ready for cart checkout"
                >
                  <Check className="w-3 h-3" />
                  <span>BOUGHT</span>
                </Badge>
              ) : (
                <Badge
                  variant="warm"
                  className="text-[10px] px-2 py-0.5 gap-1 shrink-0 font-medium"
                  title="Needs to be purchased"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>OPEN</span>
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant={item.is_purchased ? "default" : "secondary"}
                size="sm"
                onClick={() => handleTogglePurchased(item)}
                disabled={isPending || !!item.checkout_id}
                title={
                  item.checkout_id
                    ? "Already checked out"
                    : item.is_purchased
                    ? "Mark as needed"
                    : "Mark as bought"
                }
                className="h-8 px-3 rounded-lg text-xs font-semibold"
              >
                {item.checkout_id ? (
                  <>
                    <CheckCheck className="w-3.5 h-3.5 mr-1" />
                    <span>Checked Out</span>
                  </>
                ) : item.is_purchased ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1" />
                    <span>Bought</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                    <span>Mark as Bought</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => handleRemove(item)}
                disabled={isPending}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                title="Remove from list"
                aria-label={`Remove ${item.name} from list`}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

