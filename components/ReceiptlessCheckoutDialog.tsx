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
import { Loader2, Check, Store, DollarSign, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import { useTranslation } from "@/lib/i18n";

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
  const { t } = useTranslation();
  const [storeName, setStoreName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const resetForm = useCallback(() => {
    setStoreName("");
    setTotalAmount("");
    setCurrency("EUR");
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
      toast.error("Your cart is empty.");
      return;
    }

    const formData = new FormData();
    formData.append("kitchenId", kitchenId);
    formData.append("storeName", storeName.trim());
    formData.append("totalAmount", totalAmount ? parseFloat(totalAmount).toString() : "0");
    formData.append("currency", currency);
    formData.append("note", note.trim());
    formData.append("itemIds", JSON.stringify(stagedCartItems.map((i) => i.id)));

    startTransition(async () => {
      try {
        const result = await receiptlessCheckoutAction(formData);
        if (result.success) {
          const claimedNum = parseFloat(totalAmount) || 0;
          if (claimedNum > 0) {
            toast.success(`Checkout recorded! ${formatCurrency(claimedNum, currency)} refund requested.`);
          } else {
            toast.success("Items checked out and marked as purchased!");
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
      <DialogContent className="sm:max-w-md bg-card border border-border p-5 sm:p-6 text-card-foreground rounded-xl shadow-xl space-y-4">
        <DialogHeader className="space-y-1 text-left pr-8">
          <DialogTitle className="text-base font-semibold text-foreground tracking-tight">
            Checkout without Receipt
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Mark your staged cart items as purchased without uploading a receipt photo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Staged Items Summary */}
          <div className="space-y-2 p-3.5 rounded-xl bg-muted/40 border border-border">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span>Items to Checkout</span>
              <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                {stagedCartItems.length} item{stagedCartItems.length === 1 ? "" : "s"}
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
              <span>Store / Merchant Name (Optional)</span>
            </Label>
            <Input
              id="receiptless-store"
              type="text"
              placeholder="e.g. Corner Bakery, Weekly Market, Lidl"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="h-9 text-xs rounded-xl border-border/80 bg-secondary/30 focus-visible:bg-secondary/50 transition-colors"
              disabled={isPending}
            />
          </div>

          {/* Total Amount Input with Compact Currency Selector */}
          <div className="space-y-1.5">
            <Label htmlFor="receiptless-amount" className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Total Amount Claimed (Optional)</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="receiptless-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="h-9 text-xs font-mono font-medium rounded-xl border-border/80 bg-secondary/30 focus-visible:bg-secondary/50 transition-colors flex-1"
                disabled={isPending}
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-9 text-xs font-semibold bg-secondary/40 border border-border/80 rounded-xl px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shrink-0"
                aria-label="Currency"
                disabled={isPending}
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Note to Admin Textarea */}
          <div className="space-y-1.5">
            <Label htmlFor="receiptless-note" className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{t.kitchen.ledger.noteToAdminOptional}</span>
            </Label>
            <textarea
              id="receiptless-note"
              rows={2}
              placeholder={t.kitchen.ledger.noteToAdminPlaceholder}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="flex min-h-[64px] w-full rounded-lg border border-border/80 bg-secondary/20 p-2.5 text-xs shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              disabled={isPending}
            />
            <p className="text-[11px] leading-snug text-muted-foreground">
              {t.kitchen.ledger.noteToAdminHelp}
            </p>
          </div>

          <DialogFooter className="pt-2 border-t border-border flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="rounded-lg text-xs h-9 text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending || stagedCartItems.length === 0}
              className="rounded-lg text-xs font-medium h-9 px-4 gap-1.5 bg-foreground text-background hover:bg-foreground/90 transition-colors shadow-sm"
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>Confirm Checkout</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
