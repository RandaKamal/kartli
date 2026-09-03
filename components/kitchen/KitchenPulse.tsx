"use client";

import { useState, useEffect, useRef } from "react";
import type { KitchenPulseStats } from "@/lib/actions/stats";
import { getKitchenStats } from "@/lib/actions/stats";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  Download,
  TrendingDown,
  TrendingUp,
  Minus,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { toPng } from "html-to-image";

interface KitchenPulseProps {
  kitchenId: string;
  kitchenName: string;
  currentUserId: string;
  initialStats?: KitchenPulseStats;
}

export function KitchenPulseSkeleton() {
  return (
    <div className="w-full space-y-4 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between gap-4 pb-1 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-xl" />
          <Skeleton className="h-5 w-28 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-44 rounded-xl" />
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-9 w-9 rounded-xl" />
        </div>
      </div>

      {/* Hero 2-Col Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-border bg-card rounded-2xl p-5 shadow-xs space-y-3">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-8 w-36 rounded-lg" />
        </Card>
        <Card className="border border-border bg-card rounded-2xl p-5 shadow-xs space-y-3">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-1.5 w-full rounded" />
        </Card>
      </div>

      {/* Vitals Bento Skeleton */}
      <Card className="border border-border bg-card rounded-2xl p-5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </Card>

      {/* Distribution Skeleton */}
      <Card className="border border-border bg-card rounded-2xl p-5 shadow-xs space-y-3">
        <Skeleton className="h-4 w-36 rounded" />
        <Skeleton className="h-6 w-full rounded-lg" />
        <Skeleton className="h-6 w-full rounded-lg" />
      </Card>
    </div>
  );
}

export function KitchenPulse({
  kitchenId,
  kitchenName,
  currentUserId,
  initialStats,
}: KitchenPulseProps) {
  const [stats, setStats] = useState<KitchenPulseStats | null>(initialStats || null);
  const [activeView, setActiveView] = useState<"kitchen" | "personal">("kitchen");
  const [isLoading, setIsLoading] = useState(!initialStats);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showAllStores, setShowAllStores] = useState(false);

  const exportCardRef = useRef<HTMLDivElement>(null);

  const fetchStats = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await getKitchenStats(kitchenId, currentUserId);
      setStats(data);
      if (isManualRefresh) {
        toast.success("Pulse updated.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load pulse.";
      toast.error(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!initialStats) {
      fetchStats();
    }
  }, [kitchenId, currentUserId]);

  const handleExport = async () => {
    if (!exportCardRef.current || !stats) {
      toast.error("Unable to generate summary right now.");
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading("Generating pulse snapshot...");

    try {
      await new Promise((resolve) => setTimeout(resolve, 150));

      const dataUrl = await toPng(exportCardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0d0f14",
      });

      const safeKitchenName = kitchenName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const filename = `kartli-pulse-${safeKitchenName}-${stats.monthKey}.png`;

      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      link.click();

      toast.success("Pulse summary exported.", { id: toastId });
    } catch (error) {
      console.error("Export pulse failed:", error);
      toast.error("Export failed. Please try again.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return <KitchenPulseSkeleton />;
  }

  if (!stats) {
    return (
      <Card className="border border-border bg-card rounded-2xl p-6 text-center shadow-xs">
        <p className="text-xs text-muted-foreground">Unable to load pulse analytics.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchStats(true)}
          className="mt-3 rounded-xl text-xs h-8"
        >
          Try Again
        </Button>
      </Card>
    );
  }

  const {
    monthLabel,
    currency,
    totalSpendCurrentMonth,
    spendTrendPercentage,
    spendTrendDirection,
    categoryBreakdown,
    userSpend,
    userSpendSharePercentage,
    userReceiptsCount,
    totalReceiptsCount,
    userAverageContribution,
    userCategoryFootprint,
    vitals,
    allTopItems,
    pantryStockRatio,
    deadStockItems,
    hasData,
  } = stats;

  const visibleStores = showAllStores
    ? categoryBreakdown
    : categoryBreakdown.slice(0, 4);

  const attentionDeadStock = deadStockItems.length > 0 ? deadStockItems[0] : null;

  return (
    <div className="w-full space-y-4 animate-in fade-in-50 duration-200">
      {/* 1. Header Area: Clean title, month pill, segmented control, icon actions */}
      <div className="flex items-center justify-between gap-3 pb-1 border-b border-border/40">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-foreground tracking-tight">Pulse</h2>
          <Badge
            variant="secondary"
            className="bg-muted text-muted-foreground text-[10px] font-mono uppercase px-2 py-0.5 rounded-md"
          >
            {monthLabel}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Segmented Control: [ Kitchen | My Impact ] */}
          <div className="inline-flex bg-muted/80 border border-border p-0.5 rounded-xl h-9 shadow-xs">
            <button
              type="button"
              onClick={() => setActiveView("kitchen")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                activeView === "kitchen"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={activeView === "kitchen"}
            >
              Kitchen
            </button>

            <button
              type="button"
              onClick={() => setActiveView("personal")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${
                activeView === "personal"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={activeView === "personal"}
            >
              <span>My Impact</span>
              {userSpendSharePercentage > 0 && (
                <span className="text-[10px] font-mono text-accent-primary">
                  {userSpendSharePercentage}%
                </span>
              )}
            </button>
          </div>

          {/* Refresh Action */}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => fetchStats(true)}
            disabled={isRefreshing}
            className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>

          {/* Export Action */}
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={handleExport}
            disabled={isExporting}
            className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted border-border"
            title="Export pulse summary"
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {!hasData ? (
        <Card className="border border-border bg-card rounded-2xl p-8 text-center shadow-xs space-y-2">
          <div className="w-10 h-10 mx-auto rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">No purchases this month</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Metrics and inventory vitals will populate as receipts and checkouts are logged.
          </p>
        </Card>
      ) : (
        <>
          {/* TAB 1: Kitchen Overview */}
          {activeView === "kitchen" && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              {/* Hero Row: 2-Column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Total Spent */}
                <Card className="border border-border bg-card rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Total Spent</span>

                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight font-mono">
                      {formatCurrency(totalSpendCurrentMonth, currency)}
                    </span>

                    {spendTrendDirection === "down" && (
                      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-500 font-mono">
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span>-{spendTrendPercentage}% vs last month</span>
                      </span>
                    )}

                    {spendTrendDirection === "up" && (
                      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-500 font-mono">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>+{spendTrendPercentage}% vs last month</span>
                      </span>
                    )}

                    {spendTrendDirection === "flat" && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground font-mono">
                        <Minus className="w-3 h-3" />
                        <span>0% vs last month</span>
                      </span>
                    )}

                    {spendTrendDirection === "new" && (
                      <span className="text-xs text-accent-primary font-mono">
                        First month
                      </span>
                    )}
                  </div>
                </Card>

                {/* Right: Pantry Health */}
                <Card className="border border-border bg-card rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Pantry Health</span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {pantryStockRatio.inStock} in stock · {pantryStockRatio.outOfStock} needed
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono">
                      {pantryStockRatio.inStockPercentage}%
                    </div>

                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-primary rounded-full transition-all duration-500"
                        style={{ width: `${pantryStockRatio.inStockPercentage}%` }}
                      />
                    </div>
                  </div>
                </Card>
              </div>

              {/* Vitals Row: Single 3-Column Bento Card */}
              <Card className="border border-border bg-card rounded-2xl shadow-xs overflow-hidden">
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
                  {/* Metric 1: Avg. Ticket */}
                  <div className="p-4 sm:p-5 space-y-1">
                    <span className="text-xs font-medium text-muted-foreground block">
                      Avg. Ticket
                    </span>
                    <div className="text-xl sm:text-2xl font-bold text-foreground font-mono">
                      {formatCurrency(vitals.averageBasketSize, currency)}
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono block">
                      {totalReceiptsCount} {totalReceiptsCount === 1 ? "receipt" : "receipts"}
                    </span>
                  </div>

                  {/* Metric 2: Restock Speed (Compact, No Overflow) */}
                  <div className="p-4 sm:p-5 space-y-1">
                    <span className="text-xs font-medium text-muted-foreground block">
                      Restock Speed
                    </span>
                    <div className="text-xl sm:text-2xl font-bold text-foreground font-mono">
                      {vitals.compactRestockLatency || "—"}
                    </div>
                    <span className="text-[11px] text-muted-foreground block">
                      Avg. restock time
                    </span>
                  </div>

                  {/* Metric 3: Idle Stock */}
                  <div className="p-4 sm:p-5 space-y-1 min-w-0">
                    <span className="text-xs font-medium text-muted-foreground block">
                      Idle Stock
                    </span>
                    <div className="text-xl sm:text-2xl font-bold text-foreground truncate" title={attentionDeadStock ? attentionDeadStock.name : "None"}>
                      {attentionDeadStock ? attentionDeadStock.name : "None"}
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono block">
                      {attentionDeadStock ? `${attentionDeadStock.idleDays}d inactive` : "Pantry in motion"}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Spending Distribution Card */}
              <Card className="border border-border bg-card rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Spending Distribution
                  </h3>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {categoryBreakdown.length} {categoryBreakdown.length === 1 ? "bucket" : "buckets"}
                  </span>
                </div>

                {categoryBreakdown.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">
                    No store spending categorized yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {visibleStores.map((store) => (
                      <div key={store.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground truncate max-w-[55%]">
                            {store.name}
                          </span>
                          <span className="font-mono text-muted-foreground shrink-0">
                            {formatCurrency(store.amount, currency)}{" "}
                            <span className="text-foreground/80 font-bold ml-1">
                              {store.percentage}%
                            </span>
                          </span>
                        </div>

                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent-primary/80 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(store.percentage, 2)}%` }}
                          />
                        </div>
                      </div>
                    ))}

                    {categoryBreakdown.length > 4 && (
                      <div className="pt-1 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAllStores(!showAllStores)}
                          className="rounded-xl text-xs text-muted-foreground hover:text-foreground h-7 gap-1 cursor-pointer"
                        >
                          {showAllStores ? (
                            <>
                              <ChevronUp className="w-3.5 h-3.5" />
                              <span>Show Top 4</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3.5 h-3.5" />
                              <span>Show All {categoryBreakdown.length}</span>
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB 2: My Impact */}
          {activeView === "personal" && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              {/* Hero Card: 2-Column Split */}
              <Card className="border border-border bg-card rounded-2xl p-5 shadow-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                  {/* Left: Your Contribution */}
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground block">
                      Your Contribution
                    </span>
                    <div className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono">
                      {formatCurrency(userSpend, currency)}
                    </div>
                  </div>

                  {/* Right: Your Share */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-muted-foreground">Your Share</span>
                      <span className="font-mono font-bold text-accent-primary">
                        {userSpendSharePercentage}% of kitchen spend
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-primary rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(userSpendSharePercentage, 2)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Personal Vitals: 3-Column Compact Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Box 1: Receipts Logged */}
                <Card className="border border-border bg-card rounded-2xl p-4 shadow-xs space-y-1">
                  <span className="text-xs font-medium text-muted-foreground block">
                    Receipts Logged
                  </span>
                  <div className="text-xl sm:text-2xl font-bold text-foreground font-mono">
                    {userReceiptsCount}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      of {totalReceiptsCount}
                    </span>
                  </div>
                </Card>

                {/* Box 2: Avg. per Trip */}
                <Card className="border border-border bg-card rounded-2xl p-4 shadow-xs space-y-1">
                  <span className="text-xs font-medium text-muted-foreground block">
                    Avg. per Trip
                  </span>
                  <div className="text-xl sm:text-2xl font-bold text-foreground font-mono">
                    {formatCurrency(userAverageContribution, currency)}
                  </div>
                </Card>

                {/* Box 3: Top Merchant */}
                <Card className="border border-border bg-card rounded-2xl p-4 shadow-xs space-y-1 min-w-0">
                  <span className="text-xs font-medium text-muted-foreground block">
                    Top Merchant
                  </span>
                  <div className="text-base sm:text-lg font-bold text-foreground truncate">
                    {userCategoryFootprint ? (
                      `${userCategoryFootprint.categoryName} · ${userCategoryFootprint.percentage}%`
                    ) : (
                      "None"
                    )}
                  </div>
                </Card>
              </div>

              {/* Top Items: Clean horizontal chips */}
              {allTopItems.length > 0 && (
                <Card className="border border-border bg-card rounded-2xl p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Most Purchased Supplies
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">Top 5</span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {allTopItems.map((item, index) => (
                      <span
                        key={item.name}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 border border-border text-xs"
                      >
                        <span className="font-mono text-muted-foreground font-medium">
                          #{index + 1}
                        </span>
                        <span className="font-semibold text-foreground">{item.name}</span>
                        <span className="font-mono text-muted-foreground">
                          {item.count}×
                        </span>
                      </span>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* Hidden Snapshot Export Card: Minimalist "kartli Wrapped" */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none" aria-hidden="true">
        <div
          ref={exportCardRef}
          style={{
            width: "560px",
            backgroundColor: "#0d0f14",
            color: "#f4f4f5",
            fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
          className="p-7 rounded-3xl border border-[#242b38] space-y-5 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#242b38] pb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white tracking-tight">kartli</span>
              <span className="text-[11px] font-mono uppercase text-[#94a3b8] px-2 py-0.5 rounded bg-[#1a202c]">
                Pulse
              </span>
            </div>
            <div className="text-right text-xs font-mono text-[#94a3b8]">
              {kitchenName} · {monthLabel}
            </div>
          </div>

          {/* Hero Row */}
          <div className="grid grid-cols-2 gap-4 bg-[#131720] border border-[#242b38] rounded-2xl p-5">
            <div className="space-y-1">
              <span className="text-[11px] text-[#94a3b8]">Total Spent</span>
              <div className="text-2xl font-bold font-mono text-white">
                {formatCurrency(totalSpendCurrentMonth, currency)}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] text-[#94a3b8]">Pantry Health</span>
              <div className="text-2xl font-bold font-mono text-[#c084fc]">
                {pantryStockRatio.inStockPercentage}%
              </div>
            </div>
          </div>

          {/* Vitals Row */}
          <div className="grid grid-cols-3 gap-3 bg-[#131720] border border-[#242b38] rounded-xl p-4 text-xs">
            <div>
              <span className="text-[#94a3b8] block text-[10px] uppercase">Avg. Ticket</span>
              <span className="font-bold font-mono text-white">
                {formatCurrency(vitals.averageBasketSize, currency)}
              </span>
            </div>
            <div>
              <span className="text-[#94a3b8] block text-[10px] uppercase">Restock Speed</span>
              <span className="font-bold font-mono text-white">
                {vitals.compactRestockLatency || "—"}
              </span>
            </div>
            <div>
              <span className="text-[#94a3b8] block text-[10px] uppercase">Idle Stock</span>
              <span className="font-bold text-white truncate block">
                {attentionDeadStock ? attentionDeadStock.name : "None"}
              </span>
            </div>
          </div>

          {/* Top Stores */}
          {categoryBreakdown.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider block">
                Top Merchants
              </span>
              <div className="space-y-1.5">
                {categoryBreakdown.slice(0, 3).map((item) => (
                  <div key={item.name} className="flex justify-between text-xs">
                    <span className="text-white">{item.name}</span>
                    <span className="font-mono text-[#94a3b8]">
                      {formatCurrency(item.amount, currency)} ({item.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-3 border-t border-[#242b38] flex items-center justify-between text-[10px] text-[#94a3b8]">
            <span>kartli • Shared Kitchen OS</span>
            <span>{new Date().toLocaleDateString("en-US", { dateStyle: "medium" })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
