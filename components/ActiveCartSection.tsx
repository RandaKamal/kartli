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
  ShoppingBag,
  User,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useI18n } from "@/context/i18n-context";

interface ActiveCartSectionProps {
  kitchenId: string;
  items: ShoppingListItem[];
  currentUserId: string;
  spaceType?: KitchenSpaceType;
  onSwitchTab?: (tab: string) => void;
}

export function ActiveCartSection({
  kitchenId,
  items,
  currentUserId,
  spaceType = "FLATSHARE",
  onSwitchTab,
}: ActiveCartSectionProps) {
  const router = useRouter();
  const { t, lang } = useI18n();
  const [allItems, setAllItems] = useState<ShoppingListItem[]>(items);
  const [isPending, startTransition] = useTransition();
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isReceiptlessModalOpen, setIsReceiptlessModalOpen] = useState(false);

  const terminology = getSpaceTerminology(spaceType, lang);

  useEffect(() => {
    setAllItems(items);
  }, [items]);

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
    setIsReceiptModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card className="border border-border bg-card rounded-3xl p-4 sm:p-6 md:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            {/* Top Badges Row */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <Badge variant="secondary" className="border border-border text-muted-foreground text-[11px] font-medium tracking-wider uppercase gap-1">
                <CartIcon className="w-3 h-3 text-muted-foreground" />
                <span>ACTIVE CART WORKSPACE</span>
              </Badge>
              {myCartItems.length > 0 && (
                <Badge
                  variant="secondary"
                  className="text-[11px] font-mono bg-muted text-foreground border-border gap-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-success shadow-[0_0_6px_rgba(129,178,154,0.5)]" />
                  <span>{myCartItems.length} in your cart</span>
                </Badge>
              )}
            </div>

            {/* Title & Subtitle */}
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
              Active Household Cart
            </h2>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {terminology.cartRoommateDescription}
            </p>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full sm:w-auto shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearCart}
              disabled={isPending || myCartItems.length === 0}
              className="w-full sm:w-auto rounded-xl text-xs font-semibold h-10 sm:h-9 px-3.5 gap-1.5 border-border hover:bg-secondary justify-center"
              title={
                myCartItems.length > 0
                  ? `Return ${myCartItems.length} item(s) from your cart to the needed list`
                  : "Your cart is empty"
              }
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              <span>{t("cart.clearCart")}</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsReceiptlessModalOpen(true)}
              disabled={myCartItems.length === 0}
              className="w-full sm:w-auto rounded-xl text-xs font-semibold h-10 sm:h-9 px-3.5 border border-border/80 hover:bg-secondary justify-center text-muted-foreground hover:text-foreground"
              title={t("cart.checkoutWithoutReceipt")}
            >
              {t("cart.checkoutWithoutReceipt")}
            </Button>

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleProceedToReceipt}
              disabled={myCartItems.length === 0}
              className="w-full sm:w-auto rounded-xl text-xs font-semibold h-10 sm:h-9 px-4 gap-2 shadow-sm justify-center"
              title={t("cart.proceedToReceipt")}
            >
              <Receipt className="w-4 h-4" />
              <span>{t("cart.proceedToReceipt")}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Household Cart Content */}
      {totalHouseholdCartCount === 0 ? (
        <Card className="border border-dashed border-border bg-card/50 rounded-3xl p-8 sm:p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center mx-auto text-muted-foreground">
            <CartIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-sm font-semibold text-foreground">
              {t("cart.empty")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("cart.emptySub")}
            </p>
          </div>
          {onSwitchTab && (
            <div className="pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onSwitchTab("kitchen")}
                className="rounded-xl text-xs font-semibold gap-1.5 h-9 px-4"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Go to Shopping List</span>
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Your Staged Items */}
          <Card className="border border-border bg-card rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CartIcon className="w-4 h-4 text-accent-success" />
                <h3 className="text-base font-semibold text-foreground">Your Staged Items</h3>
                <Badge
                  variant="pending"
                  className="text-xs font-mono bg-accent-sage/15 text-accent-success border-accent-sage/30"
                >
                  {myCartItems.length}
                </Badge>
              </div>
              {myCartItems.length > 0 && (
                <span className="text-[11px] text-accent-success font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-success shadow-[0_0_6px_rgba(129,178,154,0.4)]" />
                  Ready to checkout
                </span>
              )}
            </div>

            {myCartItems.length === 0 ? (
              <div className="py-10 text-center rounded-2xl border border-dashed border-border bg-muted/30 space-y-2">
                <p className="text-xs text-muted-foreground">
                  You haven&apos;t staged any items in your cart yet.
                </p>
                {onSwitchTab && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onSwitchTab("kitchen")}
                    className="text-xs text-accent-success hover:text-accent-success hover:bg-accent-sage/10 rounded-lg gap-1 h-8"
                  >
                    <span>Browse Shopping List</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {myCartItems.map((item) => (
                  <div
                    key={item.id}
                    className="py-3 flex items-center justify-between gap-3 text-sm hover:bg-muted/40 px-2 rounded-xl transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="w-2 h-2 rounded-full bg-accent-success shrink-0 shadow-[0_0_6px_rgba(129,178,154,0.4)]" />
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
                        size="sm"
                        variant="ghost"
                        onClick={() => handleReturnToList(item)}
                        disabled={isPending}
                        className="h-8.5 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary gap-1.5 rounded-lg"
                        title="Return item to shopping list"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Return to List</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Right Column: Roommates' Staged Items (Read-Only) */}
          <Card className="border border-border bg-card rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-base font-semibold text-foreground">
                  Staged by {terminology.memberLabelPlural}
                </h3>
                <Badge variant="secondary" className="text-xs font-mono">
                  {otherCartItems.length}
                </Badge>
              </div>
              <span className="text-[11px] text-muted-foreground">Read-only view</span>
            </div>

            {otherCartItems.length === 0 ? (
              <div className="py-10 text-center rounded-2xl border border-dashed border-border bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  No items currently staged by {terminology.memberLabelPlural.toLowerCase()}.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
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
                      className="py-3 flex items-center justify-between gap-3 text-sm hover:bg-muted/40 px-2 rounded-xl transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 flex-wrap">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isGuest
                              ? "bg-accent-ochre"
                              : "bg-accent-sage/70"
                          }`}
                        />
                        <span className="font-medium text-muted-foreground truncate">
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
                        {isGuest ? (
                          <Badge
                            variant="warm"
                            className="text-[10px] px-2 py-0.5 font-medium shrink-0 bg-accent-ochre/15 text-accent-warning border-accent-ochre/30 gap-1"
                          >
                            <User className="w-3 h-3" />
                            <span>Guest (in cart)</span>
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-2 py-0.5 text-muted-foreground shrink-0 bg-muted/40 border-border gap-1"
                          >
                            <User className="w-3 h-3 text-muted-foreground/70" />
                            <span>In {attribution}&apos;s Cart</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

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
    </div>
  );
}
