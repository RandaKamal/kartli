"use client";

import { useState, useTransition, useEffect } from "react";
import {
  addCustomShoppingItemAction,
  moveToCartAction,
  returnToShoppingListAction,
  removeShoppingListItemAction,
  clearBoughtShoppingListItemsAction,
} from "@/app/actions/pantry";
import type { ShoppingListItem } from "@/types";
import {
  ShoppingCart as CartIcon,
  Trash2,
  CheckCheck,
  Loader2,
  Plus,
  RotateCcw,
  Package,
  User,
  ShoppingBag,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { capitalize } from "@/lib/utils";
import { toast } from "sonner";

export function ShoppingListSection({
  kitchenId,
  items,
  currentUserId,
}: {
  kitchenId: string;
  items: ShoppingListItem[];
  currentUserId?: string;
}) {
  const [listItems, setListItems] = useState<ShoppingListItem[]>(items);
  const [customItemName, setCustomItemName] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setListItems(items);
  }, [items]);

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    const name = customItemName.trim();
    if (!name) return;

    startTransition(async () => {
      try {
        const newItem = await addCustomShoppingItemAction(kitchenId, name);
        setListItems((prev) => [...prev, newItem]);
        setCustomItemName("");
        toast.success(`Added "${name}" to shopping list`);
      } catch (err: any) {
        toast.error(err.message || "Failed to add item.");
      }
    });
  };

  const handlePutInCart = (item: ShoppingListItem) => {
    setListItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? {
              ...i,
              is_purchased: true,
              purchased_by: currentUserId || null,
              purchased_by_name: "You",
            }
          : i
      )
    );

    startTransition(async () => {
      try {
        const updated = await moveToCartAction(kitchenId, item.id);
        setListItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, ...updated } : i))
        );
        toast.success(`Moved "${item.name}" to cart`);
      } catch (err: any) {
        setListItems((prev) =>
          prev.map((i) => (i.id === item.id ? item : i))
        );
        toast.error(err.message || "Failed to move item to cart.");
      }
    });
  };

  const handleReturnToList = (item: ShoppingListItem) => {
    setListItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, is_purchased: false, purchased_by: null, purchased_by_name: null }
          : i
      )
    );

    startTransition(async () => {
      try {
        const updated = await returnToShoppingListAction(kitchenId, item.id);
        setListItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, ...updated } : i))
        );
        toast.info(`Returned "${item.name}" to needed list`);
      } catch (err: any) {
        setListItems((prev) =>
          prev.map((i) => (i.id === item.id ? item : i))
        );
        toast.error(err.message || "Failed to return item to list.");
      }
    });
  };

  const handleRemove = (item: ShoppingListItem) => {
    const isCustom = !item.pantry_item_id;
    startTransition(async () => {
      try {
        await removeShoppingListItemAction(kitchenId, item.id);
        setListItems((prev) => prev.filter((i) => i.id !== item.id));
        if (isCustom) {
          toast.success(`Deleted "${item.name}" from shopping list`);
        } else {
          toast.success(`Removed "${item.name}" from list & restocked in pantry`);
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to remove item.");
      }
    });
  };

  const handleClearBought = () => {
    const count = inCartItems.length;
    if (count === 0) return;

    startTransition(async () => {
      try {
        await clearBoughtShoppingListItemsAction(kitchenId);
        setListItems((prev) => prev.filter((i) => !i.is_purchased || !!i.checkout_id));
        toast.success(`Cleared ${count} item${count === 1 ? "" : "s"} from cart`);
      } catch (err: any) {
        toast.error(err.message || "Failed to clear cart.");
      }
    });
  };

  const openItems = listItems.filter((i) => !i.is_purchased);
  const inCartItems = listItems.filter((i) => i.is_purchased && !i.checkout_id);
  const resolvedItems = listItems.filter((i) => !!i.checkout_id);

  return (
    <Card className="border-border bg-card rounded-3xl p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">Shopping List</h2>
          <Badge variant="warm" className="text-xs font-mono">
            {openItems.length} needed
          </Badge>
          {inCartItems.length > 0 && (
            <Badge variant="success" className="text-xs font-mono">
              {inCartItems.length} in cart
            </Badge>
          )}
        </div>

        {inCartItems.length > 0 && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleClearBought}
            disabled={isPending}
            className="h-8 px-3 rounded-lg text-xs font-semibold"
            title="Clear all in-cart items from the shopping list"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground mr-1" />
            )}
            <span>Clear Cart ({inCartItems.length})</span>
          </Button>
        )}
      </div>

      <form onSubmit={handleAddCustomItem} className="flex items-center gap-2">
        <Input
          type="text"
          value={customItemName}
          onChange={(e) => setCustomItemName(e.target.value)}
          placeholder="e.g. Oat milk, Olive oil, Dish soap..."
          className="flex-1 rounded-xl h-10"
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={isPending || !customItemName.trim()}
          className="rounded-xl h-10 px-4 font-medium shrink-0 border border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
        >
          <Plus className="w-4 h-4" />
          <span>Add</span>
        </Button>
      </form>

      {/* Open / Needed items */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
          <span>Needed Items ({openItems.length})</span>
        </div>

        <div className="divide-y divide-border">
          {openItems.length === 0 && (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Nothing needed right now. Add a custom item above or mark a pantry staple as &ldquo;Empty&rdquo;.
            </p>
          )}
          {openItems.map((item) => (
            <div
              key={item.id}
              className="py-3 flex items-center justify-between gap-3 text-sm hover:bg-muted/40 px-2 rounded-xl transition"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                <span className="font-medium text-foreground truncate">{item.name}</span>

                {item.pantry_item_id ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 font-medium text-muted-foreground"
                    title="Auto-synced from pantry inventory"
                  >
                    <Package className="w-2.5 h-2.5 mr-0.5" />
                    Pantry
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 font-medium"
                    title="Ad-hoc custom item"
                  >
                    Custom
                  </Badge>
                )}

                <Badge
                  variant="warm"
                  className="text-[10px] px-2 py-0.5 gap-1 shrink-0 font-medium"
                  title="Needs to be purchased"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-warning" />
                  <span>OPEN</span>
                </Badge>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePutInCart(item)}
                  disabled={isPending}
                  title="Stage in active cart"
                  className="h-8 px-3 rounded-lg text-xs font-semibold border-border hover:bg-muted gap-1.5 text-foreground"
                >
                  <CartIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Put in Cart</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleRemove(item)}
                  disabled={isPending}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                  title={
                    item.pantry_item_id
                      ? "Remove from list (restocks in pantry)"
                      : "Delete custom item from shopping list"
                  }
                  aria-label={`Remove ${item.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* In-Cart / Staged Items Section */}
      {inCartItems.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            <span className="flex items-center gap-1.5">
              <CartIcon className="w-3.5 h-3.5 text-accent-success" />
              <span>In Cart ({inCartItems.length})</span>
            </span>
          </div>

          <div className="divide-y divide-border">
            {inCartItems.map((item) => {
              const isMine = item.purchased_by === currentUserId;
              const attribution = isMine
                ? "You"
                : item.purchased_by_name
                ? capitalize(item.purchased_by_name)
                : "Member";

              return (
                <div
                  key={item.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-sm hover:bg-muted/40 px-2 rounded-xl transition"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                    <span className="font-medium text-muted-foreground line-through decoration-muted-foreground/40 truncate">
                      {item.name}
                    </span>

                    <Badge
                      variant="pending"
                      className="text-[10px] px-2 py-0.5 gap-1 shrink-0 font-medium"
                      title="Staged in cart"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-success" />
                      <span>IN CART</span>
                    </Badge>

                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <User className="w-3 h-3 text-muted-foreground/60" />
                      <span>{attribution}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReturnToList(item)}
                      disabled={isPending}
                      className="h-8 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg gap-1"
                      title="Return item to needed shopping list"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Undo</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemove(item)}
                      disabled={isPending}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                      title="Delete item"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resolved / Checked out items */}
      {resolvedItems.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            <span>Checked Out ({resolvedItems.length})</span>
          </div>

          <div className="divide-y divide-border">
            {resolvedItems.map((item) => (
              <div
                key={item.id}
                className="py-2 flex items-center justify-between gap-3 text-xs text-muted-foreground px-2"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="truncate line-through">{item.name}</span>
                  <Badge
                    variant="success"
                    className="text-[9px] px-1.5 py-0 gap-0.5 shrink-0"
                  >
                    <CheckCheck className="w-2.5 h-2.5" />
                    <span>RESOLVED</span>
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}


