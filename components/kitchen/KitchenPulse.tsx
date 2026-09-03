"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import type { KitchenPulseStats } from "@/lib/actions/stats";
import { getKitchenStats } from "@/lib/actions/stats";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  Download,
  TrendingDown,
  TrendingUp,
  Minus,
  ShoppingBag,
  Store,
  Receipt,
  Sparkles,
  RefreshCw,
  PieChart,
  UserCheck,
  PackageCheck,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
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
    <div className="w-full space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-44 rounded-xl" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-36 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      {/* Hero Card Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2 border border-border bg-card rounded-3xl p-6 shadow-sm space-y-4">
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-10 w-48 rounded-lg" />
          <Skeleton className="h-4 w-40 rounded" />
        </Card>
        <Card className="border border-border bg-card rounded-3xl p-6 shadow-sm space-y-4">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-3 w-full rounded" />
        </Card>
      </div>

      {/* Distribution & Highlights Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border bg-card rounded-3xl p-6 shadow-sm space-y-4">
          <Skeleton className="h-5 w-40 rounded" />
          <div className="space-y-3 pt-2">
            <Skeleton className="h-8 w-full rounded-xl" />
            <Skeleton className="h-8 w-full rounded-xl" />
            <Skeleton className="h-8 w-full rounded-xl" />
          </div>
        </Card>
        <Card className="border border-border bg-card rounded-3xl p-6 shadow-sm space-y-4">
          <Skeleton className="h-5 w-36 rounded" />
          <div className="grid grid-cols-1 gap-3 pt-2">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        </Card>
      </div>
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
  const [, startTransition] = useTransition();

  const exportCardRef = useRef<HTMLDivElement>(null);

  const fetchStats = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await getKitchenStats(kitchenId, currentUserId);
      setStats(data);
      if (isManualRefresh) {
        toast.success("Pulse analytics refreshed.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load kitchen pulse.";
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
    const toastId = toast.loading("Generating your Kitchen Pulse audit card...");

    try {
      // Small pause to allow styles and fonts to paint cleanly
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

      toast.success("Kitchen Pulse exported successfully!", { id: toastId });
    } catch (error) {
      console.error("Export pulse failed:", error);
      toast.error("Could not export snapshot. Please try again.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return <KitchenPulseSkeleton />;
  }

  if (!stats) {
    return (
      <Card className="border border-border bg-card rounded-3xl p-8 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">
          Could not load Kitchen Pulse analytics.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchStats(true)}
          className="mt-4 rounded-xl text-xs"
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
    topItem,
    allTopItems,
    pantryStockRatio,
    hasData,
  } = stats;

  const visibleStores = showAllStores
    ? categoryBreakdown
    : categoryBreakdown.slice(0, 4);

  return (
    <div className="w-full space-y-6 animate-in fade-in-50 duration-200">
      {/* Top Header & View Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-accent-primary/10 text-accent-primary">
              <Activity className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground tracking-tight">
                  Kitchen Pulse
                </h2>
                <Badge
                  variant="secondary"
                  className="bg-muted text-muted-foreground text-[10px] font-mono uppercase px-2 py-0.5"
                >
                  {monthLabel}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Progressive monthly analytics, spend distributions & pantry health.
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Segmented Control & Header Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Segmented control: [ Kitchen Overview | My Impact ] */}
          <div className="inline-flex bg-muted/80 border border-border p-1 rounded-2xl h-10 shadow-xs">
            <button
              type="button"
              onClick={() => setActiveView("kitchen")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-150 flex items-center gap-1.5 ${
                activeView === "kitchen"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={activeView === "kitchen"}
            >
              <PieChart className="w-3.5 h-3.5 text-accent-primary" />
              <span>Kitchen Overview</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("personal")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-150 flex items-center gap-1.5 ${
                activeView === "personal"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={activeView === "personal"}
            >
              <UserCheck className="w-3.5 h-3.5 text-accent-success" />
              <span>My Impact</span>
              {userSpendSharePercentage > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-mono rounded-full bg-accent-success/15 text-accent-success">
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
            className="h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>

          {/* Export Summary Action */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
            className="h-10 rounded-2xl text-xs font-medium gap-1.5 border-border hover:bg-secondary cursor-pointer shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5 text-accent-primary" />
            <span className="hidden sm:inline">Export Summary</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>
      </div>

      {/* Fallback Empty State: When no purchases or data logged this month */}
      {!hasData ? (
        <Card className="border border-border/80 bg-card/60 backdrop-blur-xs rounded-3xl p-8 sm:p-12 text-center shadow-sm space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-accent-primary">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-bold text-foreground tracking-tight">
              Fresh Month, Fresh Pulse
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              No grocery checkouts or receipts have been recorded for{" "}
              <span className="font-semibold text-foreground">{monthLabel}</span> yet.
              Once your household checks out cart items or uploads receipts,
              dynamic spending distributions and restock trends will appear here.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-2">
            <Badge variant="secondary" className="text-xs font-mono py-1 px-3">
              Pantry items tracked: {pantryStockRatio.total}
            </Badge>
          </div>
        </Card>
      ) : (
        <>
          {/* TAB 1: Kitchen Overview */}
          {activeView === "kitchen" && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              {/* Hero Metric & Pantry Quick-Health Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
                {/* Hero Metric: Total Monthly Spend */}
                <Card className="md:col-span-2 border border-border bg-card rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-accent-primary/5 rounded-full blur-2xl pointer-events-none -mr-12 -mt-12" />

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Total Monthly Spend
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {totalReceiptsCount} {totalReceiptsCount === 1 ? "receipt" : "receipts"} logged
                      </span>
                    </div>

                    <div className="flex items-baseline gap-3 pt-1 flex-wrap">
                      <h3 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight font-mono">
                        {formatCurrency(totalSpendCurrentMonth, currency)}
                      </h3>

                      {/* Subtle Delta Trend Badge */}
                      {spendTrendDirection === "down" && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <TrendingDown className="w-3.5 h-3.5" />
                          <span>↓ {spendTrendPercentage}% vs last month</span>
                        </span>
                      )}

                      {spendTrendDirection === "up" && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>↑ {spendTrendPercentage}% vs last month</span>
                        </span>
                      )}

                      {spendTrendDirection === "flat" && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                          <Minus className="w-3 h-3" />
                          <span>Consistent with last month</span>
                        </span>
                      )}

                      {spendTrendDirection === "new" && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-accent-primary/15 text-accent-primary border border-accent-primary/20">
                          <Sparkles className="w-3 h-3" />
                          <span>First month tracked</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/50 mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Previous month:{" "}
                      <strong className="text-foreground font-mono">
                        {formatCurrency(stats.totalSpendPreviousMonth, currency)}
                      </strong>
                    </span>
                    <span>Current period: {monthLabel}</span>
                  </div>
                </Card>

                {/* Pantry Health Card */}
                <Card className="border border-border bg-card rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Pantry Health
                      </span>
                      <PackageCheck className="w-4 h-4 text-accent-success" />
                    </div>

                    <div className="pt-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-foreground font-mono">
                          {pantryStockRatio.inStockPercentage}%
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">in stock</span>
                      </div>

                      {/* Stock Progress Bar */}
                      <div className="w-full h-2 bg-muted rounded-full mt-3 overflow-hidden">
                        <div
                          className="h-full bg-accent-success rounded-full transition-all duration-500"
                          style={{ width: `${pantryStockRatio.inStockPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground flex items-center justify-between">
                    <span>
                      <strong className="text-foreground">{pantryStockRatio.inStock}</strong> ready
                    </span>
                    <span>
                      <strong className="text-foreground">{pantryStockRatio.outOfStock}</strong> needed
                    </span>
                  </div>
                </Card>
              </div>

              {/* Kitchen Vibe Insights Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Insight 1: Top Restock / Purchase Item */}
                <Card className="border border-border bg-card rounded-3xl p-5 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-accent-primary shrink-0">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Kitchen MVP Restock
                    </span>
                    <h4 className="text-base font-bold text-foreground truncate">
                      {topItem ? `${topItem.name} (${topItem.count}x)` : "No restocks logged yet"}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {topItem
                        ? "Most frequently replenished grocery item this month."
                        : "Mark items needed or check out to see kitchen staples."}
                    </p>
                  </div>
                </Card>

                {/* Insight 2: Household Vibe / Rhythm */}
                <Card className="border border-border bg-card rounded-3xl p-5 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Kitchen Vibe
                    </span>
                    <h4 className="text-base font-bold text-foreground truncate">
                      {pantryStockRatio.inStockPercentage >= 80
                        ? "Well-Stocked Sanctuary"
                        : pantryStockRatio.outOfStock > 2
                        ? "Restock Time Needed"
                        : "Smooth Flow"}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {categoryBreakdown.length > 0
                        ? `Expenses diversified across ${categoryBreakdown.length} ${categoryBreakdown.length === 1 ? "merchant" : "merchants"}.`
                        : "Household activity running smoothly."}
                    </p>
                  </div>
                </Card>
              </div>

              {/* Spending Distribution by Store / Category */}
              <Card className="border border-border bg-card rounded-3xl p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-accent-primary" />
                      <h3 className="text-base font-semibold text-foreground">
                        Spending Distribution
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Breakdown across stores and expense categories this month.
                    </p>
                  </div>

                  <Badge variant="secondary" className="text-xs font-mono">
                    {categoryBreakdown.length} {categoryBreakdown.length === 1 ? "bucket" : "buckets"}
                  </Badge>
                </div>

                {categoryBreakdown.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No store spending categorized yet.
                  </p>
                ) : (
                  <div className="space-y-4 pt-1">
                    {visibleStores.map((store, index) => (
                      <div key={store.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-foreground truncate">
                              {store.name}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              ({store.count} {store.count === 1 ? "item/checkout" : "checkouts"})
                            </span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-mono font-bold text-foreground">
                              {formatCurrency(store.amount, currency)}
                            </span>
                            <span className="font-mono text-muted-foreground w-9 text-right text-[11px]">
                              {store.percentage}%
                            </span>
                          </div>
                        </div>

                        {/* Tailwind Sleek Distribution Bar */}
                        <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              index === 0
                                ? "bg-accent-primary"
                                : index === 1
                                ? "bg-accent-success"
                                : index === 2
                                ? "bg-accent-warning"
                                : "bg-muted-foreground/60"
                            }`}
                            style={{ width: `${Math.max(store.percentage, 2)}%` }}
                          />
                        </div>
                      </div>
                    ))}

                    {/* Progressive Disclosure toggle for > 4 stores */}
                    {categoryBreakdown.length > 4 && (
                      <div className="pt-2 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAllStores(!showAllStores)}
                          className="rounded-xl text-xs text-muted-foreground hover:text-foreground h-8 gap-1 cursor-pointer"
                        >
                          {showAllStores ? (
                            <>
                              <ChevronUp className="w-3.5 h-3.5" />
                              <span>Show Top 4 Only</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3.5 h-3.5" />
                              <span>Show All {categoryBreakdown.length} Buckets</span>
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
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Personal Share Card */}
                <Card className="border border-border bg-card rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        My Monthly Contribution
                      </span>
                      <UserCheck className="w-4 h-4 text-accent-success" />
                    </div>

                    <div className="pt-1">
                      <h3 className="text-3xl font-extrabold text-foreground font-mono tracking-tight">
                        {formatCurrency(userSpend, currency)}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Out of{" "}
                        <span className="font-mono font-semibold text-foreground">
                          {formatCurrency(totalSpendCurrentMonth, currency)}
                        </span>{" "}
                        total kitchen spend.
                      </p>
                    </div>

                    {/* Impact Percentage Bar */}
                    <div className="pt-3 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Kitchen Share</span>
                        <span className="font-mono font-bold text-accent-success">
                          {userSpendSharePercentage}%
                        </span>
                      </div>
                      <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent-success rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(userSpendSharePercentage, 2)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/50 text-xs text-muted-foreground">
                    {userSpendSharePercentage >= 50 ? (
                      <span className="text-emerald-500 font-medium">
                        ★ You are carrying the lion&apos;s share of kitchen expenses this month.
                      </span>
                    ) : (
                      <span>
                        Shared household expenses are distributed smoothly across members.
                      </span>
                    )}
                  </div>
                </Card>

                {/* Receipts Logged Card */}
                <Card className="border border-border bg-card rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Receipts Logged By Me
                      </span>
                      <Receipt className="w-4 h-4 text-accent-primary" />
                    </div>

                    <div className="pt-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-foreground font-mono">
                          {userReceiptsCount}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          of {totalReceiptsCount} total household {totalReceiptsCount === 1 ? "receipt" : "receipts"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {userReceiptsCount > 0
                          ? `Average claimed per submission: ${formatCurrency(
                              userSpend / userReceiptsCount,
                              currency
                            )}`
                          : "No receipts submitted by you yet this month."}
                      </p>
                    </div>

                    {/* Submission Activity Indicator */}
                    <div className="pt-3 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Household Submission Activity</span>
                        <span className="font-mono font-medium text-foreground">
                          {totalReceiptsCount > 0
                            ? `${Math.round((userReceiptsCount / totalReceiptsCount) * 100)}%`
                            : "0%"}
                        </span>
                      </div>
                      <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent-primary rounded-full transition-all duration-500"
                          style={{
                            width: `${
                              totalReceiptsCount > 0
                                ? Math.round((userReceiptsCount / totalReceiptsCount) * 100)
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/50 text-xs text-muted-foreground flex items-center justify-between">
                    <span>Keep submitting receipts to keep the kitchen balanced</span>
                    <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Card>
              </div>

              {/* Extra Personal Insight Breakdown */}
              {allTopItems.length > 0 && (
                <Card className="border border-border bg-card rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-accent-primary" />
                      <h4 className="text-sm font-semibold text-foreground">
                        Most Active Kitchen Supplies This Month
                      </h4>
                    </div>
                    <Badge variant="secondary" className="text-xs font-mono">
                      Top 5
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-1">
                    {allTopItems.map((item, index) => (
                      <div
                        key={item.name}
                        className="bg-muted/40 border border-border/60 rounded-2xl p-3 text-center space-y-1"
                      >
                        <span className="text-[10px] text-muted-foreground font-mono">
                          #{index + 1}
                        </span>
                        <p className="text-xs font-bold text-foreground truncate" title={item.name}>
                          {item.name}
                        </p>
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-mono bg-background text-foreground"
                        >
                          {item.count}x
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* Task 3 Hidden Card: kartli Wrapped / Monthly Audit Export Node */}
      {/* Kept offscreen but fully rendered with dark "Midnight Plum" aesthetic for pixel-perfect PNG snapshot */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none" aria-hidden="true">
        <div
          ref={exportCardRef}
          style={{
            width: "680px",
            backgroundColor: "#0d0f14",
            color: "#f4f4f5",
            fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
          className="p-8 rounded-3xl border border-[#242b38] space-y-6 shadow-2xl"
        >
          {/* Header Branding */}
          <div className="flex items-center justify-between border-b border-[#242b38] pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#c084fc]/15 border border-[#c084fc]/30 flex items-center justify-center text-[#c084fc]">
                <Activity className="w-5 h-5 text-[#c084fc]" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>kartli</span>
                  <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-[#1a202c] text-[#c084fc] border border-[#242b38]">
                    Kitchen Pulse
                  </span>
                </h1>
                <p className="text-xs text-[#94a3b8]">Monthly Household Spending & Audit</p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-bold text-white tracking-wide">{kitchenName}</div>
              <div className="text-xs text-[#94a3b8] font-mono">{monthLabel}</div>
            </div>
          </div>

          {/* Hero Spend Section */}
          <div className="bg-[#131720] border border-[#242b38] rounded-2xl p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
                Monthly Spend
              </span>
              <div className="text-4xl font-extrabold text-white font-mono">
                {formatCurrency(totalSpendCurrentMonth, currency)}
              </div>
              <p className="text-xs text-[#94a3b8]">
                {totalReceiptsCount} {totalReceiptsCount === 1 ? "receipt" : "receipts"} logged across household
              </p>
            </div>

            <div className="text-right space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#c084fc]/15 text-[#c084fc] border border-[#c084fc]/30 text-xs font-semibold">
                <span>Pantry Health: {pantryStockRatio.inStockPercentage}%</span>
              </div>
              <div className="text-xs text-[#94a3b8] font-mono">
                {pantryStockRatio.inStock} of {pantryStockRatio.total} items in stock
              </div>
            </div>
          </div>

          {/* Highlights Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Top Merchant */}
            <div className="bg-[#131720] border border-[#242b38] rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
                Top Spending Bucket
              </span>
              <div className="text-base font-bold text-white truncate">
                {categoryBreakdown[0] ? categoryBreakdown[0].name : "None logged"}
              </div>
              <div className="text-xs text-[#4ade80] font-mono">
                {categoryBreakdown[0] ? formatCurrency(categoryBreakdown[0].amount, currency) : "€ 0.00"}
                {categoryBreakdown[0] && ` (${categoryBreakdown[0].percentage}%)`}
              </div>
            </div>

            {/* Top Restocked Item */}
            <div className="bg-[#131720] border border-[#242b38] rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
                Top Replenished Item
              </span>
              <div className="text-base font-bold text-white truncate">
                {topItem ? topItem.name : "None logged"}
              </div>
              <div className="text-xs text-[#c084fc] font-mono">
                {topItem ? `${topItem.count} restocks` : "0 restocks"}
              </div>
            </div>
          </div>

          {/* Stores Breakdown Bar Snippet */}
          {categoryBreakdown.length > 0 && (
            <div className="bg-[#131720] border border-[#242b38] rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-center text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
                <span>Top Stores Distribution</span>
                <span>Share</span>
              </div>
              <div className="space-y-2.5">
                {categoryBreakdown.slice(0, 3).map((item) => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-white font-medium">{item.name}</span>
                      <span className="text-[#94a3b8] font-mono">
                        {formatCurrency(item.amount, currency)} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#1a202c] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#c084fc] rounded-full"
                        style={{ width: `${Math.max(item.percentage, 3)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Card */}
          <div className="pt-2 border-t border-[#242b38] flex items-center justify-between text-[11px] text-[#94a3b8]">
            <span>kartli • Shared Kitchen & Household OS</span>
            <span>Generated on {new Date().toLocaleDateString("en-US", { dateStyle: "medium" })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
