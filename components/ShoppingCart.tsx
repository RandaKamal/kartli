"use client";

import { useState, useEffect, useTransition } from "react";
import { checkoutAction } from "@/app/actions/checkout";
import type { ShoppingListItem } from "@/types";
import { ShoppingCart as CartIcon, X, Upload, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const [receiptUploaded, setReceiptUploaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setAllItems(items);
  }, [items]);

  const cartItems = allItems.filter(
    (i) => i.is_purchased && !i.checkout_id && i.purchased_by === currentUserId
  );

  const handleCheckout = () => {
    if (!receiptUploaded) {
      toast.error("Please attach a receipt first.");
      return;
    }

    startTransition(async () => {
      try {
        await checkoutAction(kitchenId, "receipt.jpg");
        setReceiptUploaded(false);
        setIsOpen(false);
        toast.success("Checked out successfully! Waiting for admin refund.");
      } catch (err: any) {
        toast.error(err.message || "Checkout failed.");
      }
    });
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen((v) => !v)}
        className="relative rounded-xl font-medium"
      >
        <CartIcon className="w-4 h-4 mr-1 text-zinc-300" />
        <span>Cart</span>
        {cartItems.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-white text-black text-[10px] font-bold shadow-sm">
            {cartItems.length}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 p-4 space-y-3 animate-in fade-in-50 zoom-in-95">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Your Cart</h3>
              {cartItems.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {cartItems.length}
                </Badge>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsOpen(false)}
              className="text-zinc-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {cartItems.length === 0 ? (
            <p className="text-xs text-zinc-500 py-3 text-center">
              Nothing in your cart yet. Mark items as bought on the shopping list.
            </p>
          ) : (
            <div className="divide-y divide-zinc-800/80 max-h-48 overflow-y-auto pr-1">
              {cartItems.map((item) => (
                <div key={item.id} className="py-2 text-xs font-medium text-zinc-200 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-muted-green" />
                  <span className="truncate">{item.name}</span>
                </div>
              ))}
            </div>
          )}

          {cartItems.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <Button
                type="button"
                variant={receiptUploaded ? "outline" : "ghost"}
                size="sm"
                onClick={() => {
                  setReceiptUploaded(true);
                  toast.success("Receipt attached!");
                }}
                className={`w-full justify-start text-xs rounded-xl ${
                  receiptUploaded
                    ? "border-accent-muted-green/40 text-accent-muted-green bg-accent-muted-green/10"
                    : "border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {receiptUploaded ? (
                  <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-accent-muted-green shrink-0" />
                ) : (
                  <Upload className="w-3.5 h-3.5 mr-2 text-zinc-400 shrink-0" />
                )}
                <span>{receiptUploaded ? "Receipt Attached (receipt.jpg)" : "Attach Receipt"}</span>
              </Button>

              <Button
                type="button"
                onClick={handleCheckout}
                disabled={isPending || !receiptUploaded}
                className="w-full rounded-xl font-semibold shadow-sm text-xs"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                <span>{isPending ? "Checking out..." : "Complete Checkout"}</span>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

