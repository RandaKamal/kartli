"use client";

import { useState, useTransition, useEffect } from "react";
import {
  addCustomShoppingItemAction,
  moveToCartAction,
  removeShoppingListItemAction,
} from "@/app/actions/pantry";
import type { ShoppingListItem, KitchenSpaceType } from "@/types";
import { getSpaceWording } from "@/lib/space-wording";
import {
  ShoppingCart as CartIcon,
  Trash2,
  CheckCheck,
  Loader2,
  Plus,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function ShoppingListSection({
  kitchenId,
  items,
  currentUserId,
  isAdmin = false,
  spaceType = "FLATSHARE",
  onViewCart,
}: {
  kitchenId: string;
  items: ShoppingListItem[];
  currentUserId?: string;
  isAdmin?: boolean;
  spaceType?: KitchenSpaceType;
  onViewCart?: () => void;
}) {
  const wording = getSpaceWording(spaceType);
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

  const handleMoveToCart = (item: ShoppingListItem) => {
    setListItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, is_purchased: true, purchased_by: currentUserId || null, is_guest_staged: false }
          : i
      )
    );

    startTransition(async () => {
      try {
        await moveToCartAction(kitchenId, item.id);
        toast.success(`Moved "${item.name}" to cart`);
      } catch (err: any) {
        setListItems((prev) =>
          prev.map((i) => (i.id === item.id ? item : i))
        );
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

  const openItems = listItems.filter((i) => !i.is_purchased && !i.is_guest_staged);
  const myStagedItemsCount = listItems.filter(
    (i) =>
      i.is_purchased &&
      !i.is_guest_staged &&
      !i.checkout_id &&
      i.purchased_by === currentUserId
  ).length;
  const resolvedItems = listItems.filter((i) => !!i.checkout_id);

  return (
    <Card className="border border-border bg-card rounded-3xl p-4 sm:p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">Shopping List</h2>
          <Badge variant="warm" className="text-xs font-mono bg-accent-ochre/15 text-accent-warning border-accent-ochre/30">
            {openItems.length} needed
          </Badge>
        </div>
      </div>

      {/* Add Custom Item Input */}
      <form onSubmit={handleAddCustomItem} className="flex gap-2">
        <Input
          type="text"
          placeholder="Add extra item (e.g. Oat Milk, Coffee)..."
          value={customItemName}
          onChange={(e) => setCustomItemName(e.target.value)}
          disabled={isPending}
          className="text-sm h-9 rounded-xl bg-background border-border text-foreground"
        />
        <Button
          type="submit"
          disabled={isPending || !customItemName.trim()}
          size="sm"
          className="h-9 px-3 shrink-0 rounded-xl"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-1" />
          )}
          <span>Add</span>
        </Button>
      </form>

      {/* Needed Items List */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Needed Items ({openItems.length})
        </div>

        {openItems.length === 0 ? (
          <div className="py-8 text-center rounded-2xl border border-dashed border-border bg-muted/30">
            <CheckCheck className="w-6 h-6 text-accent-success mx-auto mb-1.5 opacity-80" />
            <p className="text-sm font-medium text-foreground">{wording.emptyListHeading}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {wording.emptyListSub}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {openItems.map((item) => (
              <div
                key={item.id}
                className="py-2.5 flex items-center justify-between gap-3 text-sm hover:bg-muted/40 px-2 rounded-xl transition"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="w-2 h-2 rounded-full bg-accent-warning shrink-0" />
                  <span className="font-medium text-foreground truncate">
                    {item.name}
                  </span>
                  {item.pantry_item_id ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 font-medium text-muted-foreground shrink-0 border-border"
                    >
                      Pantry
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 font-medium shrink-0 bg-secondary text-secondary-foreground"
                    >
                      Custom
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleMoveToCart(item)}
                    disabled={isPending}
                    className="h-8 px-2.5 text-xs font-medium border-border hover:bg-secondary rounded-lg gap-1.5"
                    title="Put in shopping cart"
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
                        ? "Remove from list and mark in-stock"
                        : "Delete item"
                    }
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compact In-Cart Callout Bar (Strictly Current User's Staged Items) */}
      {myStagedItemsCount > 0 && (
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-muted/40 border border-border">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-accent-success shrink-0 shadow-xs" />
              <span className="text-xs text-muted-foreground font-medium truncate">
                <strong className="text-foreground font-semibold">{myStagedItemsCount}</strong> {myStagedItemsCount === 1 ? "item" : "items"} staged in your cart
              </span>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (onViewCart) {
                  onViewCart();
                } else if (typeof window !== "undefined") {
                  const url = new URL(window.location.href);
                  url.searchParams.set("tab", "cart");
                  window.history.replaceState({}, "", url.toString());
                }
              }}
              className="h-7 text-xs text-foreground hover:bg-muted gap-1 px-2.5 shrink-0 rounded-lg font-medium cursor-pointer"
            >
              <span>View Cart Tab</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
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
                className="py-2 flex items-center justify-between gap-3 text-xs opacity-60 px-2"
              >
                <span className="font-medium line-through truncate text-muted-foreground">
                  {item.name}
                </span>
                <span className="text-muted-foreground shrink-0 text-[11px] font-mono">
                  Checked out
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
