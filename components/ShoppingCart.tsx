"use client";

import { useState, useEffect, useTransition } from "react";
import {
  returnToShoppingListAction,
  clearCartAction,
} from "@/app/actions/pantry";
import type { ShoppingListItem } from "@/types";
import {
  ShoppingCart as CartIcon,
  RotateCcw,
  Trash2,
  Receipt,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { capitalize } from "@/lib/utils";
import { toast } from "sonner";

export function ShoppingCart({
  kitchenId,
  items,
  currentUserId,
}: {
  kitchenId: string;
  items: ShoppingListItem[];
  currentUserId: string;
}) {
  const [allItems, setAllItems] = useState<ShoppingListItem[]>(items);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setAllItems(items);
  }, [items]);

  const cartItems = allItems.filter(
    (i) => i.is_purchased && !i.checkout_id
  );

  const handleReturnToList = (item: ShoppingListItem) => {
    setAllItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, is_purchased: false, purchased_by: null } : i
      )
    );

    startTransition(async () => {
      try {
        await returnToShoppingListAction(kitchenId, item.id);
        toast.success(`Returned "${item.name}" to shopping list`);
      } catch (err: any) {
        setAllItems((prev) =>
          prev.map((i) => (i.id === item.id ? item : i))
        );
        toast.error(err.message || "Failed to return item to list.");
      }
    });
  };

  const handleClearCart = () => {
    const count = cartItems.length;
    if (count === 0) return;

    setAllItems((prev) => prev.filter((i) => !i.is_purchased || !!i.checkout_id));

    startTransition(async () => {
      try {
        await clearCartAction(kitchenId);
        toast.success(`Cleared ${count} item${count === 1 ? "" : "s"} from cart`);
      } catch (err: any) {
        setAllItems(items);
        toast.error(err.message || "Failed to clear cart.");
      }
    });
  };

  const handleProceedToReceipt = () => {
    if (cartItems.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }
    setIsOpen(false);
    toast.info("Receipt upload flow coming up next!");
  };

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="relative rounded-xl font-medium border border-border/80 hover:bg-muted transition"
      >
        <CartIcon className="w-4 h-4 mr-1.5 text-muted-foreground" />
        <span>Cart</span>
        {cartItems.length > 0 && (
          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-secondary text-foreground border border-border text-[11px] font-bold">
            {cartItems.length}
          </span>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg bg-card border border-border p-6 text-card-foreground flex flex-col gap-5 rounded-3xl shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <CartIcon className="w-5 h-5 text-accent-brand" />
              <DialogTitle className="text-lg font-bold text-foreground">
                Active Cart
              </DialogTitle>
              <Badge variant="secondary" className="text-xs px-2 py-0.5 font-mono">
                {cartItems.length} {cartItems.length === 1 ? "item" : "items"}
              </Badge>
            </div>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Staged items pending checkout or receipt upload.
            </DialogDescription>
          </DialogHeader>

          {cartItems.length === 0 ? (
            <div className="py-10 px-6 text-center rounded-2xl border border-dashed border-border bg-muted/20 flex flex-col items-center justify-center">
              <CartIcon className="w-8 h-8 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-medium text-foreground">
                Your cart is currently empty.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Click &ldquo;Put in Cart&rdquo; on any open item in the shopping list to stage it here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1 py-1">
              {cartItems.map((item) => {
                const isMine = item.purchased_by === currentUserId;
                const attribution = isMine
                  ? "You"
                  : item.purchased_by_name
                  ? capitalize(item.purchased_by_name)
                  : "Member";

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border/80"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-accent-success shrink-0" />
                        <span className="font-medium text-sm text-foreground truncate">
                          {item.name}
                        </span>
                        {item.pantry_item_id ? (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 font-medium text-muted-foreground shrink-0"
                          >
                            Pantry
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1.5 py-0 font-medium shrink-0"
                          >
                            Custom
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Added by {attribution}
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleReturnToList(item)}
                      disabled={isPending}
                      className="h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-muted gap-1.5 shrink-0 rounded-lg"
                      title="Return to shopping list"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Return to List</span>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter className="flex items-center justify-between gap-3 pt-4 border-t border-border mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearCart}
              disabled={isPending || cartItems.length === 0}
              className="h-9 rounded-xl text-xs gap-1.5"
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>Clear Cart</span>
            </Button>

            <Button
              type="button"
              onClick={handleProceedToReceipt}
              disabled={cartItems.length === 0}
              className="h-9 px-4 text-xs font-medium rounded-xl gap-2"
              title="Proceed to receipt upload"
            >
              <Receipt className="w-4 h-4" />
              <span>Proceed to Receipt Upload</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

