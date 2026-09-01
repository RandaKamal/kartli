"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { receiptlessCheckoutAction } from "@/app/actions/scan-receipt";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Loader2, Check, Store, DollarSign, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/context/i18n-context";

interface StagedCartItem {
  id: string;
  name: string;
  pantry_item_id: string | null;
}

interface ReceiptlessCheckoutDialogProps {
  kitchenId: string;
  stagedCartItems: StagedCartItem[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptlessCheckoutDialog({
  kitchenId,
  stagedCartItems,
  isOpen,
  onOpenChange,
}: ReceiptlessCheckoutDialogProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [storeName, setStoreName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const resetForm = useCallback(() => {
    setStoreName("");
    setTotalAmount("");
    setNote("");
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        resetForm();
      }
      onOpenChange(open);
    },
    [onOpenChange, resetForm]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (stagedCartItems.length === 0) {
      toast.error(t("cart.empty"));
      return;
    }

    const formData = new FormData();
    formData.append("kitchenId", kitchenId);
    formData.append("storeName", storeName.trim());
    formData.append("totalAmount", totalAmount ? parseFloat(totalAmount).toString() : "0");
    formData.append("note", note.trim());
    formData.append("itemIds", JSON.stringify(stagedCartItems.map((i) => i.id)));

    startTransition(async () => {
      try {
        const result = await receiptlessCheckoutAction(formData);
        if (result.success) {
          const claimedNum = parseFloat(totalAmount) || 0;
          if (claimedNum > 0) {
            toast.success(t("receiptless.successAmount", { amount: claimedNum.toFixed(2) }));
          } else {
            toast.success(t("receiptless.successNoAmount"));
          }
          router.refresh();
          resetForm();
          onOpenChange(false);
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to complete checkout.");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border border-border p-6 text-card-foreground rounded-3xl shadow-xl space-y-4">
        <DialogHeader className="space-y-1.5 text-left">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-accent-brand" />
            <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
              {t("receiptless.title")}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {t("receiptless.description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Staged Items Summary */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-muted/40 border border-border">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span>{t("receiptless.itemsToCheckout")}</span>
              <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                {stagedCartItems.length} {stagedCartItems.length === 1 ? t("common.item") : t("common.items")}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
              {stagedCartItems.map((item) => (
                <Badge
                  key={item.id}
                  variant="secondary"
                  className="text-xs font-normal bg-card border-border text-foreground"
                >
                  {item.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Store / Place Name Input */}
          <div className="space-y-1.5">
            <Label htmlFor="receiptless-store" className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{t("receiptless.storeLabel")}</span>
            </Label>
            <Input
              id="receiptless-store"
              type="text"
              placeholder={t("receiptless.storePlaceholder")}
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="h-9 text-xs rounded-xl border-border bg-transparent"
              disabled={isPending}
            />
          </div>

          {/* Total Amount Input */}
          <div className="space-y-1.5">
            <Label htmlFor="receiptless-amount" className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{t("receiptless.amountLabel")}</span>
            </Label>
            <Input
              id="receiptless-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="h-9 text-xs font-mono rounded-xl border-border bg-transparent"
              disabled={isPending}
            />
          </div>

          {/* Note to Admin Textarea */}
          <div className="space-y-1.5">
            <Label htmlFor="receiptless-note" className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{t("receiptless.noteLabel")}</span>
            </Label>
            <textarea
              id="receiptless-note"
              rows={2}
              placeholder={t("receiptless.notePlaceholder")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="flex min-h-[64px] w-full rounded-xl border border-border bg-transparent p-2.5 text-xs shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              disabled={isPending}
            />
          </div>

          <DialogFooter className="pt-2 border-t border-border flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="rounded-xl text-xs h-9 border-border"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending || stagedCartItems.length === 0}
              className="rounded-xl text-xs font-semibold h-9 px-4 gap-1.5 bg-primary text-primary-foreground shadow-sm"
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>{t("receiptless.confirm")}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
