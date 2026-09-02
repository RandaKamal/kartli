"use client";

import { useState, useEffect, useTransition, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  scanReceiptAction,
  submitReceiptCheckoutAction,
  deleteReceiptFileAction,
  receiptlessCheckoutAction,
} from "@/app/actions/scan-receipt";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Receipt,
  Upload,
  Loader2,
  Check,
  X,
  ZoomIn,
  ZoomOut,
  Store,
  ArrowRight,
  ImageIcon,
  ChevronDown,
  ChevronUp,
  DollarSign,
  MessageSquare,
  ShoppingBag,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ReceiptLine {
  raw_name: string;
  price: number;
  quantity: number;
  matched_cart_item_id: string | null;
}

interface ScanResult {
  receiptPath: string;
  storeName: string;
  totalReceiptAmount: number;
  lines: ReceiptLine[];
}

interface StagedCartItem {
  id: string;
  name: string;
  pantry_item_id: string | null;
}

interface CheckoutDialogProps {
  kitchenId: string;
  stagedCartItems: StagedCartItem[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CheckoutDialog({
  kitchenId,
  stagedCartItems,
  isOpen,
  onOpenChange,
}: CheckoutDialogProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<"form" | "scanning" | "review" | "confirm-unmatched">("form");
  const [storeName, setStoreName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [note, setNote] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [lineStates, setLineStates] = useState<Array<{ checked: boolean; price: number }>>([]);
  const [lineMatches, setLineMatches] = useState<Array<string | null>>([]);
  const [noReceiptDecisions, setNoReceiptDecisions] = useState<Record<string, "return" | "forgot">>({});
  const [noReceiptPrices, setNoReceiptPrices] = useState<Record<string, number>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isMobileReceiptExpanded, setIsMobileReceiptExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetAll = useCallback(() => {
    setPhase("form");
    setStoreName("");
    setTotalAmount("");
    setNote("");
    setScanResult(null);
    setLineStates([]);
    setLineMatches([]);
    setNoReceiptDecisions({});
    setNoReceiptPrices({});
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsZoomed(false);
    setIsMobileReceiptExpanded(false);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      setPhase("scanning");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("kitchenId", kitchenId);
      formData.append("stagedCartItems", JSON.stringify(stagedCartItems));

      startTransition(async () => {
        try {
          const result = await scanReceiptAction(formData);
          setScanResult(result);
          setStoreName((prev) => prev || result.storeName);
          setLineStates(
            result.lines.map((line: ReceiptLine) => ({
              checked: line.matched_cart_item_id !== null,
              price: line.price,
            }))
          );
          setLineMatches(result.lines.map((line: ReceiptLine) => line.matched_cart_item_id));
          setPhase("review");
        } catch (error: any) {
          setPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
          if (fileInputRef.current) fileInputRef.current.value = "";
          setScanResult(null);
          setLineStates([]);
          setLineMatches([]);
          toast.error(error.message || "Failed to scan receipt");
          setPhase("form");
        }
      });
    },
    [kitchenId, stagedCartItems]
  );

  const claimedAmount = useMemo(() => {
    return lineStates.reduce((sum, line, i) => {
      if (line.checked && scanResult) {
        return sum + line.price * (scanResult.lines[i]?.quantity || 1);
      }
      return sum;
    }, 0);
  }, [lineStates, scanResult]);

  const unresolvedItems = useMemo(() => {
    const matchedIds = new Set(
      lineMatches.filter((id, i) => id && lineStates[i]?.checked)
    );
    return stagedCartItems.filter((c) => !matchedIds.has(c.id));
  }, [lineMatches, lineStates, stagedCartItems]);

  // Unified across both tracks: no receipt at all = every item counts as unmatched.
  const itemsNeedingDecision = useMemo(() => {
    return scanResult ? unresolvedItems : stagedCartItems;
  }, [scanResult, unresolvedItems, stagedCartItems]);

  const handleToggleLine = useCallback((index: number) => {
    setLineStates((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], checked: !next[index].checked };
      return next;
    });
  }, []);

  const handlePriceChange = useCallback((index: number, value: string) => {
    const num = parseFloat(value);
    setLineStates((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], price: isNaN(num) ? 0 : num };
      return next;
    });
  }, []);

  const handleMatchChange = useCallback((index: number, cartItemId: string | null) => {
    setLineMatches((prev) => {
      const next = [...prev];
      next[index] = cartItemId;
      return next;
    });
    setLineStates((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], checked: cartItemId !== null };
      return next;
    });
  }, []);

  const handleNoReceiptDecision = useCallback((itemId: string, decision: "return" | "forgot") => {
    setNoReceiptDecisions((prev) => ({ ...prev, [itemId]: decision }));
  }, []);

  const handleNoReceiptPriceChange = useCallback((itemId: string, value: string) => {
    const num = parseFloat(value);
    setNoReceiptPrices((prev) => ({ ...prev, [itemId]: isNaN(num) ? 0 : num }));
  }, []);

  const handleContinueToDetails = () => {
    setTotalAmount(claimedAmount.toFixed(2));
    setPhase("form");
  };

  const handleDiscardReceipt = useCallback(() => {
    if (scanResult?.receiptPath) {
      startTransition(async () => {
        await deleteReceiptFileAction(scanResult.receiptPath);
      });
    }
    setPhase("form");
    setScanResult(null);
    setLineStates([]);
    setLineMatches([]);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsZoomed(false);
    setIsMobileReceiptExpanded(false);
  }, [scanResult]);

  const handleClose = useCallback(() => {
    if (scanResult?.receiptPath) {
      startTransition(async () => {
        await deleteReceiptFileAction(scanResult.receiptPath);
      });
    }
    resetAll();
    onOpenChange(false);
  }, [scanResult, resetAll, onOpenChange]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        handleClose();
      } else {
        onOpenChange(open);
      }
    },
    [handleClose, onOpenChange]
  );

  const attemptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (stagedCartItems.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }

    if (itemsNeedingDecision.length > 0) {
      setNoReceiptDecisions({});
      setNoReceiptPrices({});
      setPhase("confirm-unmatched");
      return;
    }

    finalizeCheckout();
  };

  const finalizeCheckout = () => {
    if (scanResult) {
      // Receipt was scanned & matched — submit as a refund request
      const matchedItems: Array<{ shopping_list_item_id: string; price: number; pantry_item_id: string | null }> = scanResult.lines
        .map((line, i) => {
          const matchedId = lineMatches[i];
          if (lineStates[i]?.checked && matchedId) {
            const cartItem = stagedCartItems.find((c) => c.id === matchedId);
            return {
              shopping_list_item_id: matchedId,
              price: lineStates[i].price,
              pantry_item_id: cartItem?.pantry_item_id || null,
            };
          }
          return null;
        })
        .filter((item): item is { shopping_list_item_id: string; price: number; pantry_item_id: string | null } => item !== null);

      // Items the user confirmed as "forgot receipt" — bought, just unproven
      let forgotTotal = 0;
      for (const item of itemsNeedingDecision) {
        if (noReceiptDecisions[item.id] === "forgot") {
          const price = noReceiptPrices[item.id] || 0;
          forgotTotal += price;
          matchedItems.push({
            shopping_list_item_id: item.id,
            price,
            pantry_item_id: item.pantry_item_id,
          });
        }
      }

      const formData = new FormData();
      formData.append("kitchenId", kitchenId);
      formData.append("receiptPath", scanResult.receiptPath);
      formData.append("storeName", storeName.trim());
      formData.append("note", note.trim());
      formData.append("totalReceiptAmount", scanResult.totalReceiptAmount.toString());
      formData.append("totalClaimedAmount", ((parseFloat(totalAmount) || 0) + forgotTotal).toString());
      formData.append("matchedItems", JSON.stringify(matchedItems));

      startTransition(async () => {
        try {
          await submitReceiptCheckoutAction(formData);
          const claimedNum = (parseFloat(totalAmount) || 0) + forgotTotal;
          toast.success(`Refund request of €${claimedNum.toFixed(2)} submitted to kitchen admin.`);
          router.refresh();
          resetAll();
          onOpenChange(false);
        } catch (error: any) {
          toast.error(error.message || "Failed to submit refund request");
        }
      });
    } else {
      // No receipt — only items explicitly confirmed as "Forgot Receipt" get checked out
      const confirmedItemIds = stagedCartItems
        .filter((item) => noReceiptDecisions[item.id] === "forgot")
        .map((item) => item.id);

      if (confirmedItemIds.length === 0) {
        toast.error("Nothing to check out — every item was returned to the cart.");
        setPhase("form");
        return;
      }

      const formData = new FormData();
      formData.append("kitchenId", kitchenId);
      formData.append("storeName", storeName.trim());
      formData.append("totalAmount", totalAmount ? parseFloat(totalAmount).toString() : "0");
      formData.append("note", note.trim());
      formData.append("itemIds", JSON.stringify(confirmedItemIds));

      startTransition(async () => {
        try {
          const result = await receiptlessCheckoutAction(formData);
          if (result.success) {
            const claimedNum = parseFloat(totalAmount) || 0;
            toast.success(
              claimedNum > 0
                ? `Checkout recorded! €${claimedNum.toFixed(2)} refund requested.`
                : "Items checked out and marked as purchased!"
            );
            router.refresh();
            resetAll();
            onOpenChange(false);
          }
        } catch (error: any) {
          toast.error(error.message || "Failed to complete checkout.");
        }
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "transition-all duration-200",
          phase === "review"
            ? "p-0 w-full sm:max-w-4xl h-[100dvh] sm:h-[88vh] max-h-[100dvh] sm:max-h-[90vh] flex flex-col overflow-hidden rounded-none sm:rounded-3xl border-0 sm:border bg-card shadow-2xl [&>button:last-child]:hidden"
            : "sm:max-w-md p-6 bg-card border border-border rounded-3xl"
        )}
      >
        {phase === "form" && (
          <>
            <DialogHeader className="space-y-1.5 text-left">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-accent-brand" />
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  Checkout
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Review your order, then complete checkout.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={attemptSubmit} className="space-y-4">
              <div className="space-y-2 p-3.5 rounded-2xl bg-muted/40 border border-border">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span>Items to Checkout</span>
                  <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                    {stagedCartItems.length} item{stagedCartItems.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                  {stagedCartItems.map((item) => (
                    <Badge key={item.id} variant="secondary" className="text-xs font-normal bg-card border-border text-foreground">
                      {item.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {itemsNeedingDecision.length > 0 && (
                <div className="p-2.5 rounded-xl bg-accent-ochre/10 border border-accent-ochre/30 text-[11px] text-accent-warning">
                  {itemsNeedingDecision.length} item{itemsNeedingDecision.length === 1 ? "" : "s"} not matched to a receipt ({itemsNeedingDecision.map((c) => c.name).join(", ")})
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />
              {scanResult ? (
                <div className="w-full flex items-center justify-between gap-2.5 p-3 rounded-2xl border border-border bg-muted/30">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-muted border border-border flex items-center justify-center text-accent-success shrink-0">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">Receipt attached</p>
                      <p className="text-[11px] text-muted-foreground">
                        Receipt total: €{scanResult.totalReceiptAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPhase("review")}
                      className="text-xs h-8 rounded-lg"
                    >
                      Edit Match
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={handleDiscardReceipt}
                      disabled={isPending}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg h-8 w-8"
                      title="Remove this receipt"
                      aria-label="Remove receipt"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-2.5 p-3 rounded-2xl border-2 border-dashed border-border hover:border-muted-foreground/50 hover:bg-muted/30 transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Upload receipt (optional)</p>
                    <p className="text-[11px] text-muted-foreground">Let AI extract items &amp; prices automatically</p>
                  </div>
                </button>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="checkout-store" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Store</span>
                </Label>
                <Input
                  id="checkout-store"
                  type="text"
                  placeholder="e.g. Corner Bakery, Weekly Market, Lidl"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="h-9 text-xs rounded-xl border-border bg-transparent"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="checkout-amount" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Total (€) *</span>
                </Label>
                <Input
                  id="checkout-amount"
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

              <div className="space-y-1.5">
                <Label htmlFor="checkout-note" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Note to Admin</span>
                </Label>
                <textarea
                  id="checkout-note"
                  rows={2}
                  placeholder="e.g. Used petty cash, paid cash at farm stand, bought bulk discount"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="flex min-h-[64px] w-full rounded-xl border border-border bg-transparent p-2.5 text-xs shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  disabled={isPending}
                />
              </div>

              <DialogFooter className="pt-2 border-t border-border flex flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={isPending} className="rounded-xl text-xs h-9 border-border">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending || stagedCartItems.length === 0} className="rounded-xl text-xs font-semibold h-9 px-4 gap-1.5 bg-primary text-primary-foreground shadow-sm">
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{scanResult ? "Submit Refund Request" : "Checkout"}</span>
                </Button>
              </DialogFooter>
            </form>
          </>
        )}

        {phase === "confirm-unmatched" && (
          <>
            <DialogHeader className="space-y-1.5 text-left">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-accent-warning" />
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  {scanResult ? "Some Items Have No Receipt Proof" : "You're Checking Out Without a Receipt"}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                {scanResult
                  ? "These items weren't matched to a line on your receipt. Choose what to do with each one."
                  : "You're about to check out without uploading a receipt. Choose what to do with each item below."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {itemsNeedingDecision.map((item) => {
                const decision = noReceiptDecisions[item.id];
                return (
                  <div key={item.id} className="p-3 rounded-2xl border border-border bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{item.name}</span>
                      {decision && (
                        <Badge
                          variant={decision === "forgot" ? "warm" : "secondary"}
                          className="text-[10px] shrink-0"
                        >
                          {decision === "forgot" ? "Marked as Bought" : "Returned to Cart"}
                        </Badge>
                      )}
                    </div>

                    {scanResult && decision === "forgot" && (
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={noReceiptPrices[item.id] ?? ""}
                          onChange={(e) => handleNoReceiptPriceChange(item.id, e.target.value)}
                          className="h-8 text-xs font-mono rounded-lg border-border bg-transparent flex-1"
                        />
                        <span className="text-xs text-muted-foreground">€</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={decision === "return" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleNoReceiptDecision(item.id, "return")}
                        className="flex-1 h-8 text-xs rounded-lg"
                      >
                        Return to Cart
                      </Button>
                      <Button
                        type="button"
                        variant={decision === "forgot" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleNoReceiptDecision(item.id, "forgot")}
                        className="flex-1 h-8 text-xs rounded-lg"
                      >
                        Forgot Receipt
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <DialogFooter className="pt-2 border-t border-border flex flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setPhase("form")} disabled={isPending} className="rounded-xl text-xs h-9 border-border">
                Back
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={finalizeCheckout}
                disabled={isPending || itemsNeedingDecision.some((item) => !noReceiptDecisions[item.id])}
                className="rounded-xl text-xs font-semibold h-9 px-4 gap-1.5 bg-primary text-primary-foreground shadow-sm"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Confirm &amp; Checkout</span>
              </Button>
            </DialogFooter>
          </>
        )}

        {phase === "scanning" && (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto" />
            <div>
              <p className="text-sm font-semibold text-foreground">Scanning receipt...</p>
            </div>
          </div>
        )}

        {phase === "review" && (
          <div className="flex flex-col h-full w-full overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0 z-10">
              <div className="flex items-center gap-2 min-w-0">
                <Receipt className="w-4 h-4 text-accent-brand shrink-0" />
                <span className="text-sm font-bold text-foreground truncate">Review &amp; Match Receipt</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="secondary" className="text-xs font-mono">
                  {scanResult?.totalReceiptAmount.toFixed(2)} €
                </Badge>
                <button type="button" onClick={handleClose} disabled={isPending} aria-label="Close dialog" className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
              <div className="hidden md:flex md:w-2/5 shrink-0 border-r border-border bg-muted/20 p-4 flex-col items-center justify-center relative overflow-hidden">
                <div className="relative rounded-2xl overflow-hidden border border-border bg-muted/30 h-full w-full flex items-center justify-center">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Receipt"
                      className={cn("transition-transform duration-200 max-h-[75vh] w-auto object-contain cursor-pointer", isZoomed ? "scale-150 cursor-zoom-out" : "cursor-zoom-in")}
                      onClick={() => setIsZoomed(!isZoomed)}
                    />
                  )}
                  <button type="button" onClick={() => setIsZoomed(!isZoomed)} className="absolute top-2 right-2 p-1.5 rounded-lg bg-card/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-foreground transition cursor-pointer" title={isZoomed ? "Zoom out" : "Zoom in"}>
                    {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="md:hidden border-b border-border bg-muted/30 shrink-0">
                <button type="button" onClick={() => setIsMobileReceiptExpanded(!isMobileReceiptExpanded)} className="w-full flex items-center justify-between p-3 text-xs font-medium text-foreground hover:bg-muted/50 transition cursor-pointer">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>Receipt Photo</span>
                    <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 text-muted-foreground">
                      {isMobileReceiptExpanded ? "Tap to collapse" : "Tap to view"}
                    </Badge>
                  </div>
                  {isMobileReceiptExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                </button>

                {isMobileReceiptExpanded && previewUrl && (
                  <div className="p-3 pt-0 flex flex-col items-center justify-center animate-in fade-in-50 duration-200">
                    <div className="relative rounded-xl overflow-hidden border border-border bg-muted/50 max-h-[35vh] w-full flex items-center justify-center">
                      <img
                        src={previewUrl}
                        alt="Receipt Preview"
                        className={cn("transition-transform duration-200 max-h-[35vh] w-auto object-contain cursor-pointer", isZoomed ? "scale-150" : "")}
                        onClick={() => setIsZoomed(!isZoomed)}
                      />
                      <button type="button" onClick={() => setIsZoomed(!isZoomed)} className="absolute top-2 right-2 p-1.5 rounded-lg bg-card/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-foreground cursor-pointer">
                        {isZoomed ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col min-h-0 min-w-0 md:w-3/5 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 touch-pan-y overscroll-contain">
                  <div className="flex items-center justify-between gap-2.5 flex-wrap p-2.5 rounded-2xl bg-muted/30 border border-border/70">
                    <div className="flex items-center gap-2 text-xs text-foreground font-medium">
                      <Store className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span>{scanResult?.storeName || "Unknown store"}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-muted-foreground">Receipt Total: </span>
                      <span className="text-xs font-bold font-mono text-foreground">{scanResult?.totalReceiptAmount.toFixed(2)} €</span>
                    </div>
                  </div>

                  {unresolvedItems.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-accent-ochre/10 border border-accent-ochre/30 text-[11px] text-accent-warning">
                      {unresolvedItems.length} item{unresolvedItems.length === 1 ? "" : "s"} not matched ({unresolvedItems.map((c) => c.name).join(", ")})
                    </div>
                  )}

                  <p className="text-[11px] text-muted-foreground font-medium">
                    Select the line items to claim for the household:
                  </p>

                  <div className="space-y-2">
                    {scanResult?.lines.map((line, i) => {
                      const state = lineStates[i];
                      if (!state) return null;
                      const matchedItem = stagedCartItems.find((c) => c.id === line.matched_cart_item_id);

                      return (
                        <div key={i} className={cn("flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl border transition-all text-xs sm:text-sm", state.checked ? "border-accent-sage/50 bg-accent-sage/5" : "border-border bg-card/60 opacity-60")}>
                          <button type="button" onClick={() => handleToggleLine(i)} className={cn("w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer", state.checked ? "bg-accent-success border-accent-success text-white" : "border-border hover:border-muted-foreground")}>
                            {state.checked && <Check className="w-3.5 h-3.5" />}
                          </button>

                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                              {line.quantity > 1 ? `${line.quantity}x ` : ""}{line.raw_name}
                            </p>
                            <select
                              value={lineMatches[i] ?? ""}
                              onChange={(e) => handleMatchChange(i, e.target.value || null)}
                              className="text-[11px] bg-transparent border border-border/70 rounded-lg px-1.5 py-0.5 text-foreground max-w-full"
                            >
                              <option value="">— Not matched —</option>
                              {stagedCartItems.map((item) => (
                                <option key={item.id} value={item.id}>
                                  Match to &quot;{item.name}&quot;
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Input
                              type="number"
                              step="0.01"
                              value={state.price === 0 ? "" : state.price}
                              onChange={(e) => handlePriceChange(i, e.target.value)}
                              className="w-18 sm:w-20 h-7 text-xs text-right font-mono bg-transparent border-border/70 rounded-lg"
                            />
                            <span className="text-xs text-muted-foreground">€</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="sticky bottom-0 left-0 right-0 p-3 sm:p-4 bg-card/95 backdrop-blur-md border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 z-10 shrink-0">
                  <div className="space-y-0.5">
                    <p className="text-xs sm:text-sm font-bold text-foreground">
                      Claimed for Kitchen: €{claimedAmount.toFixed(2)}
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground">
                      Total Receipt: €{scanResult?.totalReceiptAmount.toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button type="button" variant="outline" size="sm" onClick={handleDiscardReceipt} disabled={isPending} className="flex-1 sm:flex-none rounded-xl text-xs h-9 border-border">
                      <X className="w-3.5 h-3.5 mr-1" />
                      Discard Receipt
                    </Button>
                    <Button type="button" size="sm" onClick={handleContinueToDetails} disabled={isPending || claimedAmount === 0} className="flex-1 sm:flex-none rounded-xl text-xs font-semibold h-9 px-3.5 gap-1.5 bg-primary text-primary-foreground shadow-sm">
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span className="truncate">Continue</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
