"use client";

import * as React from "react";
import { useState, useEffect, useTransition, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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
  Activity,
  CreditCard,
  Package,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShoppingBag,
  ShoppingCart,
  Receipt,
  Sparkles,
  Flame,
  Store,
  Calendar,
  AlertCircle,
  FileText,
  User,
  Users,
  ChevronLeft,
  ChevronRight,
  Crown,
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

const STORE_ACCENTS = [
  { bg: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-500/20", lightBg: "bg-emerald-500/10" },
  { bg: "bg-teal-500", text: "text-teal-400", border: "border-teal-500/20", lightBg: "bg-teal-500/10" },
  { bg: "bg-violet-500", text: "text-violet-400", border: "border-violet-500/20", lightBg: "bg-violet-500/10" },
  { bg: "bg-cyan-500", text: "text-cyan-400", border: "border-cyan-500/20", lightBg: "bg-cyan-500/10" },
  { bg: "bg-indigo-500", text: "text-indigo-400", border: "border-indigo-500/20", lightBg: "bg-indigo-500/10" },
  { bg: "bg-amber-500", text: "text-amber-400", border: "border-amber-500/20", lightBg: "bg-amber-500/10" },
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

function formatRelativeDate(
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

  if (diffMins < 1) return locale === "de" ? "Gerade eben" : "Just now";
  if (diffMins < 60) return `${diffMins}m ${locale === "de" ? "her" : "ago"}`;
  if (diffHours < 24) return `${diffHours}h ${locale === "de" ? "her" : "ago"}`;
  if (diffDays === 1) return locale === "de" ? "Gestern" : "Yesterday";
  if (diffDays < 7) return `${diffDays}d ${locale === "de" ? "her" : "ago"}`;
  return date.toLocaleDateString(locale === "de" ? "de-DE" : "en-US", {
    month: "short",
    day: "numeric",
  });
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
      <Card className="bg-card border border-border/80 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-10 w-44 rounded-lg" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-card border border-border/80 rounded-2xl p-5 space-y-3 shadow-sm">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-2 w-full rounded-full" />
        </Card>
        <Card className="bg-card border border-border/80 rounded-2xl p-5 space-y-3 shadow-sm">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-2 w-full rounded-full" />
        </Card>
      </div>

      <div className="space-y-2 pt-1">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
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
    const checkouts = stats?.monthCheckouts || [];
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
        className="h-[88dvh] max-h-[88dvh] w-full bg-card text-card-foreground rounded-t-[32px] border-t border-border shadow-2xl flex flex-col overflow-hidden sm:h-[750px] sm:max-h-[85vh] sm:w-full sm:max-w-xl sm:rounded-3xl sm:border p-0 gap-0"
      >
        {/* Zone 1: Header Zone (shrink-0) */}
        <div className="shrink-0 bg-muted/20 border-b border-border/60">
          <DialogHeader className="p-4 sm:p-6 pb-2.5 space-y-3">
            {/* Title row */}
            <div className="flex items-center justify-between gap-3 pr-10 sm:pr-8">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shrink-0 shadow-xs">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
                    {kitchenName} {t.pulse.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {t.pulse.subtitle}
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Controls row: Date navigation + Export & Refresh */}
            <div className="flex items-center justify-between gap-2">
              {/* Month navigation: Compact pill with prev/next arrows and month label */}
              <div className="flex items-center bg-card border border-border/80 rounded-xl p-0.5 shadow-xs">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handlePrevMonth}
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                  title={t.pulse.previousMonth}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="px-2 sm:px-2.5 py-1 text-xs font-mono font-semibold text-foreground hover:bg-muted/60 rounded-lg flex items-center gap-1.5 cursor-pointer transition select-none"
                    >
                      <Calendar className="w-3 h-3 text-primary shrink-0" />
                      <span className="capitalize">{monthDisplayLabel}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 max-h-64 overflow-y-auto">
                    {recentMonths.map((m) => (
                      <DropdownMenuItem
                        key={m.key}
                        onClick={() => setSelectedMonthKey(m.key)}
                        className={cn(
                          "text-xs capitalize cursor-pointer",
                          m.key === selectedMonthKey && "font-bold text-primary bg-primary/10"
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
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
                  title={t.pulse.nextMonth}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Actions: Export and Refresh icon buttons grouped cleanly on the right with gap-1.5 */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExportCsv}
                  disabled={isExporting || isLoading}
                  className="h-8 rounded-xl text-xs font-semibold px-2.5 sm:px-3 gap-1.5 border-border/80 hover:bg-muted/70 cursor-pointer shadow-xs"
                  title={t.pulse.csvExportBtn}
                >
                  <Download className="w-3.5 h-3.5 text-primary" />
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
                  className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 shrink-0 cursor-pointer"
                  title={t.pulse.refresh}
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Segmented Control Sub-navigation */}
          <div className="w-full px-4 sm:px-6 shrink-0">
            <div
              role="tablist"
              aria-label="Pulse navigation"
              className="w-full grid grid-cols-3 p-1 bg-secondary/50 rounded-2xl mb-4 gap-1 shrink-0"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "spending"}
                onClick={() => setActiveTab("spending")}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-2 px-1 text-xs font-semibold rounded-xl transition-all text-center truncate cursor-pointer",
                  activeTab === "spending"
                    ? "bg-card text-foreground shadow-sm border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 border border-transparent"
                )}
              >
                <CreditCard className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                <span className="truncate">{t.pulse.tabSpendBalance}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "pantry"}
                onClick={() => setActiveTab("pantry")}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-2 px-1 text-xs font-semibold rounded-xl transition-all text-center truncate cursor-pointer",
                  activeTab === "pantry"
                    ? "bg-card text-foreground shadow-sm border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 border border-transparent"
                )}
              >
                <Package className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span className="truncate">{t.pulse.tabBasicsHealth}</span>
                {depletedCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-mono rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 shrink-0 shadow-xs">
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
                  "flex items-center justify-center gap-1.5 py-2 px-1 text-xs font-semibold rounded-xl transition-all text-center truncate cursor-pointer",
                  activeTab === "activity"
                    ? "bg-card text-foreground shadow-sm border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 border border-transparent"
                )}
              >
                <Clock className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                <span className="truncate">{t.pulse.tabRestockFeed}</span>
                {feedCheckoutsCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-mono rounded-full bg-muted text-muted-foreground border border-border/80 shrink-0">
                    {feedCheckoutsCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Zone 2: Scrollable Content Zone (flex-1 min-h-0 overflow-y-auto) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-2 space-y-4 overscroll-contain">
          {isLoading ? (
            <SpacePulseModalSkeleton />
          ) : !stats ? (
            <Card className="bg-card border border-border/80 rounded-2xl p-6 text-center space-y-3 shadow-sm">
              <div className="w-10 h-10 mx-auto rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                <AlertCircle className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-sm font-semibold text-foreground">{t.pulse.couldNotLoad}</p>
              <p className="text-xs text-muted-foreground">{t.pulse.networkError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadData(true, selectedMonthKey)}
                className="rounded-full text-xs h-8 px-4 border-border cursor-pointer"
              >
                {t.pulse.retry}
              </Button>
            </Card>
          ) : (
            <>
              {/* SUB-TAB 1: Ausgaben & Saldo */}
              {activeTab === "spending" && (
                <div className="space-y-5 animate-in fade-in-50 duration-200">
                  {/* Honest Empty State if zero checkouts exist for the period */}
                  {stats.totalReceiptsCount === 0 && stats.totalSpendCurrentMonth === 0 ? (
                    <Card className="bg-card border border-border/80 rounded-2xl p-8 text-center space-y-4 shadow-sm">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-muted/70 border border-border/80 flex items-center justify-center text-muted-foreground shadow-xs">
                        <CreditCard className="w-6 h-6 text-primary" />
                      </div>
                      <div className="space-y-1.5 max-w-md mx-auto">
                        <h3 className="text-base font-bold text-foreground">
                          {t.pulse.emptyMonthTitle}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {t.pulse.emptyMonthSub}
                        </p>
                      </div>
                      <div className="pt-2">
                        <Button
                          type="button"
                          onClick={() => {
                            if (onStartShoppingRun) {
                              onStartShoppingRun();
                            } else {
                              onOpenChange(false);
                            }
                          }}
                          className="rounded-xl text-xs font-semibold h-9 px-5 gap-2 cursor-pointer shadow-sm"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>{t.pulse.startShoppingRun}</span>
                        </Button>
                      </div>
                    </Card>
                  ) : (
                    <>
                      {/* Hero Spend Total Card */}
                      <Card className="bg-card border border-border/80 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-cyan-400" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                              {t.pulse.monthlySpend}
                            </span>
                          </div>
                          <Badge
                            variant="secondary"
                            className="bg-muted text-muted-foreground text-xs font-mono rounded-full px-2.5 capitalize"
                          >
                            {monthDisplayLabel}
                          </Badge>
                        </div>

                        <div className="flex items-baseline gap-2.5 sm:gap-3 flex-wrap">
                          <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight font-mono">
                            {formatCurrency(stats.totalSpendCurrentMonth, currency)}
                          </span>

                          {/* Month-over-month Trend Indicator */}
                          {stats.spendTrendDirection === "down" && (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono gap-1 rounded-full px-2.5">
                              <TrendingDown className="w-3 h-3 text-emerald-400" />
                              <span>-{stats.spendTrendPercentage}% {t.pulse.vsLastMonth}</span>
                            </Badge>
                          )}

                          {stats.spendTrendDirection === "up" && (
                            <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono gap-1 rounded-full px-2.5">
                              <TrendingUp className="w-3 h-3 text-amber-400" />
                              <span>+{stats.spendTrendPercentage}% {t.pulse.vsLastMonth}</span>
                            </Badge>
                          )}

                          {stats.spendTrendDirection === "flat" && (
                            <Badge
                              variant="secondary"
                              className="text-xs font-mono bg-muted text-muted-foreground border border-border gap-1 rounded-full px-2.5"
                            >
                              <Minus className="w-3 h-3" />
                              <span>0% {t.pulse.vsLastMonth}</span>
                            </Badge>
                          )}

                          {stats.spendTrendDirection === "new" && (
                            <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs font-mono gap-1 rounded-full px-2.5">
                              <Sparkles className="w-3 h-3" />
                              <span>{t.pulse.firstMonth}</span>
                            </Badge>
                          )}
                        </div>

                        {/* Comparison note & quick stats */}
                        <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border/60">
                          <span>{t.pulse.prevMonthSpend}:</span>
                          <span className="font-mono font-medium text-foreground">
                            {formatCurrency(stats.totalSpendPreviousMonth, currency)}
                          </span>
                        </div>
                      </Card>

                      {/* Personal Impact & Settlement Balance */}
                      <Card className="bg-card border border-border/80 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-indigo-400" />
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                              {t.pulse.myImpact}
                            </h4>
                          </div>
                          {stats.userReceiptsCount > 0 && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-2 py-0.5 font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full shrink-0"
                            >
                              {stats.userHabitRole.roleTitle}
                            </Badge>
                          )}
                        </div>

                        {stats.userReceiptsCount === 0 &&
                        stats.userSpend === 0 &&
                        (!stats.userSettlement || stats.userSettlement.pendingRefundAmount === 0) ? (
                          <div className="py-5 px-4 rounded-xl bg-muted/20 border border-dashed border-border/70 text-center space-y-1">
                            <p className="text-xs font-semibold text-foreground">
                              {t.pulse.noCheckoutsLogged}
                            </p>
                            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                              {t.pulse.noCheckoutsLoggedDesc}
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-3.5 rounded-xl bg-indigo-500/[0.04] border border-indigo-500/20 space-y-1">
                              <span className="text-[11px] text-muted-foreground">{t.pulse.personalSpend}</span>
                              <div className="text-lg font-bold font-mono text-indigo-400">
                                {formatCurrency(stats.userSpend, currency)}
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {t.pulse.totalSpendShare.replace("{percentage}", String(stats.userSpendSharePercentage))}
                              </span>
                            </div>

                            <div className="p-3.5 rounded-xl bg-cyan-500/[0.04] border border-cyan-500/20 space-y-1">
                              <span className="text-[11px] text-muted-foreground">{t.pulse.personalRuns}</span>
                              <div className="text-lg font-bold font-mono text-cyan-400">
                                {stats.userReceiptsCount}{" "}
                                <span className="text-xs font-normal text-muted-foreground">
                                  / {stats.totalReceiptsCount}
                                </span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {t.pulse.householdRunsShare.replace("{percentage}", String(stats.userHabitRole.runPercentage))}
                              </span>
                            </div>

                            <div className="p-3.5 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20 space-y-1">
                              <span className="text-[11px] text-muted-foreground">{t.pulse.settlementStatus}</span>
                              <div className="text-lg font-bold font-mono">
                                {stats.userSettlement.pendingRefundAmount > 0 ? (
                                  <span className="text-amber-400">
                                    +{formatCurrency(stats.userSettlement.pendingRefundAmount, currency)}
                                  </span>
                                ) : (
                                  <span className="text-emerald-400">{t.pulse.balanced}</span>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {stats.userSettlement.pendingRefundAmount > 0
                                  ? t.pulse.owedToYou.replace("{count}", String(stats.userSettlement.pendingRefundsCount))
                                  : t.pulse.allRefundsSettled}
                              </span>
                            </div>
                          </div>
                        )}
                      </Card>

                      {/* Top Restocker & Member Roster Spend */}
                      <Card className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                              {t.pulse.memberRosterTitle.replace("{count}", String(stats.memberRoster?.length || 0))}
                            </h4>
                          </div>
                          {stats.topRestocker && (
                            <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium gap-1 rounded-full px-2.5">
                              <Crown className="w-3 h-3 text-amber-400" />
                              <span>{t.pulse.topRestockerBadge}</span>
                            </Badge>
                          )}
                        </div>

                        {/* Top Restocker Highlight if present */}
                        {stats.topRestocker && (
                          <div className="p-3.5 rounded-xl bg-amber-500/[0.05] border border-amber-500/25 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                                <Crown className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-foreground truncate">
                                  {stats.topRestocker.name}
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  {t.pulse.topRestockerDesc.replace("{count}", String(stats.topRestocker.runCount))}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-mono font-bold text-sm text-amber-400">
                                {formatCurrency(stats.topRestocker.spend, currency)}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Member Roster List */}
                        {stats.memberRoster && stats.memberRoster.length > 0 && (
                          <div className="divide-y divide-border/60">
                            {stats.memberRoster.map((member) => {
                              const sharePct =
                                stats.totalSpendCurrentMonth > 0
                                  ? Math.round((member.spend / stats.totalSpendCurrentMonth) * 100)
                                  : 0;

                              return (
                                <div
                                  key={member.userId}
                                  className="py-2.5 flex items-center justify-between gap-3 text-sm"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-7 h-7 rounded-full bg-muted border border-border/80 flex items-center justify-center text-xs font-semibold text-foreground shrink-0 uppercase">
                                      {member.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-medium text-foreground truncate flex items-center gap-1.5">
                                        <span>{member.name}</span>
                                        {member.isTopRestocker && (
                                          <Crown className="w-3 h-3 text-amber-400" />
                                        )}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground">
                                        {member.runCount} {member.runCount === 1 ? t.pulse.runSingular : t.pulse.runPlural} · {sharePct}%
                                      </div>
                                    </div>
                                  </div>

                                  <div className="font-mono font-bold text-sm text-foreground shrink-0">
                                    {formatCurrency(member.spend, currency)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </Card>

                      {/* Merchant Breakdown with Stacked Horizontal Progress Bar */}
                      <Card className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Store className="w-4 h-4 text-muted-foreground" />
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                              {t.pulse.merchantBreakdown}
                            </h4>
                          </div>
                          <span className="text-xs font-mono text-muted-foreground">
                            {stats.categoryBreakdown.length}{" "}
                            {stats.categoryBreakdown.length === 1
                              ? t.pulse.storeSingular
                              : t.pulse.storePlural}
                          </span>
                        </div>

                        {stats.categoryBreakdown.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-4 text-center">
                            {t.pulse.noMerchantData}
                          </p>
                        ) : (
                          <div className="space-y-4 pt-1">
                            {/* Stacked Horizontal Progress Bar with subtle accent colors */}
                            <div className="w-full h-3 bg-muted/60 rounded-full overflow-hidden flex p-0.5 gap-0.5 shadow-inner">
                              {stats.categoryBreakdown.map((store, idx) => {
                                const accent = STORE_ACCENTS[idx % STORE_ACCENTS.length];
                                return (
                                  <div
                                    key={store.name}
                                    title={`${store.name === "Sonstige" ? t.pulse.otherStore : store.name}: ${store.percentage}% (${formatCurrency(store.amount, currency)})`}
                                    className={cn(
                                      "h-full rounded-sm transition-all duration-300 first:rounded-l-full last:rounded-r-full",
                                      accent.bg
                                    )}
                                    style={{ width: `${Math.max(store.percentage, 2)}%` }}
                                  />
                                );
                              })}
                            </div>

                            {/* Itemized Store List */}
                            <div className="space-y-2.5 pt-1">
                              {stats.categoryBreakdown.map((store, idx) => {
                                const accent = STORE_ACCENTS[idx % STORE_ACCENTS.length];
                                const displayName =
                                  store.name === "Sonstige" ? t.pulse.otherStore : store.name;

                                return (
                                  <div
                                    key={store.name}
                                    className="flex items-center justify-between text-xs py-1 hover:bg-muted/30 px-2 rounded-xl transition"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                      <span
                                        className={cn(
                                          "w-2.5 h-2.5 rounded-full shrink-0",
                                          accent.bg
                                        )}
                                      />
                                      <span className="font-medium text-foreground truncate max-w-[60%]">
                                        {displayName}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">
                                        ({store.count}{" "}
                                        {store.count === 1
                                          ? t.pulse.runSingular
                                          : t.pulse.runPlural}
                                        )
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="font-mono text-foreground font-medium">
                                        {formatCurrency(store.amount, currency)}
                                      </span>
                                      <Badge
                                        variant="secondary"
                                        className={cn(
                                          "text-[10px] font-mono px-2 py-0 rounded-full border",
                                          accent.lightBg,
                                          accent.text,
                                          accent.border
                                        )}
                                      >
                                        {store.percentage}%
                                      </Badge>
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
                  {/* Stock Health Banner: (total_staples - depleted_staples) / total_staples * 100 */}
                  <Card className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                          {t.pulse.inventoryHealth}
                        </h4>
                      </div>
                      {stats.pantryStockRatio.outOfStock > 0 ? (
                        <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium gap-1 rounded-full px-2.5">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          <span>
                            {t.pulse.depletedCount.replace(
                              "{count}",
                              String(stats.pantryStockRatio.outOfStock)
                            )}
                          </span>
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium gap-1 rounded-full px-2.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>{t.pulse.fullyStocked}</span>
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-3xl font-extrabold text-foreground font-mono">
                          {stats.pantryStockRatio.inStockPercentage}%
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">
                          {t.pulse.stockSummary
                            .replace("{inStock}", String(stats.pantryStockRatio.inStock))
                            .replace("{outOfStock}", String(stats.pantryStockRatio.outOfStock))}
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden p-0.5">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                          style={{ width: `${stats.pantryStockRatio.inStockPercentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border/60">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{t.pulse.restockResponseTime}:</span>
                      </div>
                      <span className="font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-xs">
                        {stats.vitals.compactRestockLatency ||
                          stats.vitals.formattedRestockLatency ||
                          t.pulse.instant}
                      </span>
                    </div>
                  </Card>

                  {/* Depleted Essentials with time since marked empty */}
                  <Card className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                          {t.pulse.depletedNeedingRestock}
                        </h4>
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-xs font-mono bg-muted text-muted-foreground border border-border rounded-full px-2.5"
                      >
                        {stats.depletedEssentials?.length || 0}
                      </Badge>
                    </div>

                    {!stats.depletedEssentials || stats.depletedEssentials.length === 0 ? (
                      <div className="py-6 text-center space-y-2">
                        <div className="w-10 h-10 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <p className="text-xs font-medium text-foreground">
                          {t.pulse.allStaplesInStock}
                        </p>
                        <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                          {t.pulse.allStaplesInStockDesc}
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/60">
                        {stats.depletedEssentials.map((item) => (
                          <div
                            key={item.id}
                            className="py-2.5 flex items-center justify-between gap-3 text-sm hover:bg-muted/40 px-2 rounded-xl transition"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-xs shrink-0" />
                              <span className="font-medium text-foreground truncate">
                                {item.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[11px] text-muted-foreground">
                                {formatTimeSinceEmpty(item.updated_at || item.created_at, locale)}
                              </span>
                              <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono px-2.5 py-0.5 rounded-full">
                                {t.pulse.depleted}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Untouched / Idle Staples using pantry_items.updated_at */}
                  {stats.idleStaples && stats.idleStaples.length > 0 && (
                    <Card className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                              {t.pulse.untouchedStaplesSub}
                            </h4>
                            <p className="text-[11px] text-muted-foreground">
                              {t.pulse.untouchedStaplesDesc}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {stats.idleStaples.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/70 text-xs"
                          >
                            <span className="font-medium text-foreground truncate max-w-[65%]">
                              {item.name}
                            </span>
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-mono bg-muted text-muted-foreground rounded-full px-2"
                            >
                              {t.pulse.idleDays.replace("{days}", String(item.idle_days))}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {/* SUB-TAB 3: Einkaufs-Feed */}
              {activeTab === "activity" && (
                <div className="space-y-4 animate-in fade-in-50 duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-indigo-400" />
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                        {t.pulse.recentRestocks}
                      </h4>
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-xs font-mono bg-muted text-muted-foreground border border-border rounded-full px-2.5"
                    >
                      {t.pulse.logsCount.replace(
                        "{count}",
                        String(stats.monthCheckouts?.length || 0)
                      )}
                    </Badge>
                  </div>

                  {!stats.monthCheckouts || stats.monthCheckouts.length === 0 ? (
                    <Card className="bg-card border border-border/80 rounded-2xl p-8 text-center space-y-3 shadow-sm">
                      <div className="w-10 h-10 mx-auto rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                        <ShoppingBag className="w-5 h-5 text-indigo-400" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {t.pulse.noRecentRestocks}
                      </p>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        {t.pulse.noRecentRestocksDesc}
                      </p>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {stats.monthCheckouts.map((checkout) => {
                        const itemsCount = checkout.items?.length || 0;
                        const hasReceipt = Boolean(
                          checkout.receipt_filename ||
                            (checkout.receipts && checkout.receipts.length > 0)
                        );
                        const storeName =
                          checkout.store_name === "Sonstige"
                            ? t.pulse.otherStore
                            : checkout.store_name;

                        return (
                          <Card
                            key={checkout.id}
                            className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 hover:border-border transition"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-0.5 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm text-foreground truncate">
                                    {storeName || t.pulse.generalRestock}
                                  </span>
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] font-mono bg-muted text-muted-foreground px-2 py-0 rounded-full"
                                  >
                                    {t.pulse.paidBy.replace("{name}", checkout.paid_by_name)}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <span>{formatRelativeDate(checkout.created_at, locale)}</span>
                                  <span>·</span>
                                  <span>{formatShortDate(checkout.created_at, locale)}</span>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="font-mono font-bold text-sm text-foreground">
                                  {formatCurrency(
                                    checkout.total_claimed_amount,
                                    checkout.currency || currency
                                  )}
                                </div>
                                <div className="flex items-center gap-1 justify-end pt-1">
                                  {checkout.is_refunded ? (
                                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono px-2 py-0 rounded-full">
                                      {t.pulse.settled}
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono px-2 py-0 rounded-full">
                                      {t.pulse.pending}
                                    </Badge>
                                  )}
                                  {hasReceipt && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0 rounded-full"
                                      title={t.pulse.receiptAttached}
                                    >
                                      <FileText className="w-2.5 h-2.5" />
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Restocked Items */}
                            {itemsCount > 0 && (
                              <div className="pt-2 border-t border-border/60">
                                <div className="text-[11px] font-medium text-muted-foreground mb-1.5 flex items-center justify-between">
                                  <span>
                                    {t.pulse.itemsRestocked.replace("{count}", String(itemsCount))}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {checkout.items.slice(0, 6).map((item) => (
                                    <span
                                      key={item.id}
                                      className="inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full bg-muted/80 text-foreground border border-border/80"
                                    >
                                      {item.name}
                                    </span>
                                  ))}
                                  {itemsCount > 6 && (
                                    <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground">
                                      {t.pulse.moreItems.replace("{count}", String(itemsCount - 6))}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Note if present */}
                            {checkout.note && (
                              <p className="text-xs text-muted-foreground italic bg-muted/30 p-2.5 rounded-xl border border-border/40">
                                &ldquo;{checkout.note}&rdquo;
                              </p>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Zone 3: Sticky Footer Zone (shrink-0) */}
        <div className="shrink-0 border-t border-border/40 bg-card/90 backdrop-blur-md px-4 sm:px-6 pt-3 pb-8">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            className="h-11 w-full rounded-xl bg-secondary font-semibold text-sm hover:bg-secondary/80 text-foreground transition-colors cursor-pointer shadow-xs flex items-center justify-center"
          >
            {t.pulse.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SpacePulseModal;
