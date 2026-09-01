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
  ImageIcon,
  ChevronDown,
  ChevronUp,
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
  const [note, setNote] = useState('');
  const [lineStates, setLineStates] = useState<Array<{ checked: boolean; price: number }>>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isMobileReceiptExpanded, setIsMobileReceiptExpanded] = useState(false);
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
    setNote('');
    setLineStates([]);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setIsZoomed(false);
    setIsMobileReceiptExpanded(false);
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
    formData.append('note', note.trim());
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
        setNote('');
        setLineStates([]);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setIsZoomed(false);
        setIsMobileReceiptExpanded(false);
        onOpenChange(false);
      } catch (error: any) {
        toast.error(error.message || 'Failed to submit refund request');
      }
    });
  }, [scanResult, lineStates, stagedCartItems, kitchenId, storeName, note, claimedAmount, previewUrl, router, onOpenChange]);

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
          "transition-all duration-200",
          phase === 'review'
            ? "p-0 w-full sm:max-w-4xl h-[100dvh] sm:h-[88vh] max-h-[100dvh] sm:max-h-[90vh] flex flex-col overflow-hidden rounded-none sm:rounded-3xl border-0 sm:border bg-card shadow-2xl [&>button:last-child]:hidden"
            : "sm:max-w-lg p-6 bg-card border border-border rounded-3xl"
        )}
      >
        {phase !== 'review' && (
          <DialogHeader>
            <DialogTitle>Scan Receipt</DialogTitle>
            <DialogDescription>
              Upload a photo of your receipt to automatically match items and calculate your refund.
            </DialogDescription>
          </DialogHeader>
        )}

        {/* Phase 1: Upload Dropzone */}
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
            <p className="text-xs text-muted-foreground mt-1">Drag &amp; drop or click to browse · JPG, PNG, HEIC</p>
          </div>
        )}

        {/* Phase 2: Scanning Loading State */}
        {phase === 'scanning' && (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto" />
            <div>
              <p className="text-sm font-semibold text-foreground">Scanning receipt...</p>
              <p className="text-xs text-muted-foreground mt-1">AI is extracting line items from your receipt</p>
            </div>
          </div>
        )}

        {/* Phase 3: Review Split Layout */}
        {phase === 'review' && (
          <div className="flex flex-col h-full w-full overflow-hidden">
            {/* Sticky Fixed Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0 z-10">
              <div className="flex items-center gap-2 min-w-0">
                <Receipt className="w-4 h-4 text-accent-brand shrink-0" />
                <span className="text-sm font-bold text-foreground truncate">Review &amp; Match Receipt</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="secondary" className="text-xs font-mono">
                  {scanResult?.totalReceiptAmount.toFixed(2)} €
                </Badge>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isPending}
                  aria-label="Close dialog"
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Main Content Body: Desktop Split View + Mobile Responsive Body */}
            <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
              {/* Desktop Left Column: High-Res Zoomable Receipt Preview */}
              <div className="hidden md:flex md:w-2/5 shrink-0 border-r border-border bg-muted/20 p-4 flex-col items-center justify-center relative overflow-hidden">
                <div className="relative rounded-2xl overflow-hidden border border-border bg-muted/30 h-full w-full flex items-center justify-center">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Receipt"
                      className={cn(
                        "transition-transform duration-200 max-h-[75vh] w-auto object-contain cursor-pointer",
                        isZoomed ? "scale-150 cursor-zoom-out" : "cursor-zoom-in"
                      )}
                      onClick={() => setIsZoomed(!isZoomed)}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setIsZoomed(!isZoomed)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-card/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-foreground transition cursor-pointer"
                    title={isZoomed ? "Zoom out" : "Zoom in"}
                  >
                    {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Mobile Collapsible Receipt Preview Accordion */}
              <div className="md:hidden border-b border-border bg-muted/30 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsMobileReceiptExpanded(!isMobileReceiptExpanded)}
                  className="w-full flex items-center justify-between p-3 text-xs font-medium text-foreground hover:bg-muted/50 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>Receipt Photo</span>
                    <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 text-muted-foreground">
                      {isMobileReceiptExpanded ? "Tap to collapse" : "Tap to view"}
                    </Badge>
                  </div>
                  {isMobileReceiptExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </button>

                {isMobileReceiptExpanded && previewUrl && (
                  <div className="p-3 pt-0 flex flex-col items-center justify-center animate-in fade-in-50 duration-200">
                    <div className="relative rounded-xl overflow-hidden border border-border bg-muted/50 max-h-[35vh] w-full flex items-center justify-center">
                      <img
                        src={previewUrl}
                        alt="Receipt Preview"
                        className={cn(
                          "transition-transform duration-200 max-h-[35vh] w-auto object-contain cursor-pointer",
                          isZoomed ? "scale-150" : ""
                        )}
                        onClick={() => setIsZoomed(!isZoomed)}
                      />
                      <button
                        type="button"
                        onClick={() => setIsZoomed(!isZoomed)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-card/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {isZoomed ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Scrollable Items & Inputs */}
              <div className="flex-1 flex flex-col min-h-0 min-w-0 md:w-3/5 overflow-hidden">
                {/* Scrollable List Body with Touch Support */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 touch-pan-y overscroll-contain">
                  {/* Store Name & Receipt Total Row */}
                  <div className="flex items-center justify-between gap-2.5 flex-wrap p-2.5 rounded-2xl bg-muted/30 border border-border/70">
                    <div className="flex items-center gap-2 flex-1 min-w-[160px]">
                      <Store className="w-4 h-4 text-muted-foreground shrink-0" />
                      <Input
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        className="h-8 text-xs font-semibold bg-transparent border-border/70 rounded-lg max-w-[200px]"
                        placeholder="Store name"
                      />
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-muted-foreground">Receipt Total: </span>
                      <span className="text-xs font-bold font-mono text-foreground">{scanResult?.totalReceiptAmount.toFixed(2)} €</span>
                    </div>
                  </div>

                  {/* Header Hint */}
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Select the line items to claim for the kitchen household:
                  </p>

                  {/* Line Items List */}
                  <div className="space-y-2">
                    {scanResult?.lines.map((line, i) => {
                      const state = lineStates[i];
                      if (!state) return null;
                      const matchedItem = stagedCartItems.find((c) => c.id === line.matched_cart_item_id);

                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl border transition-all text-xs sm:text-sm",
                            state.checked
                              ? "border-accent-sage/50 bg-accent-sage/5"
                              : "border-border bg-card/60 opacity-60"
                          )}
                        >
                          {/* Large Touch-Friendly Checkbox */}
                          <button
                            type="button"
                            onClick={() => handleToggleLine(i)}
                            className={cn(
                              "w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer",
                              state.checked
                                ? "bg-accent-success border-accent-success text-white"
                                : "border-border hover:border-muted-foreground"
                            )}
                          >
                            {state.checked && <Check className="w-3.5 h-3.5" />}
                          </button>

                          {/* Line Name & Matched Cart Item Indicator */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                              {line.quantity > 1 ? `${line.quantity}x ` : ''}{line.raw_name}
                            </p>
                            {matchedItem && (
                              <p className="text-[11px] text-accent-success flex items-center gap-1 mt-0.5 font-medium">
                                <ArrowRight className="w-3 h-3 shrink-0" />
                                <span>Resolves "{matchedItem.name}"</span>
                              </p>
                            )}
                          </div>

                          {/* Price Input */}
                          <div className="flex items-center gap-1 shrink-0">
                            <Input
                              type="number"
                              step="0.01"
                              value={state.price === 0 ? '' : state.price}
                              onChange={(e) => handlePriceChange(i, e.target.value)}
                              className="w-18 sm:w-20 h-7 text-xs text-right font-mono bg-transparent border-border/70 rounded-lg"
                            />
                            <span className="text-xs text-muted-foreground">€</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Optional Note to Admin */}
                  <div className="space-y-1.5 pt-1">
                    <textarea
                      placeholder="Add a note for the household admin (e.g., 'Weekly grocery split, paid with joint card')..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      className="w-full min-h-[72px] resize-none rounded-xl border border-border bg-muted/30 p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary transition"
                    />
                  </div>
                </div>

                {/* Sticky Bottom Action Bar */}
                <div className="sticky bottom-0 left-0 right-0 p-3 sm:p-4 bg-card/95 backdrop-blur-md border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 z-10 shrink-0">
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between sm:justify-start gap-2">
                      <p className="text-xs sm:text-sm font-bold text-foreground">
                        Claimed for Kitchen: €{claimedAmount.toFixed(2)}
                      </p>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground">
                      Total Receipt: €{scanResult?.totalReceiptAmount.toFixed(2)} · Private: €{Math.max(0, (scanResult?.totalReceiptAmount || 0) - claimedAmount).toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                      disabled={isPending}
                      className="flex-1 sm:flex-none rounded-xl text-xs h-9 border-border"
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSubmit}
                      disabled={isPending || claimedAmount === 0}
                      className="flex-1 sm:flex-none rounded-xl text-xs font-semibold h-9 px-3.5 gap-1.5 bg-primary text-primary-foreground shadow-sm"
                    >
                      {isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Receipt className="w-3.5 h-3.5" />
                      )}
                      <span className="truncate">Confirm &amp; Submit Refund Request</span>
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

