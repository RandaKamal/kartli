"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  returnToShoppingListAction,
  clearCartAction,
} from "@/app/actions/pantry";
import type { ShoppingListItem, KitchenSpaceType } from "@/types";
import { getSpaceTerminology } from "@/lib/spaceTerminology";
import { capitalize } from "@/lib/utils";
import { ReceiptReviewModal } from "@/components/ReceiptReviewModal";
import { ReceiptlessCheckoutDialog } from "@/components/ReceiptlessCheckoutDialog";
import {
  ShoppingCart as CartIcon,
  RotateCcw,
  Trash2,
  Receipt,
  Loader2,
  Users,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ShoppingCartProps {
  kitchenId: string;
  items: ShoppingListItem[];
  currentUserId: string;
  spaceType?: KitchenSpaceType;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ShoppingCart({
  kitchenId,
  items,
  currentUserId,
  spaceType = "FLATSHARE",
  isOpen: controlledIsOpen,
  onOpenChange: setControlledIsOpen,
}: ShoppingCartProps) {
  const router = useRouter();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [allItems, setAllItems] = useState<ShoppingListItem[]>(items);
  const [isPending, startTransition] = useTransition();
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isReceiptlessModalOpen, setIsReceiptlessModalOpen] = useState(false);

  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    if (isControlled && setControlledIsOpen) {
      setControlledIsOpen(open);
    } else {
      setInternalIsOpen(open);
    }
  };

  const terminology = getSpaceTerminology(spaceType);

  useEffect(() => {
    setAllItems(items);
  }, [items]);

  useEffect(() => {
    const handleOpenCartModal = () => {
      setIsOpen(true);
    };

    window.addEventListener("open-cart-modal", handleOpenCartModal);
    return () => {
      window.removeEventListener("open-cart-modal", handleOpenCartModal);
    };
  }, []);

  const myCartItems = allItems.filter(
    (i) => i.is_purchased && !i.is_guest_staged && !i.checkout_id && i.purchased_by === currentUserId
  );
  const otherCartItems = allItems.filter(
    (i) =>
      (i.is_purchased || i.is_guest_staged) &&
      !i.checkout_id &&
      (i.purchased_by !== currentUserId || i.is_guest_staged)
  );

  const totalHouseholdCartCount = myCartItems.length + otherCartItems.length;
  const isEmpty = totalHouseholdCartCount === 0;
  const hasUserItems = myCartItems.length > 0;

  const handleReturnToList = (item: ShoppingListItem) => {
    if (item.purchased_by !== currentUserId) {
      toast.error(`You cannot modify another ${terminology.memberLabel.toLowerCase()}'s cart.`);
      return;
    }

    setAllItems((prev) =>
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
        router.refresh();
      } catch (err: any) {
        setAllItems(items);
        toast.error(err.message || "Failed to return item to list.");
      }
    });
  };

  const handleClearCart = () => {
    const count = myCartItems.length;
    if (count === 0) return;

    setAllItems((prev) =>
      prev.map((i) =>
        i.is_purchased && !i.is_guest_staged && !i.checkout_id && i.purchased_by === currentUserId
          ? { ...i, is_purchased: false, purchased_by: null, is_guest_staged: false }
          : i
      )
    );

    startTransition(async () => {
      try {
        await clearCartAction(kitchenId);
        toast.success(`Returned ${count} item${count === 1 ? "" : "s"} to shopping list`);
        router.refresh();
      } catch (err: any) {
        setAllItems(items);
        toast.error(err.message || "Failed to clear cart.");
      }
    });
  };

  const handleProceedToReceipt = () => {
    if (myCartItems.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }
    setIsOpen(false);
    setIsReceiptModalOpen(true);
  };

  return (
    <>
      {isEmpty ? (
        /* State A: Empty Cart (0 items in household) */
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="relative rounded-xl font-medium border-border text-muted-foreground hover:text-foreground transition h-9 px-3"
          title="Household cart is empty"
        >
          <CartIcon className="w-4 h-4 mr-1.5 text-muted-foreground" />
          <span>Cart</span>
        </Button>
      ) : (
        /* State B: Active Household Cart (items staged by user or roommates) */
        <Button
          type="button"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="relative rounded-xl font-medium bg-secondary text-secondary-foreground border border-border shadow-sm transition flex items-center gap-2 px-3 h-9"
          title={
            hasUserItems
              ? `${myCartItems.length} item(s) in your cart (${totalHouseholdCartCount} total in household)`
              : `${otherCartItems.length} item(s) staged by ${terminology.memberLabelPlural.toLowerCase()}`
          }
        >
          {/* Live Status Indicator Dot */}
          {hasUserItems ? (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-success shadow-[0_0_8px_rgba(129,178,154,0.5)]" />
            </span>
          ) : (
            <span className="w-2 h-2 rounded-full bg-accent-ochre shadow-[0_0_6px_rgba(233,196,106,0.4)] shrink-0" />
          )}

          <CartIcon className="w-4 h-4 text-muted-foreground" />
          <span>Cart</span>
          <span className="text-muted-foreground text-xs">&middot;</span>
          <Badge
            variant="secondary"
            className="text-[11px] px-1.5 py-0 font-mono font-bold"
          >
            {totalHouseholdCartCount}
          </Badge>
        </Button>
      )}

      {/* Cart Modal Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg bg-card border border-border p-6 text-card-foreground flex flex-col gap-5 rounded-3xl shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5 flex-wrap">
              <CartIcon className="w-5 h-5 text-accent-brand" />
              <DialogTitle className="text-lg font-bold text-foreground">
                Active Cart
              </DialogTitle>
              <Badge variant="secondary" className="text-xs px-2 py-0.5 font-mono">
                {myCartItems.length} in your cart
              </Badge>
              {otherCartItems.length > 0 && (
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-muted-foreground border-border">
                  {otherCartItems.length} by {terminology.memberLabelPlural.toLowerCase()}
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
              {terminology.cartRoommateDescription}
            </DialogDescription>
          </DialogHeader>

          {isEmpty ? (
            <div className="py-10 px-6 text-center rounded-2xl border border-dashed border-border bg-muted/20 flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
                <CartIcon className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Household cart is empty
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Click &ldquo;Put in Cart&rdquo; on any item in the shopping list to stage it here for checkout.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* User's Staged Items */}
              {myCartItems.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground px-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-accent-success" />
                      <span>Your Staged Items ({myCartItems.length})</span>
                    </span>
                    <span className="text-[11px] text-accent-success font-medium">
                      Ready for checkout
                    </span>
                  </div>
                  <div className="space-y-2">
                    {myCartItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border"
                      >
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-accent-success shrink-0 shadow-[0_0_6px_rgba(129,178,154,0.4)]" />
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
                          <p className="text-[11px] text-muted-foreground">
                            Added by You
                          </p>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleReturnToList(item)}
                          disabled={isPending}
                          className="h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary gap-1.5 shrink-0 rounded-lg"
                          title="Return to shopping list"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Return to List</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                  You have no items in your cart.
                </div>
              )}

              {/* Roommates' Staged Items (Read-Only) */}
              {otherCartItems.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>Staged by {terminology.memberLabelPlural} ({otherCartItems.length})</span>
                  </div>
                  <div className="space-y-2 opacity-90">
                    {otherCartItems.map((item) => {
                      const isGuest = item.is_guest_staged;
                      const attribution = isGuest
                        ? "Guest"
                        : item.purchased_by_name
                        ? capitalize(item.purchased_by_name)
                        : terminology.cartAttributionFallback;

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border"
                        >
                          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  isGuest
                                    ? "bg-accent-ochre"
                                    : "bg-accent-sage/70"
                                }`}
                              />
                              <span className="font-medium text-sm text-muted-foreground truncate">
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
                            <p className="text-[11px] text-muted-foreground">
                              Added by {attribution}
                            </p>
                          </div>

                          {isGuest ? (
                            <Badge
                              variant="warm"
                              className="text-[10px] px-2 py-0.5 font-medium shrink-0 bg-accent-ochre/15 text-accent-warning border-accent-ochre/30"
                            >
                              Guest (in cart)
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-2 py-0.5 text-muted-foreground shrink-0 bg-muted/40 border-border"
                            >
                              In {attribution}&apos;s Cart
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-border mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearCart}
              disabled={isPending || myCartItems.length === 0}
              className="h-9 rounded-xl text-xs gap-1.5 border-border"
              title={
                myCartItems.length > 0
                  ? `Return ${myCartItems.length} item(s) to shopping list`
                  : "Cart is empty"
              }
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>Clear Cart</span>
            </Button>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsOpen(false);
                  setIsReceiptlessModalOpen(true);
                }}
                disabled={isPending || myCartItems.length === 0}
                className="h-9 px-3 text-xs font-medium rounded-xl border border-border/80 hover:bg-secondary text-muted-foreground hover:text-foreground"
              >
                Checkout without Receipt
              </Button>

              <Button
                type="button"
                onClick={handleProceedToReceipt}
                disabled={myCartItems.length === 0}
                className="h-9 px-4 text-xs font-semibold rounded-xl gap-2 shadow-sm"
                title="Proceed to receipt upload"
              >
                <Receipt className="w-4 h-4" />
                <span>Proceed to Receipt Upload</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReceiptReviewModal
        kitchenId={kitchenId}
        stagedCartItems={myCartItems.map((i) => ({
          id: i.id,
          name: i.name,
          pantry_item_id: i.pantry_item_id,
        }))}
        isOpen={isReceiptModalOpen}
        onOpenChange={setIsReceiptModalOpen}
      />

      <ReceiptlessCheckoutDialog
        kitchenId={kitchenId}
        stagedCartItems={myCartItems.map((i) => ({
          id: i.id,
          name: i.name,
          pantry_item_id: i.pantry_item_id,
        }))}
        isOpen={isReceiptlessModalOpen}
        onOpenChange={setIsReceiptlessModalOpen}
      />
    </>
  );
}
