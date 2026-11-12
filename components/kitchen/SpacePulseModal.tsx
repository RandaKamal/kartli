"use client";

import * as React from "react";
import { useState, useEffect, useTransition, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CreditCard,
  Package,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Download,
  Clock,
  ShoppingCart,
  Receipt,
  Calendar,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Crown,
  X,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import {
  getKitchenStats,
  type KitchenPulseStats,
  type MonthCheckoutItem,
} from "@/lib/actions/stats";
import type { PantryItem, CheckoutWithDetails } from "@/types";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

export interface SpacePulseModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  kitchenId: string;
  kitchenName: string;
  currentUserId: string;
  initialStats?: KitchenPulseStats | any;
  pantryItems?: PantryItem[] | any[];
  myCheckouts?: CheckoutWithDetails[] | any[];
  onStartShoppingRun?: () => void;
}

const MERCHANT_BARS = [
  "bg-muted-foreground/20",
  "bg-muted-foreground/35",
  "bg-muted-foreground/50",
  "bg-muted-foreground/65",
  "bg-muted-foreground/80",
];

function escapeCsvCell(cell: string | number | null | undefined): string {
  if (cell === null || cell === undefined) return '""';
  const str = String(cell);
  if (str.includes('"') || str.includes(',') || str.includes(';') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

function formatMonthLabel(monthKey: string, locale: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, 1));
  return date.toLocaleDateString(locale === "de" ? "de-DE" : "en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function getRecentMonths(count = 12, locale: string): Array<{ key: string; label: string }> {
  const months: Array<{ key: string; label: string }> = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString(locale === "de" ? "de-DE" : "en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    months.push({ key, label });
  }
  return months;
}

function formatTimeSinceEmpty(
  dateInput: string | Date | undefined | null,
  locale: string
): string {
  if (!dateInput) return locale === "de" ? "Kürzlich" : "Recently";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return locale === "de" ? "Kürzlich" : "Recently";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    const mins = Math.max(1, diffMins);
    return locale === "de" ? `vor ${mins} Min.` : `${mins}m ago`;
  }
  if (diffHours < 24) {
    return locale === "de" ? `vor ${diffHours} Std.` : `${diffHours}h ago`;
  }
  if (diffDays === 1) {
    return locale === "de" ? "vor 1 Tag" : "1 day ago";
  }
  return locale === "de" ? `vor ${diffDays} Tagen` : `${diffDays} days ago`;
}

function formatShortDate(
  dateInput: string | Date | undefined | null,
  locale: string
): string {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString(locale === "de" ? "de-DE" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SpacePulseModalSkeleton() {
  return (
    <div className="space-y-6 py-2 animate-pulse">
      <Card className="bg-muted/40 border border-border rounded-xl p-5 space-y-4 shadow-none">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-28 rounded-md" />
          <Skeleton className="h-3 w-20 rounded-md" />
        </div>
        <Skeleton className="h-9 w-44 rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-muted/40 border border-border rounded-xl p-5 space-y-3 shadow-none">
          <Skeleton className="h-3 w-32 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-1.5 w-full rounded-full" />
        </Card>
        <Card className="bg-muted/40 border border-border rounded-xl p-5 space-y-3 shadow-none">
          <Skeleton className="h-3 w-32 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-1.5 w-full rounded-full" />
        </Card>
      </div>

      <div className="space-y-2 pt-1">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function SpacePulseModal({
  isOpen,
  onOpenChange,
  kitchenId,
  kitchenName,
  currentUserId,
  initialStats,
  pantryItems,
  myCheckouts,
  onStartShoppingRun,
}: SpacePulseModalProps) {
  const { t, locale } = useTranslation();

  const currentMonthKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(
    initialStats?.monthKey || currentMonthKey
  );
  const [stats, setStats] = useState<KitchenPulseStats | null>(initialStats || null);
  const [isLoading, setIsLoading] = useState(!initialStats);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<"spending" | "pantry" | "activity">("spending");
  const [, startTransition] = useTransition();

  // Sync initialStats when prop updates
  useEffect(() => {
    if (initialStats) {
      setStats(initialStats);
      if (initialStats.monthKey) {
        setSelectedMonthKey(initialStats.monthKey);
      }
      setIsLoading(false);
    }
  }, [initialStats]);

  // Fetch aggregated data for kitchen and selected month
  const loadData = async (isManual = false, monthKey = selectedMonthKey) => {
    if (isManual) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const statsData = await getKitchenStats(kitchenId, currentUserId, monthKey);
      setStats(statsData);
      if (isManual) {
        toast.success(t.pulse.updated);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.pulse.couldNotLoad;
      toast.error(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData(false, selectedMonthKey);
    }
  }, [isOpen, kitchenId, currentUserId, selectedMonthKey]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonthKey.split("-").map(Number);
    const prevDate = new Date(Date.UTC(y, m - 2, 1));
    const nextKey = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, "0")}`;
    setSelectedMonthKey(nextKey);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonthKey.split("-").map(Number);
    const nextDate = new Date(Date.UTC(y, m, 1));
    const nextKey = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, "0")}`;
    setSelectedMonthKey(nextKey);
  };

  // CSV Export handler (Task 3)
  const handleExportCsv = () => {
    const checkouts = (stats?.monthCheckouts || []).filter((c) => !c.is_declined);
    if (checkouts.length === 0) {
      toast.info(t.pulse.csvExportNoData);
      return;
    }

    setIsExporting(true);
    try {
      const headers = [
        t.pulse.csvHeaderDate,
        t.pulse.csvHeaderStore,
        t.pulse.csvHeaderAmount,
        t.pulse.csvHeaderCurrency,
        t.pulse.csvHeaderPaidBy,
        t.pulse.csvHeaderNote,
        t.pulse.csvHeaderStatus,
      ];

      const rows = checkouts.map((c) => {
        const dateStr = c.created_at
          ? new Date(c.created_at).toISOString().split("T")[0]
          : "";
        const storeName = c.store_name === "Sonstige" ? t.pulse.otherStore : c.store_name;
        const amountStr = c.total_claimed_amount.toFixed(2);
        const currencyStr = c.currency || stats?.currency || "EUR";
        const paidBy = c.paid_by_name || c.username || "Mitglied";
        const note = c.note || "";
        const status = c.is_refunded ? t.pulse.csvSettled : t.pulse.csvPending;

        return [
          escapeCsvCell(dateStr),
          escapeCsvCell(storeName),
          escapeCsvCell(amountStr),
          escapeCsvCell(currencyStr),
          escapeCsvCell(paidBy),
          escapeCsvCell(note),
          escapeCsvCell(status),
        ].join(",");
      });

      const csvContent = [headers.map(escapeCsvCell).join(","), ...rows].join("\r\n");
      // Standard UTF-8 with BOM (\uFEFF)
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });

      const slug = (kitchenName || "space")
        .toLowerCase()
        .replace(/[^a-z0-9_-]/gi, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      const filename = `kartli-${slug}-ausgaben-${selectedMonthKey}.csv`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(t.pulse.csvExportSuccess);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Export failed";
      toast.error(msg);
    } finally {
      setIsExporting(false);
    }
  };

  const currency = stats?.currency || "EUR";
  const recentMonths = useMemo(() => getRecentMonths(12, locale), [locale]);
  const monthDisplayLabel = useMemo(
    () => formatMonthLabel(selectedMonthKey, locale),
    [selectedMonthKey, locale]
  );

  // Depleted essentials count
  const depletedCount = stats?.pantryStockRatio?.outOfStock ?? 0;
  const feedCheckoutsCount = stats?.monthCheckouts?.length ?? 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        onDismiss={() => onOpenChange(false)}
        className="h-[88dvh] max-h-[88dvh] w-full bg-card text-card-foreground rounded-t-2xl border-t border-border shadow-2xl flex flex-col overflow-hidden sm:h-[750px] sm:max-h-[85dvh] sm:w-full sm:max-w-xl sm:rounded-xl sm:border p-0 gap-0 [&>button:last-child]:hidden"
      >
        {/* Zone 1: Header Zone (shrink-0) */}
        <div className="shrink-0 border-b border-border">
          <DialogHeader className="px-5 pt-5 pb-3 space-y-3">
            {/* Title + actions */}
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-base font-semibold tracking-tight text-foreground truncate">
                {kitchenName} {t.pulse.title}
              </DialogTitle>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleExportCsv}
                  disabled={isExporting || isLoading}
                  className="h-8 px-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 gap-1.5"
                  title={t.pulse.csvExportBtn}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {isExporting ? t.pulse.csvExporting : t.pulse.csvExportBtn}
                  </span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => loadData(true, selectedMonthKey)}
                  disabled={isRefreshing || isLoading}
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 shrink-0 cursor-pointer"
                  title={t.pulse.refresh}
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onOpenChange(false)}
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 shrink-0 cursor-pointer"
                  title={t.pulse.close || t.common.close}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Month navigation */}
            <div className="flex items-center">
              <div className="inline-flex items-center bg-muted border border-border rounded-lg p-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handlePrevMonth}
                  className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
                  title={t.pulse.previousMonth}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="px-2.5 py-1 text-xs font-medium text-foreground hover:text-foreground hover:bg-muted/60 rounded-md flex items-center gap-1.5 cursor-pointer transition select-none"
                    >
                      <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="capitalize tabular-nums">{monthDisplayLabel}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 max-h-64 overflow-y-auto">
                    {recentMonths.map((m) => (
                      <DropdownMenuItem
                        key={m.key}
                        onClick={() => setSelectedMonthKey(m.key)}
                        className={cn(
                          "text-xs capitalize cursor-pointer",
                          m.key === selectedMonthKey && "font-medium text-foreground bg-muted"
                        )}
                      >
                        {m.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleNextMonth}
                  disabled={selectedMonthKey >= currentMonthKey}
                  className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer disabled:opacity-30"
                  title={t.pulse.nextMonth}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Segmented Control Sub-navigation */}
          <div className="w-full px-5 shrink-0">
            <div
              role="tablist"
              aria-label="Pulse navigation"
              className="w-full grid grid-cols-3 p-1 bg-muted rounded-lg border border-border mb-4 gap-1 shrink-0"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "spending"}
                onClick={() => setActiveTab("spending")}
                className={cn(
                  "flex items-center justify-center gap-1.5 h-8 px-1 text-xs font-medium rounded-md transition-colors text-center truncate cursor-pointer",
                  activeTab === "spending"
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <CreditCard className="w-3.5 h-3.5 shrink-0 opacity-70" />
                <span className="truncate">{t.pulse.tabSpendBalance}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "pantry"}
                onClick={() => setActiveTab("pantry")}
                className={cn(
                  "flex items-center justify-center gap-1.5 h-8 px-1 text-xs font-medium rounded-md transition-colors text-center truncate cursor-pointer",
                  activeTab === "pantry"
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Package className="w-3.5 h-3.5 shrink-0 opacity-70" />
                <span className="truncate">{t.pulse.tabBasicsHealth}</span>
                {depletedCount > 0 && (
                  <span className="text-[11px] tabular-nums text-muted-foreground shrink-0">
                    {depletedCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "activity"}
                onClick={() => setActiveTab("activity")}
                className={cn(
                  "flex items-center justify-center gap-1.5 h-8 px-1 text-xs font-medium rounded-md transition-colors text-center truncate cursor-pointer",
                  activeTab === "activity"
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Clock className="w-3.5 h-3.5 shrink-0 opacity-70" />
                <span className="truncate">{t.pulse.tabRestockFeed}</span>
                {feedCheckoutsCount > 0 && (
                  <span className="text-[11px] tabular-nums text-muted-foreground shrink-0">
                    {feedCheckoutsCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Zone 2: Scrollable Content Zone (flex-1 min-h-0 overflow-y-auto) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] space-y-4 overscroll-contain">
          {isLoading ? (
            <SpacePulseModalSkeleton />
          ) : !stats ? (
            <div className="py-14 text-center space-y-2">
              <AlertCircle className="w-5 h-5 mx-auto text-amber-400/80" />
              <p className="text-sm font-medium text-foreground">{t.pulse.couldNotLoad}</p>
              <p className="text-xs text-muted-foreground">{t.pulse.networkError}</p>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadData(true, selectedMonthKey)}
                  className="rounded-lg text-xs h-8 px-3 cursor-pointer"
                >
                  {t.pulse.retry}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* SUB-TAB 1: Ausgaben & Saldo */}
              {activeTab === "spending" && (
                <div className="space-y-5 animate-in fade-in-50 duration-200">
                  {/* Honest Empty State if zero checkouts exist for the period */}
                  {stats.totalReceiptsCount === 0 && stats.totalSpendCurrentMonth === 0 ? (
                    <div className="py-14 text-center space-y-3">
                      <CreditCard className="w-5 h-5 mx-auto text-muted-foreground" />
                      <div className="space-y-1 max-w-sm mx-auto">
                        <p className="text-sm font-medium text-foreground">
                          {t.pulse.emptyMonthTitle}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.pulse.emptyMonthSub}
                        </p>
                      </div>
                      <div className="pt-1">
                        <Button
                          type="button"
                          onClick={() => {
                            if (onStartShoppingRun) {
                              onStartShoppingRun();
                            } else {
                              onOpenChange(false);
                            }
                          }}
                          className="rounded-lg text-xs font-medium h-8 px-3 gap-1.5 cursor-pointer"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>{t.pulse.startShoppingRun}</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Monthly spend */}
                      <Card className="bg-muted/40 border border-border rounded-xl p-5 shadow-none space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">{t.pulse.monthlySpend}</span>
                          <span className="text-xs text-muted-foreground capitalize tabular-nums">
                            {monthDisplayLabel}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-baseline gap-3 flex-wrap">
                            <span className="text-3xl font-semibold text-foreground tracking-tight tabular-nums">
                              {formatCurrency(stats.totalSpendCurrentMonth, currency)}
                            </span>

                            {stats.spendTrendDirection === "down" && (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 tabular-nums">
                                <TrendingDown className="w-3 h-3" />
                                -{stats.spendTrendPercentage}% {t.pulse.vsLastMonth}
                              </span>
                            )}
                            {stats.spendTrendDirection === "up" && (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-400 tabular-nums">
                                <TrendingUp className="w-3 h-3" />
                                +{stats.spendTrendPercentage}% {t.pulse.vsLastMonth}
                              </span>
                            )}
                            {stats.spendTrendDirection === "flat" && (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                                <Minus className="w-3 h-3" />
                                0% {t.pulse.vsLastMonth}
                              </span>
                            )}
                            {stats.spendTrendDirection === "new" && (
                              <span className="inline-flex items-center text-xs text-muted-foreground">
                                {t.pulse.firstMonth}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
                            <span>{t.pulse.prevMonthSpend}</span>
                            <span className="tabular-nums">
                              {formatCurrency(stats.totalSpendPreviousMonth, currency)}
                            </span>
                          </div>
                        </div>
                      </Card>

                      {/* Personal impact & settlement */}
                      <Card className="bg-muted/40 border border-border rounded-xl p-5 shadow-none space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-muted-foreground">{t.pulse.myImpact}</span>
                        </div>

                        {stats.userReceiptsCount === 0 &&
                        stats.userSpend === 0 &&
                        (!stats.userSettlement || stats.userSettlement.pendingRefundAmount === 0) ? (
                          <p className="text-xs text-muted-foreground py-2">
                            {t.pulse.noCheckoutsLogged}
                          </p>
                        ) : (
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <span className="text-[11px] text-muted-foreground">{t.pulse.personalSpend}</span>
                              <div className="text-base font-semibold text-foreground tabular-nums">
                                {formatCurrency(stats.userSpend, currency)}
                              </div>
                              <span className="block text-[11px] text-muted-foreground tabular-nums">
                                {t.pulse.totalSpendShare.replace("{percentage}", String(stats.userSpendSharePercentage))}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[11px] text-muted-foreground">{t.pulse.personalRuns}</span>
                              <div className="text-base font-semibold text-foreground tabular-nums">
                                {stats.userReceiptsCount}
                                <span className="text-xs font-normal text-muted-foreground">
                                  {" "}/ {stats.totalReceiptsCount}
                                </span>
                              </div>
                              <span className="block text-[11px] text-muted-foreground tabular-nums">
                                {t.pulse.householdRunsShare.replace("{percentage}", String(stats.userHabitRole.runPercentage))}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[11px] text-muted-foreground">{t.pulse.settlementStatus}</span>
                              <div className="text-base font-semibold tabular-nums">
                                {stats.userSettlement.pendingRefundAmount > 0 ? (
                                  <span className="text-amber-400">
                                    +{formatCurrency(stats.userSettlement.pendingRefundAmount, currency)}
                                  </span>
                                ) : (
                                  <span className="text-emerald-400">{t.pulse.balanced}</span>
                                )}
                              </div>
                              <span className="block text-[11px] text-muted-foreground">
                                {stats.userSettlement.pendingRefundAmount > 0
                                  ? t.pulse.owedToYou.replace("{count}", String(stats.userSettlement.pendingRefundsCount))
                                  : t.pulse.allRefundsSettled}
                              </span>
                            </div>
                          </div>
                        )}
                      </Card>

                      {/* Member spending */}
                      <Card className="bg-muted/40 border border-border rounded-xl p-5 shadow-none space-y-1">
                        <div className="flex items-center justify-between pb-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            {t.pulse.memberRosterTitle.replace("{count}", String(stats.memberRoster?.length || 0))}
                          </span>
                        </div>

                        {stats.memberRoster && stats.memberRoster.length > 0 ? (
                          <div className="divide-y divide-border">
                            {stats.memberRoster.map((member, idx) => {
                              const sharePct =
                                stats.totalSpendCurrentMonth > 0
                                  ? Math.round((member.spend / stats.totalSpendCurrentMonth) * 100)
                                  : 0;

                              return (
                                <div
                                  key={member.userId}
                                  className="py-3 flex items-center gap-3"
                                >
                                  <span className="w-4 text-[11px] tabular-nums text-muted-foreground shrink-0">
                                    {idx + 1}
                                  </span>
                                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[11px] font-medium text-foreground shrink-0 uppercase">
                                    {member.name.charAt(0)}
                                  </div>

                                  <div className="min-w-0 flex-1 space-y-1.5">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="text-sm font-medium text-foreground truncate">
                                        {member.name}
                                      </span>
                                      {member.isTopRestocker && (
                                        <Crown className="w-3 h-3 text-amber-400/80 shrink-0" />
                                      )}
                                    </div>
                                    <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                                      <div
                                        className="h-full rounded-full bg-muted-foreground/70"
                                        style={{ width: `${Math.max(sharePct, 2)}%` }}
                                      />
                                    </div>
                                  </div>

                                  <div className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                                    <span className="text-sm font-medium text-foreground">
                                      {formatCurrency(member.spend, currency)}
                                    </span>
                                    <span className="mx-1 text-muted-foreground">·</span>
                                    {sharePct}%
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground py-2">{t.pulse.noRuns}</p>
                        )}
                      </Card>

                      {/* Merchant breakdown */}
                      <Card className="bg-muted/40 border border-border rounded-xl p-5 shadow-none space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">
                            {t.pulse.merchantBreakdown}
                          </span>
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {stats.categoryBreakdown.length}{" "}
                            {stats.categoryBreakdown.length === 1
                              ? t.pulse.storeSingular
                              : t.pulse.storePlural}
                          </span>
                        </div>

                        {stats.categoryBreakdown.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-3 text-center">
                            {t.pulse.noMerchantData}
                          </p>
                        ) : (
                          <div className="space-y-3">
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden flex">
                              {stats.categoryBreakdown.map((store, idx) => (
                                <div
                                  key={store.name}
                                  title={`${store.name === "Sonstige" ? t.pulse.otherStore : store.name}: ${store.percentage}% (${formatCurrency(store.amount, currency)})`}
                                  className={cn(
                                    "h-full transition-all duration-300",
                                    MERCHANT_BARS[idx % MERCHANT_BARS.length]
                                  )}
                                  style={{ width: `${Math.max(store.percentage, 2)}%` }}
                                />
                              ))}
                            </div>

                            <div className="divide-y divide-border">
                              {stats.categoryBreakdown.map((store) => {
                                const displayName =
                                  store.name === "Sonstige" ? t.pulse.otherStore : store.name;

                                return (
                                  <div
                                    key={store.name}
                                    className="flex items-center justify-between gap-3 py-2.5"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 shrink-0" />
                                      <span className="text-sm text-foreground truncate">
                                        {displayName}
                                      </span>
                                      <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                                        {store.count}{" "}
                                        {store.count === 1
                                          ? t.pulse.runSingular
                                          : t.pulse.runPlural}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0 text-xs tabular-nums">
                                      <span className="text-foreground font-medium">
                                        {formatCurrency(store.amount, currency)}
                                      </span>
                                      <span className="text-muted-foreground w-8 text-right">
                                        {store.percentage}%
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </Card>
                    </>
                  )}
                </div>
              )}

              {/* SUB-TAB 2: WG-Basics Health */}
              {activeTab === "pantry" && (
                <div className="space-y-5 animate-in fade-in-50 duration-200">
                  {/* Stock health */}
                  <Card className="bg-muted/40 border border-border rounded-xl p-5 shadow-none space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {t.pulse.inventoryHealth}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            stats.pantryStockRatio.outOfStock > 0 ? "bg-amber-500" : "bg-emerald-500/80"
                          )}
                        />
                        {stats.pantryStockRatio.outOfStock > 0
                          ? t.pulse.depletedCount.replace(
                              "{count}",
                              String(stats.pantryStockRatio.outOfStock)
                            )
                          : t.pulse.fullyStocked}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-3xl font-semibold text-foreground tabular-nums">
                          {stats.pantryStockRatio.inStockPercentage}%
                        </span>
                        <span
                          className="text-[11px] text-muted-foreground tabular-nums text-right"
                          title={t.pulse.restockResponseTime}
                        >
                          {t.pulse.stockSummary
                            .replace("{inStock}", String(stats.pantryStockRatio.inStock))
                            .replace("{outOfStock}", String(stats.pantryStockRatio.outOfStock))}
                          {" · Ø "}
                          {stats.vitals.compactRestockLatency ||
                            stats.vitals.formattedRestockLatency ||
                            t.pulse.instant}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500/70 rounded-full transition-all duration-300"
                          style={{ width: `${stats.pantryStockRatio.inStockPercentage}%` }}
                        />
                      </div>
                    </div>
                  </Card>

                  {/* Depleted essentials */}
                  <Card className="bg-muted/40 border border-border rounded-xl p-5 shadow-none space-y-1">
                    <div className="flex items-center justify-between pb-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {t.pulse.depletedNeedingRestock}
                      </span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {stats.depletedEssentials?.length || 0}
                      </span>
                    </div>

                    {!stats.depletedEssentials || stats.depletedEssentials.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-3 text-center">
                        {t.pulse.allStaplesInStock}
                      </p>
                    ) : (
                      <div className="divide-y divide-border">
                        {stats.depletedEssentials.map((item) => (
                          <div
                            key={item.id}
                            className="py-2.5 flex items-center justify-between gap-3 text-sm"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              <span className="font-medium text-foreground truncate">
                                {item.name}
                              </span>
                            </div>

                            <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                              {formatTimeSinceEmpty(item.updated_at || item.created_at, locale)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Untouched / idle staples */}
                  {stats.idleStaples && stats.idleStaples.length > 0 && (
                    <Card className="bg-muted/40 border border-border rounded-xl p-5 shadow-none space-y-1">
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          {t.pulse.untouchedStaplesSub}
                        </span>
                      </div>

                      <div className="divide-y divide-border">
                        {stats.idleStaples.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 py-2.5 text-xs"
                          >
                            <span className="font-medium text-foreground truncate">
                              {item.name}
                            </span>
                            <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                              {t.pulse.idleDays.replace("{days}", String(item.idle_days))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {/* SUB-TAB 3: Einkaufs-Feed */}
              {activeTab === "activity" && (
                <div className="space-y-3 animate-in fade-in-50 duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t.pulse.recentRestocks}
                    </span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {t.pulse.logsCount.replace(
                        "{count}",
                        String(stats.monthCheckouts?.length || 0)
                      )}
                    </span>
                  </div>

                  {/* List / Feed */}
                  {(() => {
                    const validCheckouts = (stats?.monthCheckouts || []).filter((c) => !c.is_declined);
                    if (validCheckouts.length === 0) {
                      return (
                        <div className="py-12 text-center space-y-2">
                          <Receipt className="w-5 h-5 mx-auto text-muted-foreground" />
                          <p className="text-sm font-medium text-foreground">
                            {t.pulse.noRecentRestocks}
                          </p>
                          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                            {t.pulse.noRecentRestocksDesc}
                          </p>
                        </div>
                      );
                    }
                    return (
                      <div className="rounded-xl border border-border bg-muted/40 divide-y divide-border">
                        {validCheckouts.map((checkout) => {
                          const itemsCount = checkout.items?.length || 0;
                          const receiptFilename =
                            checkout.receipt_filename ||
                            (checkout.receipts && checkout.receipts.length > 0
                              ? checkout.receipts[0].receipt_filename
                              : null);
                          const receiptUrl = receiptFilename
                            ? receiptFilename.startsWith("/")
                              ? receiptFilename
                              : `/uploads/receipts/${receiptFilename}`
                            : null;
                          const storeName =
                            checkout.store_name === "Sonstige"
                              ? t.pulse.otherStore
                              : checkout.store_name;
                          const itemNames = checkout.items
                            .slice(0, 6)
                            .map((item) => item.name)
                            .join(", ");

                          return (
                            <div key={checkout.id} className="px-4 py-3.5 space-y-1">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-medium text-foreground truncate">
                                  {storeName || t.pulse.generalRestock}
                                </span>
                                <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">
                                  {formatCurrency(
                                    checkout.total_claimed_amount,
                                    checkout.currency || currency
                                  )}
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-1.5 min-w-0 text-xs text-muted-foreground">
                                  <span className="truncate">{checkout.paid_by_name}</span>
                                  <span className="text-muted-foreground">·</span>
                                  <span className="tabular-nums shrink-0">
                                    {formatShortDate(checkout.created_at, locale)}
                                  </span>
                                  <span className="text-muted-foreground">·</span>
                                  <span className="inline-flex items-center gap-1.5 shrink-0">
                                    <span
                                      className={cn(
                                        "w-1.5 h-1.5 rounded-full",
                                        checkout.is_refunded ? "bg-emerald-500/80" : "bg-amber-500"
                                      )}
                                    />
                                    {checkout.is_refunded ? t.pulse.settled : t.pulse.pending}
                                  </span>
                                </div>

                                {receiptUrl && (
                                  <a
                                    href={receiptUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label={t.pulse.receiptAttached}
                                    title={t.pulse.receiptAttached}
                                    className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
                                  >
                                    <Receipt className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>

                              {itemsCount > 0 && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {itemNames}
                                  {itemsCount > 6 && (
                                    <span>
                                      {" "}
                                      {t.pulse.moreItems.replace("{count}", String(itemsCount - 6))}
                                    </span>
                                  )}
                                </p>
                              )}

                              {checkout.note && (
                                <p className="text-xs text-muted-foreground truncate">
                                  &ldquo;{checkout.note}&rdquo;
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SpacePulseModal;
