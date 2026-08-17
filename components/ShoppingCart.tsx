"use client";

import { useState, useEffect, useTransition } from "react";
import { checkoutAction } from "@/app/actions/checkout";
import type { ShoppingListItem } from "@/types";
import { ShoppingCart as CartIcon, X, Upload, Loader2 } from "lucide-react";

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
const [errorMessage, setErrorMessage] = useState<string | null>(null);
const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setAllItems(items);
  }, [items]);

  const cartItems = allItems.filter(
    (i) => i.is_purchased && !i.checkout_id && i.purchased_by === currentUserId
  );

  const handleCheckout = () => {
  if (!receiptUploaded) {
    setErrorMessage("Upload a receipt first.");
    return;
  }
  setErrorMessage(null);
  setSuccessMessage(null);

  startTransition(async () => {
    try {
      await checkoutAction(kitchenId, "receipt.jpg");
      setReceiptUploaded(false);
      setSuccessMessage("Checked out! Waiting for admin refund.");
    } catch (err: any) {
      setErrorMessage(err.message || "Checkout failed.");
    }
  });
};


  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="relative inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white hover:bg-zinc-700 text-sm font-medium transition"
      >
        <CartIcon className="w-4 h-4" />
        <span>Cart</span>
        {cartItems.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-white text-black text-[10px] font-bold">
            {cartItems.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Your Cart</h3>
            <button type="button" onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          {cartItems.length === 0 ? (
            <p className="text-xs text-zinc-500 py-2">
              Nothing in your cart yet. Mark items as bought on the shopping list.
            </p>
          ) : (
            <div className="divide-y divide-zinc-800 max-h-48 overflow-y-auto">
              {cartItems.map((item) => (
                <div key={item.id} className="py-2 text-sm text-zinc-200">
                  {item.name}
                </div>
              ))}
            </div>
          )}

          {errorMessage && (
            <div className="p-2.5 bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-lg">{errorMessage}</div>
          )}
          {successMessage && (
            <div className="p-2.5 bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-lg">{successMessage}</div>
          )}

          {cartItems.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setReceiptUploaded(true)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition ${
                  receiptUploaded
                    ? "bg-zinc-100 border-white text-black font-semibold"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <Upload className="w-3.5 h-3.5 shrink-0" />
                <span>{receiptUploaded ? "Receipt uploaded" : "Upload Receipt"}</span>
              </button>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={isPending || !receiptUploaded}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 disabled:opacity-50 text-sm transition"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isPending ? "Checking out..." : "Checkout"}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
