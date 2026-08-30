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
          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-accent-primary text-white text-[11px] font-bold">
            {cartItems.length}
          </span>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg bg-zinc-950 border border-zinc-800 p-6 text-zinc-100 flex flex-col gap-5 rounded-xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <CartIcon className="w-5 h-5 text-zinc-200" />
              <DialogTitle className="text-lg font-bold text-zinc-100">
                Active Cart
              </DialogTitle>
              <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-zinc-800 text-zinc-300 border-zinc-700">
                {cartItems.length} {cartItems.length === 1 ? "item" : "items"}
              </Badge>
            </div>
            <DialogDescription className="text-sm text-zinc-400 mt-1">
              Staged items pending checkout or receipt upload.
            </DialogDescription>
          </DialogHeader>

          {cartItems.length === 0 ? (
            <div className="py-10 px-6 text-center rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30 flex flex-col items-center justify-center">
              <CartIcon className="w-8 h-8 text-zinc-600 mb-2" />
              <p className="text-sm font-medium text-zinc-400">
                Your cart is currently empty.
              </p>
              <p className="text-xs text-zinc-500 mt-1">
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
                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/80 border border-zinc-800"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="font-medium text-sm text-zinc-100 truncate">
                          {item.name}
                        </span>
                        <span className="text-[10px] uppercase font-semibold text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">
                          {item.pantry_item_id ? "Pantry" : "Custom"}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        Added by {attribution}
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleReturnToList(item)}
                      disabled={isPending}
                      className="h-8 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 gap-1.5 shrink-0"
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

          <DialogFooter className="flex items-center justify-between gap-3 pt-4 border-t border-zinc-800/80 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearCart}
              disabled={isPending || cartItems.length === 0}
              className="h-9 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs gap-1.5"
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
              className="h-9 px-4 text-xs font-medium bg-white text-black hover:bg-zinc-200 rounded-md transition-colors gap-2"
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

