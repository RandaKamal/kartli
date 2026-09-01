"use client";

import { useState, useTransition, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { scanReceiptAction, submitReceiptCheckoutAction, deleteReceiptFileAction } from "@/app/actions/scan-receipt";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

interface ReceiptReviewModalProps {
  kitchenId: string;
  stagedCartItems: StagedCartItem[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptReviewModal({
  kitchenId,
  stagedCartItems,
  isOpen,
  onOpenChange,
}: ReceiptReviewModalProps) {
  const [phase, setPhase] = useState<'upload' | 'scanning' | 'review'>('upload');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [storeName, setStoreName] = useState('');
  const [lineStates, setLineStates] = useState<Array<{ checked: boolean; price: number }>>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setPhase('scanning');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('kitchenId', kitchenId);
    formData.append('stagedCartItems', JSON.stringify(stagedCartItems));

    startTransition(async () => {
      try {
        const result = await scanReceiptAction(formData);
        setScanResult(result);
        setStoreName(result.storeName);
        setLineStates(
          result.lines.map((line: ReceiptLine) => ({
            checked: line.matched_cart_item_id !== null,
            price: line.price,
          }))
        );
        setPhase('review');
      } catch (error: any) {
        toast.error(error.message || 'Failed to scan receipt');
        setPhase('upload');
      }
    });
  }, [kitchenId, stagedCartItems]);

  const claimedAmount = useMemo(() => {
    return lineStates.reduce((sum, line, i) => {
      if (line.checked && scanResult) {
        return sum + line.price * (scanResult.lines[i]?.quantity || 1);
      }
      return sum;
    }, 0);
  }, [lineStates, scanResult]);

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

  const handleCancel = useCallback(async () => {
    if (scanResult?.receiptPath) {
      startTransition(async () => {
        await deleteReceiptFileAction(scanResult.receiptPath);
      });
    }
    setPhase('upload');
    setScanResult(null);
    setStoreName('');
    setLineStates([]);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setIsZoomed(false);
    onOpenChange(false);
  }, [scanResult, previewUrl, onOpenChange]);

  const handleSubmit = useCallback(() => {
    if (!scanResult) return;

    const matchedItems = scanResult.lines
      .map((line, i) => {
        if (lineStates[i]?.checked && line.matched_cart_item_id) {
          const cartItem = stagedCartItems.find((c) => c.id === line.matched_cart_item_id);
          return {
            shopping_list_item_id: line.matched_cart_item_id,
            price: lineStates[i].price,
            pantry_item_id: cartItem?.pantry_item_id || null,
          };
        }
        return null;
      })
      .filter(Boolean);

    const formData = new FormData();
    formData.append('kitchenId', kitchenId);
    formData.append('receiptPath', scanResult.receiptPath);
    formData.append('storeName', storeName);
    formData.append('totalReceiptAmount', scanResult.totalReceiptAmount.toString());
    formData.append('totalClaimedAmount', claimedAmount.toString());
    formData.append('matchedItems', JSON.stringify(matchedItems));

    startTransition(async () => {
      try {
        await submitReceiptCheckoutAction(formData);
        toast.success(`Refund request of €${claimedAmount.toFixed(2)} submitted to kitchen admin.`);
        router.refresh();
        setPhase('upload');
        setScanResult(null);
        setStoreName('');
        setLineStates([]);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setIsZoomed(false);
        onOpenChange(false);
      } catch (error: any) {
        toast.error(error.message || 'Failed to submit refund request');
      }
    });
  }, [scanResult, lineStates, stagedCartItems, kitchenId, storeName, claimedAmount, previewUrl, router, onOpenChange]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        handleCancel();
      } else {
        onOpenChange(open);
      }
    },
    [handleCancel, onOpenChange]
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "transition-all duration-300",
          phase === 'review' ? "sm:max-w-4xl max-h-[90vh]" : "sm:max-w-lg"
        )}
      >
        <DialogHeader className={phase === 'review' ? 'hidden' : ''}>
          <DialogTitle>Scan Receipt</DialogTitle>
          <DialogDescription>
            Upload a photo of your receipt to automatically match items and calculate your refund.
          </DialogDescription>
        </DialogHeader>

        {phase === 'upload' && (
          <div
            className="border-2 border-dashed border-border rounded-2xl p-8 sm:p-12 text-center cursor-pointer hover:border-muted-foreground/50 hover:bg-muted/30 transition-all mt-4"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFileSelect(f);
            }}
          >
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
            <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center mx-auto text-muted-foreground mb-4">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">Upload receipt photo</p>
            <p className="text-xs text-muted-foreground mt-1">Drag & drop or click to browse · JPG, PNG, HEIC</p>
          </div>
        )}

        {phase === 'scanning' && (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto" />
            <div>
              <p className="text-sm font-semibold text-foreground">Scanning receipt...</p>
              <p className="text-xs text-muted-foreground mt-1">AI is extracting line items from your receipt</p>
            </div>
          </div>
        )}

        {phase === 'review' && (
          <div className="flex flex-col lg:flex-row gap-4 mt-2 h-full">
            <div className="lg:w-2/5 shrink-0">
              <div className="relative rounded-2xl overflow-hidden border border-border bg-muted/30 h-full max-h-[80vh] flex items-center justify-center">
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Receipt"
                    className={cn(
                      "transition-transform duration-200 max-h-full w-auto object-contain",
                      isZoomed ? "scale-150 cursor-zoom-out" : "cursor-zoom-in"
                    )}
                    onClick={() => setIsZoomed(!isZoomed)}
                  />
                )}
                <button
                  onClick={() => setIsZoomed(!isZoomed)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-card/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-foreground transition"
                >
                  {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="lg:w-3/5 flex flex-col gap-4 min-h-0">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Store className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Input
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="h-8 text-sm font-semibold bg-transparent border-border/50 rounded-lg max-w-[180px]"
                    placeholder="Store name"
                  />
                </div>
                <Badge variant="secondary" className="text-xs font-mono shrink-0">
                  Receipt: {scanResult?.totalReceiptAmount.toFixed(2)} €
                </Badge>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[45vh] lg:max-h-[60vh]">
                {scanResult?.lines.map((line, i) => {
                  const state = lineStates[i];
                  if (!state) return null;
                  const matchedItem = stagedCartItems.find((c) => c.id === line.matched_cart_item_id);

                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-xl border transition-all text-sm",
                        state.checked
                          ? "border-accent-sage/40 bg-accent-sage/5"
                          : "border-border bg-card opacity-60"
                      )}
                    >
                      <button
                        onClick={() => handleToggleLine(i)}
                        className={cn(
                          "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                          state.checked
                            ? "bg-accent-success border-accent-success text-white"
                            : "border-border hover:border-muted-foreground"
                        )}
                      >
                        {state.checked && <Check className="w-3 h-3" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {line.quantity > 1 ? `${line.quantity}x ` : ''}{line.raw_name}
                        </p>
                        {matchedItem && (
                          <p className="text-[11px] text-accent-success flex items-center gap-1 mt-0.5">
                            <ArrowRight className="w-3 h-3" />
                            Resolves "{matchedItem.name}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Input
                          type="number"
                          step="0.01"
                          value={state.price === 0 ? '' : state.price}
                          onChange={(e) => handlePriceChange(i, e.target.value)}
                          className="w-20 h-7 text-xs text-right font-mono bg-transparent border-border/50 rounded-lg"
                        />
                        <span className="text-xs text-muted-foreground">€</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border pt-3 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      Claimed for Kitchen: {claimedAmount.toFixed(2)} €
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Total Receipt: {scanResult?.totalReceiptAmount.toFixed(2)} € · Private: {((scanResult?.totalReceiptAmount || 0) - claimedAmount).toFixed(2)} €
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isPending}
                    className="rounded-xl text-xs h-9 border-border"
                  >
                    <X className="w-3.5 h-3.5 mr-1.5" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={isPending || claimedAmount === 0}
                    className="rounded-xl text-xs h-9 gap-1.5 bg-primary text-primary-foreground shadow-sm"
                  >
                    {isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Receipt className="w-3.5 h-3.5" />
                    )}
                    Confirm & Submit Refund Request
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
