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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Receipt,
  Loader2,
  Check,
  X,
  ZoomIn,
  ZoomOut,
  ArrowRight,
  ImageIcon,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import type { ReceiptLine } from "@/types";

interface ScannedReceipt {
  id: string;
  status: "scanning" | "ready" | "error";
  receiptUrl: string | null;
  storeName: string;
  currency: string;
  totalReceiptAmount: number;
  lines: ReceiptLine[];
  lineStates: Array<{ checked: boolean; price: number }>;
  lineMatches: Array<string | null>;
  previewUrl: string | null;
  compressedFile?: File;
  errorMessage?: string;
}

interface StagedCartItem {
  id: string;
  name: string;
  pantry_item_id: string | null;
}

const MAX_IMAGE_DIMENSION = 1280;
const JPEG_QUALITY = 0.75;

/**
 * Resize and re-encode a receipt photo in the browser before upload.
 * Preserves crisp text while shrinking cellular payloads to ~150KB.
 */
async function compressReceiptImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );

    if (!blob || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "receipt";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn("Receipt image compression failed, using original file:", error);
    return file;
  }
}

/**
 * Calculates matched item total and overall receipt total across all ready receipts.
 */
function computeReceiptsTotals(receiptsList: ScannedReceipt[]) {
  const ready = receiptsList.filter((r) => r.status === "ready");
  let matchedTotal = 0;
  let totalReceiptAmount = 0;

  for (const receipt of ready) {
    totalReceiptAmount += receipt.totalReceiptAmount || 0;
    for (let i = 0; i < receipt.lines.length; i++) {
      const state = receipt.lineStates[i];
      if (state?.checked) {
        // state.price represents the authoritative line total for this item
        matchedTotal += state.price || 0;
      }
    }
  }

  return { matchedTotal, totalReceiptAmount, readyCount: ready.length };
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
  const { t, locale } = useTranslation();
  const [phase, setPhase] = useState<"form" | "review" | "confirm-unmatched">("form");
  const [storeName, setStoreName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [isTotalManuallyOverridden, setIsTotalManuallyOverridden] = useState(false);
  const [note, setNote] = useState("");
  const [receipts, setReceipts] = useState<ScannedReceipt[]>([]);
  const [reviewingIndex, setReviewingIndex] = useState<number | null>(null);
  const [noReceiptDecisions, setNoReceiptDecisions] = useState<Record<string, "return" | "forgot">>({});
  const [noReceiptPrices, setNoReceiptPrices] = useState<Record<string, number>>({});
  const [isZoomed, setIsZoomed] = useState(false);
  const [isMobileReceiptExpanded, setIsMobileReceiptExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetAll = useCallback(() => {
    setPhase("form");
    setStoreName("");
    setTotalAmount("");
    setIsTotalManuallyOverridden(false);
    setNote("");
    setReceipts((prev) => {
      prev.forEach((r) => {
        if (r.previewUrl) URL.revokeObjectURL(r.previewUrl);
      });
      return [];
    });
    setReviewingIndex(null);
    setNoReceiptDecisions({});
    setNoReceiptPrices({});
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsZoomed(false);
    setIsMobileReceiptExpanded(false);
  }, []);

  useEffect(() => {
    return () => {
      receipts.forEach((r) => {
        if (r.previewUrl) URL.revokeObjectURL(r.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Keep totalAmount synchronized with receipts unless manually overridden by the user.
   */
  useEffect(() => {
    if (isTotalManuallyOverridden) return;
    const ready = receipts.filter((r) => r.status === "ready");
    if (ready.length === 0) {
      if (receipts.length === 0) {
        setTotalAmount("");
        setIsTotalManuallyOverridden(false);
      }
      return;
    }

    const { matchedTotal, totalReceiptAmount: recTotal } = computeReceiptsTotals(receipts);
    if (matchedTotal > 0) {
      setTotalAmount(matchedTotal.toFixed(2));
    } else if (recTotal > 0) {
      setTotalAmount(recTotal.toFixed(2));
    }
  }, [receipts, isTotalManuallyOverridden]);

  const executeScan = useCallback(
    async (receiptId: string, uploadFile: File) => {
      try {
        const formData = new FormData();
        formData.append("file", uploadFile);
        formData.append("kitchenId", kitchenId);
        formData.append("stagedCartItems", JSON.stringify(stagedCartItems));

        const res = await scanReceiptAction(formData);

        if (!res.ok) {
          toast.error(res.error);
          setReceipts((prev) =>
            prev.map((r) =>
              r.id === receiptId
                ? {
                    ...r,
                    status: "error",
                    errorMessage: res.error,
                    compressedFile: uploadFile,
                  }
                : r
            )
          );
          return;
        }

        const result = res.data;
        // Auto-fill store if currently empty
        setStoreName((prev) => (prev.trim() ? prev : result.storeName || ""));

        setReceipts((prev) => {
          const next = prev.map((r) => {
            if (r.id !== receiptId) return r;
            return {
              ...r,
              status: "ready" as const,
              receiptUrl: result.receiptUrl,
              storeName: result.storeName,
              currency: result.currency,
              totalReceiptAmount: result.totalReceiptAmount,
              lines: result.lines,
              lineStates: result.lines.map((line: ReceiptLine) => ({
                checked: line.matched_cart_item_id !== null,
                price: line.line_total ?? line.lineTotal ?? line.price,
              })),
              lineMatches: result.lines.map((line: ReceiptLine) => line.matched_cart_item_id),
              errorMessage: undefined,
            };
          });

          // Auto-calculate and populate total immediately upon scan completion
          if (!isTotalManuallyOverridden) {
            const { matchedTotal, totalReceiptAmount: recTotal } = computeReceiptsTotals(next);
            if (matchedTotal > 0) {
              setTotalAmount(matchedTotal.toFixed(2));
            } else if (recTotal > 0) {
              setTotalAmount(recTotal.toFixed(2));
            }
          }

          return next;
        });
      } catch (error: any) {
        toast.error(error.message || "Failed to scan receipt");
        setReceipts((prev) =>
          prev.map((r) =>
            r.id === receiptId
              ? {
                  ...r,
                  status: "error",
                  errorMessage: error.message || "Failed to scan receipt",
                  compressedFile: uploadFile,
                }
              : r
          )
        );
      }
    },
    [kitchenId, stagedCartItems, isTotalManuallyOverridden]
  );

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error(locale === "de" ? "Bitte eine Bilddatei auswählen" : "Please select an image file");
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      const tempId = `receipt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const newReceipt: ScannedReceipt = {
        id: tempId,
        status: "scanning",
        receiptUrl: null,
        storeName: locale === "de" ? "Beleg wird gescannt..." : "Scanning receipt...",
        currency: "EUR",
        totalReceiptAmount: 0,
        lines: [],
        lineStates: [],
        lineMatches: [],
        previewUrl,
      };

      setReceipts((prev) => [...prev, newReceipt]);

      startTransition(async () => {
        let uploadFile: File = file;
        try {
          uploadFile = await compressReceiptImage(file);
        } catch {
          uploadFile = file;
        }

        setReceipts((prev) =>
          prev.map((r) => (r.id === tempId ? { ...r, compressedFile: uploadFile } : r))
        );

        await executeScan(tempId, uploadFile);
      });
    },
    [executeScan, locale]
  );

  const handleRetryScan = useCallback(
    (index: number) => {
      const receipt = receipts[index];
      if (!receipt || !receipt.compressedFile) return;

      const fileToRetry = receipt.compressedFile;
      const receiptId = receipt.id;

      setReceipts((prev) =>
        prev.map((r, i) =>
          i === index
            ? { ...r, status: "scanning", errorMessage: undefined }
            : r
        )
      );

      startTransition(async () => {
        await executeScan(receiptId, fileToRetry);
      });
    },
    [receipts, executeScan]
  );

  const claimedAmount = useMemo(() => {
    return receipts.reduce((total, receipt) => {
      if (receipt.status !== "ready") return total;
      return (
        total +
        receipt.lineStates.reduce((sum, line) => {
          if (line.checked) return sum + (line.price || 0);
          return sum;
        }, 0)
      );
    }, 0);
  }, [receipts]);

  const totalReceiptAmount = useMemo(() => {
    return receipts.reduce((sum, r) => (r.status === "ready" ? sum + (r.totalReceiptAmount || 0) : sum), 0);
  }, [receipts]);

  const matchedCartItemIds = useMemo(() => {
    const seen = new Set<string>();
    for (const receipt of receipts) {
      if (receipt.status !== "ready") continue;
      receipt.lineMatches.forEach((id, i) => {
        if (id && receipt.lineStates[i]?.checked && !seen.has(id)) {
          seen.add(id);
        }
      });
    }
    return seen;
  }, [receipts]);

  const unresolvedItems = useMemo(() => {
    return stagedCartItems.filter((c) => !matchedCartItemIds.has(c.id));
  }, [stagedCartItems, matchedCartItemIds]);

  const readyReceiptCount = useMemo(() => {
    return receipts.filter((r) => r.status === "ready").length;
  }, [receipts]);

  const isAnyReceiptScanning = useMemo(() => {
    return receipts.some((r) => r.status === "scanning");
  }, [receipts]);

  const itemsNeedingDecision = useMemo(() => {
    return readyReceiptCount > 0 ? unresolvedItems : stagedCartItems;
  }, [readyReceiptCount, unresolvedItems, stagedCartItems]);

  const parsedTotal = parseFloat(totalAmount);
  const isTotalInvalid = !totalAmount || isNaN(parsedTotal) || parsedTotal <= 0;

  const handleToggleLine = useCallback((receiptIdx: number, lineIdx: number) => {
    setReceipts((prev) => {
      const next = [...prev];
      const receipt = { ...next[receiptIdx] };
      const lineStates = [...receipt.lineStates];
      lineStates[lineIdx] = { ...lineStates[lineIdx], checked: !lineStates[lineIdx].checked };
      receipt.lineStates = lineStates;
      next[receiptIdx] = receipt;
      return next;
    });
  }, []);

  const handlePriceChange = useCallback((receiptIdx: number, lineIdx: number, value: string) => {
    const num = parseFloat(value);
    setReceipts((prev) => {
      const next = [...prev];
      const receipt = { ...next[receiptIdx] };
      const lineStates = [...receipt.lineStates];
      lineStates[lineIdx] = { ...lineStates[lineIdx], price: isNaN(num) ? 0 : num };
      receipt.lineStates = lineStates;
      next[receiptIdx] = receipt;
      return next;
    });
  }, []);

  const handleMatchChange = useCallback((receiptIdx: number, lineIdx: number, cartItemId: string | null) => {
    setReceipts((prev) => {
      const next = [...prev];
      const receipt = { ...next[receiptIdx] };
      const lineMatches = [...receipt.lineMatches];
      lineMatches[lineIdx] = cartItemId;
      const lineStates = [...receipt.lineStates];
      lineStates[lineIdx] = { ...lineStates[lineIdx], checked: cartItemId !== null };
      receipt.lineMatches = lineMatches;
      receipt.lineStates = lineStates;
      next[receiptIdx] = receipt;
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
    setIsTotalManuallyOverridden(false);
    const { matchedTotal, totalReceiptAmount: recTotal } = computeReceiptsTotals(receipts);
    if (matchedTotal > 0) {
      setTotalAmount(matchedTotal.toFixed(2));
    } else if (recTotal > 0) {
      setTotalAmount(recTotal.toFixed(2));
    }
    setReviewingIndex(null);
    setPhase("form");
  };

  const handleRemoveReceipt = useCallback(
    (index: number) => {
      const receipt = receipts[index];
      if (!receipt) return;

      const receiptUrl = receipt.receiptUrl;
      startTransition(async () => {
        if (receiptUrl) {
          await deleteReceiptFileAction(receiptUrl);
        }
      });

      if (receipt.previewUrl) URL.revokeObjectURL(receipt.previewUrl);

      setReceipts((prev) => {
        const next = prev.filter((_, i) => i !== index);
        if (next.length === 0) {
          setTotalAmount("");
          setIsTotalManuallyOverridden(false);
        } else if (!isTotalManuallyOverridden) {
          const { matchedTotal, totalReceiptAmount: recTotal } = computeReceiptsTotals(next);
          if (matchedTotal > 0) {
            setTotalAmount(matchedTotal.toFixed(2));
          } else if (recTotal > 0) {
            setTotalAmount(recTotal.toFixed(2));
          } else {
            setTotalAmount("");
          }
        }
        return next;
      });
      setReviewingIndex(null);
      setPhase("form");
      toast.success(
        locale === "de"
          ? "Beleg entfernt."
          : "Receipt removed. Any matched items are unmatched again."
      );
    },
    [receipts, isTotalManuallyOverridden, locale]
  );

  const handleClose = useCallback(() => {
    receipts.forEach((r) => {
      const url = r.receiptUrl;
      if (!url) return;
      startTransition(async () => {
        await deleteReceiptFileAction(url);
      });
    });
    resetAll();
    onOpenChange(false);
  }, [receipts, resetAll, onOpenChange]);

  const handleSaveDraft = useCallback(() => {
    onOpenChange(false);
    toast.success(
      locale === "de"
        ? "Entwurf gespeichert — Checkout später fortsetzen."
        : "Draft saved — reopen Checkout to continue where you left off."
    );
  }, [onOpenChange, locale]);

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
      toast.error(locale === "de" ? "Warenkorb ist leer." : "Your cart is empty.");
      return;
    }

    if (isTotalInvalid) {
      toast.error(
        locale === "de"
          ? "Bitte einen Betrag größer als 0,00 € angeben."
          : "Please enter an amount greater than €0.00."
      );
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
    const readyReceipts = receipts.filter((r) => r.status === "ready");
    if (readyReceipts.length > 0) {
      const matchedItems: Array<{ shopping_list_item_id: string; price: number; pantry_item_id: string | null }> = [];
      const seen = new Set<string>();

      for (const receipt of readyReceipts) {
        receipt.lineMatches.forEach((matchedId, i) => {
          if (matchedId && receipt.lineStates[i]?.checked && !seen.has(matchedId)) {
            seen.add(matchedId);
            const cartItem = stagedCartItems.find((c) => c.id === matchedId);
            matchedItems.push({
              shopping_list_item_id: matchedId,
              price: receipt.lineStates[i].price,
              pantry_item_id: cartItem?.pantry_item_id || null,
            });
          }
        });
      }

      let forgotTotal = 0;
      for (const item of itemsNeedingDecision) {
        if (noReceiptDecisions[item.id] === "forgot" && !seen.has(item.id)) {
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
      formData.append("currency", readyReceipts[0]?.currency || "EUR");
      formData.append(
        "receiptPaths",
        JSON.stringify(
          readyReceipts
            .map((r) => r.receiptUrl)
            .filter((url): url is string => Boolean(url))
        )
      );
      formData.append("storeName", storeName.trim());
      formData.append("note", note.trim());
      formData.append("totalReceiptAmount", totalReceiptAmount.toString());
      formData.append("totalClaimedAmount", ((parseFloat(totalAmount) || 0) + forgotTotal).toString());
      formData.append("matchedItems", JSON.stringify(matchedItems));

      startTransition(async () => {
        try {
          await submitReceiptCheckoutAction(formData);
          const claimedNum = (parseFloat(totalAmount) || 0) + forgotTotal;
          toast.success(
            locale === "de"
              ? `Auslage über ${claimedNum.toFixed(2).replace(".", ",")} € an Admin eingereicht.`
              : `Refund request of €${claimedNum.toFixed(2)} submitted to kitchen admin.`
          );
          router.refresh();
          resetAll();
          onOpenChange(false);
        } catch (error: any) {
          toast.error(error.message || "Failed to submit refund request");
        }
      });
    } else {
      const confirmedItemIds = stagedCartItems
        .filter((item) => noReceiptDecisions[item.id] === "forgot")
        .map((item) => item.id);

      if (confirmedItemIds.length === 0) {
        toast.error(
          locale === "de"
            ? "Nichts einzureichen — alle Artikel wurden zurück in den Warenkorb gelegt."
            : "Nothing to check out — every item was returned to the cart."
        );
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
                ? locale === "de"
                  ? `Auslage über ${claimedNum.toFixed(2).replace(".", ",")} € erfasst!`
                  : `Checkout recorded! €${claimedNum.toFixed(2)} refund requested.`
                : locale === "de"
                ? "Artikel als gekauft markiert!"
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

  const current = reviewingIndex !== null ? receipts[reviewingIndex] : null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        onDismiss={() => handleOpenChange(false)}
        className={cn(
          "transition-all duration-200 bg-card border border-white/[0.08] shadow-2xl",
          phase === "review"
            ? "p-0 w-full sm:max-w-4xl h-[100dvh] sm:h-[88vh] max-h-[100dvh] sm:max-h-[90vh] flex flex-col overflow-hidden rounded-none sm:rounded-2xl border-0 sm:border [&>button:last-child]:hidden"
            : "sm:max-w-md p-5 sm:p-6 rounded-2xl"
        )}
      >
        {phase === "form" && (
          <div className="flex flex-col">
            <DialogHeader className="px-5 py-4 border-b border-white/[0.06] -mx-5 sm:-mx-6 -mt-5 sm:-mt-6 mb-4 pr-12 text-left">
              <DialogTitle className="text-base font-semibold text-zinc-100 tracking-tight">
                {locale === "de" ? "Auslage einreichen" : "Checkout"}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {locale === "de" ? "Auslage einreichen und Beleg zuordnen" : "Submit purchase and match receipts"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={attemptSubmit} className="space-y-4">
              {/* Compact single-line header with subtle chips */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-300">
                    {locale === "de" ? `Artikel (${stagedCartItems.length})` : `Items (${stagedCartItems.length})`}
                  </span>
                  {readyReceiptCount > 0 && itemsNeedingDecision.length > 0 && (
                    <span className="text-[11px] text-zinc-500 font-normal">
                      {itemsNeedingDecision.length} {locale === "de" ? "ohne Beleg" : "unmatched"}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto scrollbar-thin">
                  {stagedCartItems.map((item) => {
                    const isMatched = readyReceiptCount > 0 && matchedCartItemIds.has(item.id);
                    return (
                      <span
                        key={item.id}
                        className={cn(
                          "inline-flex items-center text-xs px-2.5 py-1 rounded-md border font-normal transition-colors",
                          isMatched
                            ? "bg-zinc-800/80 border-white/[0.08] text-zinc-200"
                            : readyReceiptCount > 0
                            ? "bg-zinc-900/40 border-white/[0.05] text-zinc-400"
                            : "bg-zinc-900/60 border-white/[0.07] text-zinc-300"
                        )}
                      >
                        {item.name}
                      </span>
                    );
                  })}
                </div>
              </div>

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

              {/* Scanned Receipts Feed */}
              {receipts.length > 0 && (
                <div className="space-y-2">
                  {receipts.map((r, i) => {
                    if (r.status === "scanning") {
                      return (
                        <div
                          key={r.id}
                          className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-white/[0.08] bg-zinc-900/40"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {r.previewUrl ? (
                              <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/[0.08] bg-zinc-950 shrink-0">
                                <img
                                  src={r.previewUrl}
                                  alt="Receipt"
                                  className="w-full h-full object-cover opacity-70"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-zinc-800/60 border border-white/[0.08] flex items-center justify-center text-zinc-400 shrink-0">
                                <Loader2 className="w-4 h-4 animate-spin" />
                              </div>
                            )}
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <Loader2 className="w-3 h-3 animate-spin text-zinc-400 shrink-0" />
                                <p className="text-xs font-medium text-zinc-200 truncate">
                                  {locale === "de" ? "Beleg wird gescannt..." : "Scanning receipt..."}
                                </p>
                              </div>
                              <p className="text-[11px] text-zinc-500 truncate">
                                {locale === "de"
                                  ? "Geschäft, Positionen & Preise werden erkannt"
                                  : "Extracting store, items & prices"}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleRemoveReceipt(i)}
                            disabled={isPending}
                            className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg h-8 w-8 shrink-0"
                            title={locale === "de" ? "Scan abbrechen" : "Cancel scan"}
                            aria-label={locale === "de" ? "Scan abbrechen" : "Cancel scan"}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      );
                    }

                    if (r.status === "error") {
                      return (
                        <div
                          key={r.id}
                          className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-red-500/20 bg-red-500/5"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {r.previewUrl ? (
                              <div className="w-10 h-10 rounded-lg overflow-hidden border border-red-500/20 bg-zinc-950 shrink-0">
                                <img
                                  src={r.previewUrl}
                                  alt="Receipt"
                                  className="w-full h-full object-cover opacity-60"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                                <AlertTriangle className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0 space-y-0.5">
                              <p className="text-xs font-medium text-red-400 truncate">
                                {locale === "de" ? "Scan fehlgeschlagen" : "Scan Failed"}
                              </p>
                              <p className="text-[11px] text-zinc-400 truncate" title={r.errorMessage}>
                                {r.errorMessage ||
                                  (locale === "de" ? "Tippe auf Wiederholen" : "Tap retry to scan again")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {r.compressedFile && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRetryScan(i)}
                                disabled={isPending}
                                className="text-xs h-7 px-2.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/[0.08]"
                              >
                                {locale === "de" ? "Wiederholen" : "Retry"}
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleRemoveReceipt(i)}
                              disabled={isPending}
                              className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg h-8 w-8"
                              title={locale === "de" ? "Verwerfen" : "Discard"}
                              aria-label={locale === "de" ? "Verwerfen" : "Discard"}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    }

                    // status === "ready"
                    return (
                      <div
                        key={r.id || r.receiptUrl || `receipt-${i}`}
                        className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-white/[0.07] bg-zinc-900/50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {r.previewUrl ? (
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/[0.08] bg-zinc-950 shrink-0">
                              <img
                                src={r.previewUrl}
                                alt="Receipt"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-zinc-800/60 border border-white/[0.08] flex items-center justify-center text-zinc-400 shrink-0">
                              <Receipt className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-zinc-100 truncate">
                              {r.storeName || (locale === "de" ? "Beleg" : "Receipt")}
                            </p>
                            <p className="text-[11px] text-zinc-400 tabular-nums">
                              {locale === "de"
                                ? r.totalReceiptAmount.toFixed(2).replace(".", ",")
                                : r.totalReceiptAmount.toFixed(2)}{" "}
                              € · {r.lines.length}{" "}
                              {locale === "de"
                                ? r.lines.length === 1
                                  ? "Position"
                                  : "Positionen"
                                : r.lines.length === 1
                                ? "item"
                                : "items"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setReviewingIndex(i);
                              setPhase("review");
                            }}
                            className="text-xs h-7 px-2.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/[0.06] font-medium"
                          >
                            {locale === "de" ? "Prüfen" : "Edit"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleRemoveReceipt(i)}
                            disabled={isPending}
                            className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg h-7 w-7"
                            title={locale === "de" ? "Beleg entfernen" : "Remove receipt"}
                            aria-label={locale === "de" ? "Beleg entfernen" : "Remove receipt"}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Sleek compact upload button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending || isAnyReceiptScanning}
                className="w-full h-10 flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 hover:border-white/30 bg-zinc-900/30 hover:bg-zinc-800/40 transition-colors text-xs font-medium text-zinc-300 hover:text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-3.5 h-3.5 text-zinc-400" />
                <span>
                  {receipts.length > 0
                    ? locale === "de"
                      ? "Weiteren Beleg hinzufügen"
                      : "Add another receipt"
                    : locale === "de"
                    ? "+ Beleg scannen / hinzufügen"
                    : "+ Scan / add receipt"}
                </span>
              </button>

              {/* Compact 2-column grid for Store and Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="checkout-store" className="text-xs font-medium text-zinc-300">
                    {locale === "de" ? "Store" : "Store"}
                  </Label>
                  <Input
                    id="checkout-store"
                    type="text"
                    placeholder={locale === "de" ? "z.B. Edeka, Rewe, Lidl" : "e.g. Edeka, Rewe, Lidl"}
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="h-9 text-xs rounded-lg border-white/[0.08] bg-zinc-900/50 focus-visible:bg-zinc-900 focus-visible:border-white/20 transition-colors text-zinc-100 placeholder:text-zinc-500"
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="checkout-amount" className="text-xs font-medium text-zinc-300">
                    {locale === "de" ? "Betrag (€)" : "Total (€)"}
                  </Label>
                  <Input
                    id="checkout-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={totalAmount}
                    onChange={(e) => {
                      setIsTotalManuallyOverridden(true);
                      setTotalAmount(e.target.value);
                    }}
                    className="h-9 text-xs font-mono tabular-nums rounded-lg border-white/[0.08] bg-zinc-900/50 focus-visible:bg-zinc-900 focus-visible:border-white/20 transition-colors text-zinc-100 placeholder:text-zinc-500"
                    disabled={isPending}
                  />
                  {isTotalInvalid && totalAmount !== "" && (
                    <p className="text-[11px] text-amber-400/90 leading-tight">
                      {locale === "de" ? "Betrag muss größer als 0,00 € sein" : "Amount must be greater than €0.00"}
                    </p>
                  )}
                </div>
              </div>

              {/* Note input */}
              <div className="space-y-1.5">
                <Label htmlFor="checkout-note" className="text-xs font-medium text-zinc-300">
                  {locale === "de" ? "Notiz (optional)" : "Note (optional)"}
                </Label>
                <textarea
                  id="checkout-note"
                  rows={2}
                  placeholder={t.kitchen.ledger.noteToAdminPlaceholder}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="flex min-h-[56px] w-full rounded-lg border border-white/[0.08] bg-zinc-900/50 p-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:border-white/20 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-colors"
                  disabled={isPending}
                />
                <p className="text-[11px] text-zinc-500">
                  {locale === "de"
                    ? "Nur für Admins sichtbar · wird nach Ausgleich gelöscht"
                    : "Visible only to admins · cleared once settled"}
                </p>
              </div>

              {/* Footer Actions */}
              <DialogFooter className="pt-3 border-t border-white/[0.06] flex items-center justify-between sm:justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  disabled={isPending}
                  className="text-xs h-9 px-3 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]"
                >
                  {locale === "de" ? "Abbrechen" : "Cancel"}
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleSaveDraft}
                    disabled={isPending}
                    className="text-xs h-9 px-3 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border border-white/[0.06]"
                  >
                    {locale === "de" ? "Entwurf" : "Save draft"}
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isPending || isAnyReceiptScanning || stagedCartItems.length === 0 || isTotalInvalid}
                    className="text-xs font-medium h-9 px-4 rounded-lg gap-1.5 bg-white text-zinc-950 hover:bg-zinc-200 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isPending || isAnyReceiptScanning ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isAnyReceiptScanning
                        ? locale === "de"
                          ? "Beleg wird gescannt..."
                          : "Scanning receipt..."
                        : readyReceiptCount > 0
                        ? locale === "de"
                          ? "Ausgleichen anfragen"
                          : "Submit Refund Request"
                        : locale === "de"
                        ? "Einreichen"
                        : "Checkout"}
                    </span>
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </div>
        )}

        {phase === "confirm-unmatched" && (
          <div className="flex flex-col space-y-4">
            <DialogHeader className="px-5 py-4 border-b border-white/[0.06] -mx-5 sm:-mx-6 -mt-5 sm:-mt-6 mb-2 pr-12 text-left">
              <DialogTitle className="text-base font-semibold text-zinc-100 tracking-tight">
                {receipts.length > 0
                  ? locale === "de"
                    ? "Nicht zugeordnete Artikel"
                    : "Unmatched Items"
                  : locale === "de"
                  ? "Auslage ohne Beleg"
                  : "Checkout Without Receipt"}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {receipts.length > 0
                  ? "Choose what to do with items not matched to a receipt"
                  : "Checkout items without a receipt"}
              </DialogDescription>
            </DialogHeader>

            <p className="text-xs text-zinc-400">
              {receipts.length > 0
                ? locale === "de"
                  ? "Diese Artikel wurden auf keinem Beleg gefunden. Wähle für jeden Artikel, ob er gekauft wurde oder zurück in die Liste soll."
                  : "These items were not matched to any receipt. Choose whether each was purchased or returned to the shopping list."
                : locale === "de"
                ? "Wähle für jeden Artikel, ob er gekauft wurde oder zurück in den Warenkorb soll."
                : "Choose what to do with each item below."}
            </p>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {itemsNeedingDecision.map((item) => {
                const decision = noReceiptDecisions[item.id];
                return (
                  <div key={item.id} className="p-3 rounded-xl border border-white/[0.07] bg-zinc-900/50 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-zinc-200 truncate">{item.name}</span>
                      {decision && (
                        <span
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-md border font-normal",
                            decision === "forgot"
                              ? "bg-zinc-800 border-white/[0.1] text-zinc-200"
                              : "bg-zinc-900/50 border-white/[0.06] text-zinc-400"
                          )}
                        >
                          {decision === "forgot"
                            ? locale === "de"
                              ? "Gekauft"
                              : "Marked as Bought"
                            : locale === "de"
                            ? "Zurückgelegt"
                            : "Returned to Cart"}
                        </span>
                      )}
                    </div>

                    {receipts.length > 0 && decision === "forgot" && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={noReceiptPrices[item.id] ?? ""}
                          onChange={(e) => handleNoReceiptPriceChange(item.id, e.target.value)}
                          className="h-8 text-xs font-mono tabular-nums rounded-lg border-white/[0.08] bg-zinc-900/50 text-zinc-100 placeholder:text-zinc-500 flex-1"
                        />
                        <span className="text-xs text-zinc-400 font-mono">€</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={decision === "return" ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => handleNoReceiptDecision(item.id, "return")}
                        className={cn(
                          "flex-1 h-8 text-xs rounded-lg transition-colors",
                          decision === "return"
                            ? "bg-zinc-800 text-white border-white/[0.1]"
                            : "border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                        )}
                      >
                        {locale === "de" ? "Zurück in Liste" : "Return to Cart"}
                      </Button>
                      <Button
                        type="button"
                        variant={decision === "forgot" ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => handleNoReceiptDecision(item.id, "forgot")}
                        className={cn(
                          "flex-1 h-8 text-xs rounded-lg transition-colors",
                          decision === "forgot"
                            ? "bg-zinc-800 text-white border-white/[0.1]"
                            : "border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                        )}
                      >
                        {locale === "de" ? "Ohne Beleg gekauft" : "Forgot Receipt"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <DialogFooter className="pt-3 border-t border-white/[0.06] flex items-center justify-between sm:justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPhase("form")}
                disabled={isPending}
                className="text-xs h-9 px-3 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]"
              >
                {locale === "de" ? "Zurück" : "Back"}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={finalizeCheckout}
                disabled={isPending || itemsNeedingDecision.some((item) => !noReceiptDecisions[item.id])}
                className="text-xs font-medium h-9 px-4 rounded-lg gap-1.5 bg-white text-zinc-950 hover:bg-zinc-200 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{locale === "de" ? "Bestätigen & Einreichen" : "Confirm & Checkout"}</span>
              </Button>
            </DialogFooter>
          </div>
        )}

        {phase === "review" && current && reviewingIndex !== null && (
          <div className="flex flex-col h-full w-full overflow-hidden">
            {/* Review Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/[0.06] bg-card shrink-0 z-10">
              <div className="flex items-center gap-2.5 min-w-0">
                <Receipt className="w-4 h-4 text-zinc-400 shrink-0" />
                <span className="text-sm font-semibold text-zinc-100 truncate">
                  {locale === "de" ? "Beleg prüfen & zuordnen" : "Review & Match Receipt"}
                  {receipts.length > 1 ? ` (${reviewingIndex + 1}/${receipts.length})` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-xs font-mono tabular-nums px-2 py-0.5 rounded-md bg-zinc-800/80 border border-white/[0.08] text-zinc-200">
                  {current.totalReceiptAmount.toFixed(2).replace(".", ",")} €
                </span>
                <button
                  type="button"
                  onClick={handleContinueToDetails}
                  disabled={isPending}
                  aria-label="Close dialog"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
              {/* Desktop image viewer */}
              <div className="hidden md:flex md:w-2/5 shrink-0 border-r border-white/[0.06] bg-zinc-950/40 p-4 flex-col items-center justify-center relative overflow-hidden">
                <div className="relative rounded-xl overflow-hidden border border-white/[0.08] bg-zinc-950/80 h-full w-full flex items-center justify-center">
                  {current.previewUrl && (
                    <img
                      src={current.previewUrl}
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
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-900/80 backdrop-blur-sm border border-white/[0.1] text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
                    title={isZoomed ? "Zoom out" : "Zoom in"}
                  >
                    {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Mobile image toggle */}
              <div className="md:hidden border-b border-white/[0.06] bg-zinc-900/30 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsMobileReceiptExpanded(!isMobileReceiptExpanded)}
                  className="w-full flex items-center justify-between p-3 text-xs font-medium text-zinc-300 hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-zinc-500 shrink-0" />
                    <span>{locale === "de" ? "Belegfoto" : "Receipt Photo"}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/[0.08] text-zinc-500">
                      {isMobileReceiptExpanded
                        ? locale === "de"
                          ? "Einklappen"
                          : "Collapse"
                        : locale === "de"
                        ? "Anzeigen"
                        : "View"}
                    </span>
                  </div>
                  {isMobileReceiptExpanded ? (
                    <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
                  )}
                </button>

                {isMobileReceiptExpanded && current.previewUrl && (
                  <div className="p-3 pt-0 flex flex-col items-center justify-center animate-in fade-in-50 duration-200">
                    <div className="relative rounded-xl overflow-hidden border border-white/[0.08] bg-zinc-950 max-h-[35vh] w-full flex items-center justify-center">
                      <img
                        src={current.previewUrl}
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
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-900/80 backdrop-blur-sm border border-white/[0.1] text-zinc-400 hover:text-zinc-100 cursor-pointer"
                      >
                        {isZoomed ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Line items assignment panel */}
              <div className="flex-1 flex flex-col min-h-0 min-w-0 md:w-3/5 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 touch-pan-y overscroll-contain">
                  <div className="flex items-center justify-between gap-2.5 flex-wrap p-2.5 rounded-xl bg-zinc-900/50 border border-white/[0.07]">
                    <div className="flex items-center gap-2 text-xs text-zinc-200 font-medium">
                      <span>{current.storeName || (locale === "de" ? "Geschäft" : "Store")}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-zinc-500">
                        {locale === "de" ? "Gesamtbetrag Beleg: " : "Receipt Total: "}
                      </span>
                      <span className="text-xs font-bold font-mono tabular-nums text-zinc-100">
                        {current.totalReceiptAmount.toFixed(2).replace(".", ",")} €
                      </span>
                    </div>
                  </div>

                  {unresolvedItems.length > 0 && (
                    <p className="text-[11px] text-zinc-500">
                      {locale === "de"
                        ? `${unresolvedItems.length} Artikel noch keinem Beleg zugeordnet (${unresolvedItems.map((c) => c.name).join(", ")})`
                        : `${unresolvedItems.length} items not matched to any receipt (${unresolvedItems.map((c) => c.name).join(", ")})`}
                    </p>
                  )}

                  <p className="text-[11px] text-zinc-400 font-medium">
                    {locale === "de"
                      ? "Wähle die Positionen aus, die für die Küche erstattet werden sollen:"
                      : "Select the line items to claim for the household:"}
                  </p>

                  <div className="space-y-2">
                    {current.lines.map((line, i) => {
                      const state = current.lineStates[i];
                      if (!state) return null;

                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl border transition-all text-xs",
                            state.checked
                              ? "border-white/[0.12] bg-zinc-900/80 text-zinc-100"
                              : "border-white/[0.04] bg-zinc-950/30 opacity-60 text-zinc-400"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleLine(reviewingIndex, i)}
                            className={cn(
                              "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer",
                              state.checked
                                ? "bg-white border-white text-zinc-950"
                                : "border-white/[0.2] hover:border-white/[0.4]"
                            )}
                          >
                            {state.checked && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                          </button>

                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-xs font-medium truncate" title={line.raw_name}>
                              {line.quantity > 1 ? (
                                <>
                                  <span className="font-semibold text-zinc-100">{line.quantity}×</span>{" "}
                                  <span>{line.raw_name}</span>{" "}
                                  <span className="text-zinc-400 font-mono">
                                    · {(state.price || 0).toFixed(2).replace(".", ",")} €
                                  </span>
                                  {(line.unit_price ?? line.unitPrice) !== null && (
                                    <span className="text-[11px] text-zinc-500 font-mono ml-1">
                                      ({(line.unit_price ?? line.unitPrice)!.toFixed(2).replace(".", ",")} €/{locale === "de" ? "Stk" : "ea"})
                                    </span>
                                  )}
                                </>
                              ) : (
                                <>
                                  <span>{line.raw_name}</span>{" "}
                                  <span className="text-zinc-400 font-mono">
                                    · {(state.price || 0).toFixed(2).replace(".", ",")} €
                                  </span>
                                </>
                              )}
                            </p>
                            <select
                              value={current.lineMatches[i] ?? ""}
                              onChange={(e) => handleMatchChange(reviewingIndex, i, e.target.value || null)}
                              className="text-[11px] bg-zinc-900/90 border border-white/[0.08] rounded-md px-1.5 py-0.5 text-zinc-200 max-w-full focus:outline-none focus:border-white/20"
                            >
                              <option value="">{locale === "de" ? "— Nicht zugeordnet —" : "— Not matched —"}</option>
                              {stagedCartItems.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {locale === "de" ? `Zuordnen zu "${item.name}"` : `Match to "${item.name}"`}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Input
                              type="number"
                              step="0.01"
                              value={state.price === 0 ? "" : state.price}
                              onChange={(e) => handlePriceChange(reviewingIndex, i, e.target.value)}
                              className="w-18 sm:w-20 h-7 text-xs text-right font-mono tabular-nums bg-zinc-900/80 border-white/[0.08] text-zinc-100 rounded-md"
                            />
                            <span className="text-xs text-zinc-500 font-mono">€</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sticky bottom summary bar */}
                <div className="sticky bottom-0 left-0 right-0 p-3 sm:p-4 bg-card/95 backdrop-blur-md border-t border-white/[0.06] flex items-center justify-between gap-3 z-10 shrink-0">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-semibold text-zinc-100 tabular-nums truncate">
                      {locale === "de" ? "Auslage für Küche: " : "Claimed: "}
                      {claimedAmount.toFixed(2).replace(".", ",")} €
                    </p>
                    <p className="text-[10px] text-zinc-500 tabular-nums">
                      {locale === "de" ? "Belegsumme: " : "Total: "}
                      {totalReceiptAmount.toFixed(2).replace(".", ",")} €
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveReceipt(reviewingIndex)}
                      disabled={isPending}
                      className="text-xs h-8 px-2.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      {locale === "de" ? "Löschen" : "Discard"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleContinueToDetails}
                      disabled={isPending}
                      className="text-xs font-medium h-8 px-3 rounded-lg gap-1.5 bg-white text-zinc-950 hover:bg-zinc-200 transition-colors shadow-sm"
                    >
                      <span>{locale === "de" ? "Übernehmen" : "Apply"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
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
