"use client";

import { useState, useTransition, useEffect } from "react";
import {
  addCustomShoppingItemAction,
  moveToCartAction,
  returnToShoppingListAction,
  removeShoppingListItemAction,
  clearCartAction,
  unstageGuestItemAction,
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
  isAdmin = false,
}: {
  kitchenId: string;
  items: ShoppingListItem[];
  currentUserId?: string;
  isAdmin?: boolean;
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

  const handleReturnToList = (item: ShoppingListItem) => {
    if (item.purchased_by !== currentUserId && !isAdmin) {
      toast.error("You cannot modify another roommate's staged cart.");
      return;
    }

    setListItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, is_purchased: false, purchased_by: null, is_guest_staged: false }
          : i
      )
    );

    startTransition(async () => {
      try {
        await returnToShoppingListAction(kitchenId, item.id);
        toast.success(`Returned "${item.name}" to shopping list`);
      } catch (err: any) {
        setListItems((prev) =>
          prev.map((i) => (i.id === item.id ? item : i))
        );
        toast.error(err.message || "Failed to return item to list.");
      }
    });
  };

  const handleUnstageGuestItem = (item: ShoppingListItem) => {
    if (!isAdmin) {
      toast.error("Only admins can unstage guest items.");
      return;
    }

    setListItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, is_guest_staged: false, is_purchased: false, purchased_by: null }
          : i
      )
    );

    startTransition(async () => {
      try {
        await unstageGuestItemAction({ kitchenId, itemId: item.id });
        toast.success(`Unstaged "${item.name}" and returned to needed list`);
      } catch (err: any) {
        setListItems(items);
        toast.error(err.message || "Failed to unstage guest item.");
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

  const handleClearMyCart = () => {
    const count = myCartItems.length;
    if (count === 0) return;

    // Optimistically return current user's cart items back to open list
    setListItems((prev) =>
      prev.map((i) =>
        i.is_purchased && !i.checkout_id && i.purchased_by === currentUserId
          ? { ...i, is_purchased: false, purchased_by: null, is_guest_staged: false }
          : i
      )
    );

    startTransition(async () => {
      try {
        await clearCartAction(kitchenId);
        toast.success(`Returned ${count} item${count === 1 ? "" : "s"} to shopping list`);
      } catch (err: any) {
        toast.error(err.message || "Failed to clear cart.");
      }
    });
  };

  const openItems = listItems.filter((i) => !i.is_purchased && !i.is_guest_staged);
  const myCartItems = listItems.filter(
    (i) => i.is_purchased && !i.is_guest_staged && !i.checkout_id && i.purchased_by === currentUserId
  );
  const inCartItems = listItems.filter(
    (i) => (i.is_purchased || i.is_guest_staged) && !i.checkout_id
  );
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

        {myCartItems.length > 0 && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleClearMyCart}
            disabled={isPending}
            className="h-8 px-3 rounded-lg text-xs font-semibold"
            title={`Return ${myCartItems.length} item(s) from your cart to the needed list`}
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5 text-muted-foreground mr-1" />
            )}
            <span>Clear My Cart ({myCartItems.length})</span>
          </Button>
        )}
      </div>

      {/* Add Custom Item Input */}
      <form onSubmit={handleAddCustomItem} className="flex gap-2">
        <Input
          type="text"
          placeholder="Add extra item (e.g. Oat Milk, Coffee)..."
          value={customItemName}
          onChange={(e) => setCustomItemName(e.target.value)}
          disabled={isPending}
          className="text-sm h-9 rounded-xl"
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
          <div className="py-8 text-center rounded-2xl border border-dashed border-border bg-muted/20">
            <CheckCheck className="w-6 h-6 text-accent-success mx-auto mb-1.5 opacity-80" />
            <p className="text-sm font-medium text-foreground">All stocked up!</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Items will appear here when marked empty or added above.
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
                      className="text-[10px] px-1.5 py-0 font-medium text-muted-foreground shrink-0"
                    >
                      Pantry
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 font-medium shrink-0"
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
              const isGuest = item.is_guest_staged;
              const isMine = !isGuest && item.purchased_by === currentUserId;
              const attribution = isGuest
                ? "Guest"
                : isMine
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

                    {isGuest ? (
                      <Badge
                        variant="warm"
                        className="text-[10px] px-2 py-0.5 gap-1 shrink-0 font-medium"
                        title="Staged in anonymous guest cart"
                      >
                        <User className="w-3 h-3 text-accent-warning" />
                        <span>Guest (in cart)</span>
                      </Badge>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isGuest ? (
                      isAdmin ? (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnstageGuestItem(item)}
                            disabled={isPending}
                            className="h-8 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg gap-1"
                            title="Unstage guest item and return to needed list"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Unstage</span>
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
                        </>
                      ) : null
                    ) : isMine ? (
                      <>
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
                      </>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-2 py-0.5 text-muted-foreground font-medium bg-muted/20 border-border/80"
                      >
                        In {attribution}&apos;s Cart
                      </Badge>
                    )}
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
