"use client";

import { useState, useEffect, useRef } from "react";
import type { KitchenPulseStats } from "@/lib/actions/stats";
import { getKitchenStats } from "@/lib/actions/stats";
import { formatCurrency, cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  CreditCard,
  Package,
  Store,
  Flame,
  TrendingDown,
  TrendingUp,
  Minus,
  Timer,
  AlertTriangle,
  Download,
  RefreshCw,
  UserCheck,
  Scale,
  ShoppingBag,
  Compass,
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
    <div className="w-full space-y-6 animate-pulse">
      {/* Header Card Skeleton */}
      <Card className="border border-border bg-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-md" />
            <Skeleton className="h-6 w-32 rounded-md" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
        </div>
        <Skeleton className="h-10 w-full sm:w-56 rounded-2xl" />
      </Card>

      {/* Hero 2-Column Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card className="border border-border bg-card rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-36 rounded-md" />
          </div>
          <Skeleton className="h-10 w-44 rounded-lg" />
          <Skeleton className="h-9 w-full rounded-xl" />
        </Card>

        <Card className="border border-border bg-card rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-9 w-full rounded-xl" />
        </Card>
      </div>

      {/* Secondary 2-Column Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card className="border border-border bg-card rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-44 rounded-md" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="space-y-3 pt-2">
            <Skeleton className="h-8 w-full rounded-xl" />
            <Skeleton className="h-8 w-full rounded-xl" />
            <Skeleton className="h-8 w-full rounded-xl" />
          </div>
        </Card>

        <Card className="border border-border bg-card rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-44 rounded-md" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <div className="space-y-2 pt-2">
            <Skeleton className="h-9 w-full rounded-xl" />
            <Skeleton className="h-9 w-full rounded-xl" />
            <Skeleton className="h-9 w-full rounded-xl" />
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
      <Card className="border border-border bg-card rounded-3xl p-6 text-center shadow-sm">
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
    userSettlement,
    userTopItems,
    userHabitRole,
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

  // Distinct category soft progress colors matching active theme palette
  const categoryBarColors = [
    "bg-primary",
    "bg-accent",
    "bg-chart-2",
    "bg-amber-500/80",
    "bg-sky-500/80",
    "bg-violet-500/80",
  ];

  return (
    <div className="w-full space-y-6 animate-in fade-in-50 duration-200">
      {/* Header Card Container */}
      <Card className="border border-border bg-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Header Row: Icon + Title + Month on left, Action buttons on right */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Activity className="w-4 h-4 text-muted-foreground shrink-0" />
            <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              Kitchen Pulse
            </h2>
            <Badge
              variant="secondary"
              className="bg-muted text-muted-foreground text-[10px] font-mono uppercase px-2 py-0.5 rounded-md shrink-0"
            >
              {monthLabel}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
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

            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={handleExport}
              disabled={isExporting}
              className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted border-border"
              title="Export summary snapshot"
            >
              <Download className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Controls / Sub-Row: Segmented Control [ Kitchen | My Impact ] */}
        <div className="pt-0.5">
          <div className="inline-flex bg-muted/80 border border-border p-1 rounded-2xl h-10 shadow-xs w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveView("kitchen")}
              className={`flex-1 sm:flex-initial text-center px-4 py-1.5 rounded-xl text-sm font-semibold whitespace-nowrap cursor-pointer transition-all duration-150 ${
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
              className={`flex-1 sm:flex-initial text-center px-4 py-1.5 rounded-xl text-sm font-semibold whitespace-nowrap cursor-pointer transition-all duration-150 inline-flex items-center justify-center gap-1.5 ${
                activeView === "personal"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={activeView === "personal"}
            >
              <span>My Impact</span>
              {userSpendSharePercentage > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-mono rounded-full bg-primary/15 text-primary border border-primary/25 shrink-0">
                  {userSpendSharePercentage}%
                </span>
              )}
            </button>
          </div>
        </div>
      </Card>

      {/* Empty State */}
      {!hasData ? (
        <Card className="border border-border bg-card rounded-3xl p-8 text-center shadow-sm space-y-2">
          <div className="w-10 h-10 mx-auto rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No purchases this month</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Metrics and inventory health will populate as receipts and checkouts are logged.
          </p>
        </Card>
      ) : (
        <>
          {/* TAB 1: Kitchen Overview (Balanced 2x2 Grid) */}
          {activeView === "kitchen" && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              {/* Top Hero Grid: 2-Column (matches Pantry & Shopping List grid) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Card 1: Monthly Spend & Vitals */}
                <Card className="border border-border bg-card rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
                  {/* Card Header Pattern - Redundant month badge removed */}
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <span>Monthly Spend</span>
                    </h2>
                  </div>

                  {/* Hero Metric & Trend Indicator */}
                  <div className="flex items-baseline gap-3 flex-wrap pt-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight font-mono">
                      {formatCurrency(totalSpendCurrentMonth, currency)}
                    </span>

                    {spendTrendDirection === "down" && (
                      <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs font-mono gap-1">
                        <TrendingDown className="w-3 h-3 text-primary" />
                        <span>-{spendTrendPercentage}% vs last month</span>
                      </Badge>
                    )}

                    {spendTrendDirection === "up" && (
                      <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono gap-1">
                        <TrendingUp className="w-3 h-3 text-amber-400" />
                        <span>+{spendTrendPercentage}% vs last month</span>
                      </Badge>
                    )}

                    {spendTrendDirection === "flat" && (
                      <Badge variant="secondary" className="text-xs font-mono bg-muted text-muted-foreground border border-border gap-1">
                        <Minus className="w-3 h-3" />
                        <span>0% vs last month</span>
                      </Badge>
                    )}

                    {spendTrendDirection === "new" && (
                      <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs font-mono">
                        First month
                      </Badge>
                    )}
                  </div>

                  {/* Visual Spend Pulse Dual-Tone Area Chart */}
                  <div className="w-full h-20 sm:h-24 pt-1">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 400 90" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="pulseSpendGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
                          <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.12" />
                          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 0 75 Q 40 68, 80 50 T 160 42 T 240 60 T 320 28 T 400 12 L 400 90 L 0 90 Z"
                        fill="url(#pulseSpendGradient)"
                      />
                      <path
                        d="M 0 75 Q 40 68, 80 50 T 160 42 T 240 60 T 320 28 T 400 12"
                        fill="none"
                        stroke="var(--primary)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 0 85 Q 50 78, 100 62 T 200 48 T 300 38 T 400 22"
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="1.75"
                        strokeDasharray="4 3"
                        strokeOpacity="0.8"
                        strokeLinecap="round"
                      />
                      <circle cx="400" cy="12" r="3.5" fill="var(--primary)" />
                      <circle cx="400" cy="12" r="6.5" fill="var(--accent)" fillOpacity="0.35" />
                    </svg>
                  </div>

                  {/* Bottom Mini-Row: 2 Compact Inline Stats */}
                  <div className="p-3 rounded-2xl bg-muted/40 border border-border/80 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span>Avg. Ticket:</span>
                      <span className="font-mono font-bold text-foreground">
                        {formatCurrency(vitals.averageBasketSize, currency)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-foreground">{totalReceiptsCount}</span>
                      <span>{totalReceiptsCount === 1 ? "receipt logged" : "receipts logged"}</span>
                    </div>
                  </div>
                </Card>

                {/* Card 2: Pantry & Supply Health */}
                <Card className="border border-border bg-card rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
                  {/* Card Header Pattern */}
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <span>Pantry Health</span>
                    </h2>

                    {pantryStockRatio.outOfStock > 0 ? (
                      <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <span>{pantryStockRatio.outOfStock} needed</span>
                      </Badge>
                    ) : (
                      <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs font-medium">
                        All in stock
                      </Badge>
                    )}
                  </div>

                  {/* Metric & Progress Bar */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl sm:text-4xl font-extrabold text-foreground font-mono">
                        {pantryStockRatio.inStockPercentage}%
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {pantryStockRatio.inStock} in stock · {pantryStockRatio.outOfStock} needed
                      </span>
                    </div>

                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${pantryStockRatio.inStockPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Inline Highlights: Restock Speed & Attention Item */}
                  <div className="p-3 rounded-2xl bg-muted/40 border border-border/80 flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <Timer className="w-3.5 h-3.5 text-primary" />
                      <span>Restock Speed:</span>
                      <span className="font-mono font-bold text-foreground">
                        {vitals.compactRestockLatency || "—"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">avg.</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span>Attention:</span>
                      <span className="font-medium text-foreground truncate max-w-[100px]">
                        {attentionDeadStock ? attentionDeadStock.name : "None"}
                      </span>
                      {attentionDeadStock ? (
                        <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono px-1.5 py-0">
                          {attentionDeadStock.idleDays}d idle
                        </Badge>
                      ) : (
                        <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-mono px-1.5 py-0">
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Secondary Grid: 2-Column (matches Pantry & Shopping List grid) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Card 3: Spending Distribution */}
                <Card className="border border-border bg-card rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
                  {/* Card Header Pattern */}
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Store className="w-4 h-4 text-muted-foreground" />
                      <span>Top Merchants &amp; Categories</span>
                    </h2>
                    <Badge variant="secondary" className="text-xs font-mono bg-muted text-muted-foreground border border-border">
                      {visibleStores.length} visible
                    </Badge>
                  </div>

                  {categoryBreakdown.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      No merchant spending recorded yet this month.
                    </p>
                  ) : (
                    <div className="space-y-3.5 pt-1">
                      {visibleStores.map((store, index) => (
                        <div key={store.name} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-foreground truncate max-w-[55%]">
                              {store.name}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono text-muted-foreground">
                                {formatCurrency(store.amount, currency)}
                              </span>
                              <Badge
                                variant="secondary"
                                className="text-[10px] font-mono bg-muted text-foreground border border-border px-1.5 py-0"
                              >
                                {store.percentage}%
                              </Badge>
                            </div>
                          </div>

                          {/* Distinct Soft Category Color Progress Bar */}
                          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                categoryBarColors[index % categoryBarColors.length]
                              )}
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
                            className="rounded-xl text-xs text-muted-foreground hover:text-foreground h-8 gap-1 cursor-pointer"
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

                {/* Card 4: Activity & Most Needed Supplies */}
                <Card className="border border-border bg-card rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
                  {/* Card Header Pattern */}
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Flame className="w-4 h-4 text-muted-foreground" />
                      <span>Top Circulated Supplies</span>
                    </h2>
                    <Badge variant="secondary" className="text-xs font-mono bg-muted text-muted-foreground border border-border">
                      Top {allTopItems.length}
                    </Badge>
                  </div>

                  {allTopItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      No supplies checked out yet this month.
                    </p>
                  ) : (
                    /* Itemized Compact Row List matching Pantry / Needed styling */
                    <div className="divide-y divide-border">
                      {allTopItems.map((item, index) => (
                        <div
                          key={item.name}
                          className="py-2.5 flex items-center justify-between gap-3 text-sm hover:bg-muted/40 px-2 rounded-xl transition"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className="text-xs font-mono text-muted-foreground w-4">
                              #{index + 1}
                            </span>
                            <span className="font-medium text-foreground truncate">
                              {item.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground">Restocked</span>
                            <Badge
                              variant="secondary"
                              className="text-xs font-mono bg-muted text-foreground border border-border px-2 py-0.5"
                            >
                              {item.count}×
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* TAB 2: My Impact (Balanced 2x2 Grid) */}
          {activeView === "personal" && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              {/* Top Hero Grid: 2-Column */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Card 1: My Spending & Contribution */}
                <Card className="border border-border bg-card rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
                  {/* Card Header Pattern */}
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-muted-foreground" />
                      <span>My Spending</span>
                    </h2>
                    <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs font-medium">
                      {userSpendSharePercentage}% share
                    </Badge>
                  </div>

                  {/* Value & Progress Bar */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl sm:text-4xl font-extrabold text-foreground font-mono">
                        {formatCurrency(userSpend, currency)}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        of {formatCurrency(totalSpendCurrentMonth, currency)} total
                      </span>
                    </div>

                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(userSpendSharePercentage, 2)}%` }}
                      />
                    </div>
                  </div>

                  {/* Bottom Mini-Row: Avg. per Trip & Receipts Logged */}
                  <div className="p-3 rounded-2xl bg-muted/40 border border-border/80 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span>Avg. per Trip:</span>
                      <span className="font-mono font-bold text-foreground">
                        {formatCurrency(userAverageContribution, currency)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-foreground">{userReceiptsCount}</span>
                      <span>{userReceiptsCount === 1 ? "receipt logged" : "receipts logged"}</span>
                    </div>
                  </div>
                </Card>

                {/* Card 2: Settlement Status */}
                <Card className="border border-border bg-card rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
                  {/* Card Header Pattern */}
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Scale className="w-4 h-4 text-muted-foreground" />
                      <span>Refunds &amp; Balance</span>
                    </h2>

                    {userSettlement.isAllSettled ? (
                      <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs font-medium">
                        All settled
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <span>Pending</span>
                      </Badge>
                    )}
                  </div>

                  {/* Value & Status Bar */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl sm:text-4xl font-extrabold text-foreground font-mono">
                        {formatCurrency(userSettlement.pendingRefundAmount, currency)}
                      </span>
                      <span className="text-xs font-medium font-sans">
                        {userSettlement.pendingRefundAmount > 0 ? (
                          <span className="text-amber-400">pending reimbursement</span>
                        ) : (
                          <span className="text-primary font-medium">All settled up</span>
                        )}
                      </span>
                    </div>

                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          userSettlement.isAllSettled ? "bg-primary" : "bg-amber-400"
                        )}
                        style={{
                          width: `${
                            userSettlement.settledRefundsCount + userSettlement.pendingRefundsCount > 0
                              ? Math.max(
                                  Math.round(
                                    (userSettlement.settledRefundsCount /
                                      (userSettlement.settledRefundsCount + userSettlement.pendingRefundsCount)) *
                                      100
                                  ),
                                  5
                                )
                              : 100
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Sub-row: Count of settled vs. pending refunds */}
                  <div className="p-3 rounded-2xl bg-muted/40 border border-border/80 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-foreground">{userSettlement.settledRefundsCount}</span>
                      <span>settled</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-foreground">{userSettlement.pendingRefundsCount}</span>
                      <span>pending approval</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Secondary Grid: 2-Column */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Card 3: Items You Stocked */}
                <Card className="border border-border bg-card rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
                  {/* Card Header Pattern */}
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                      <span>Your Restock Contributions</span>
                    </h2>
                    <Badge variant="secondary" className="text-xs font-mono bg-muted text-muted-foreground border border-border">
                      Top {userTopItems.length}
                    </Badge>
                  </div>

                  {userTopItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      No supplies checked out by you yet this month.
                    </p>
                  ) : (
                    /* Itemized Compact Row List matching Pantry / Needed styling */
                    <div className="divide-y divide-border">
                      {userTopItems.map((item, index) => (
                        <div
                          key={item.name}
                          className="py-2.5 flex items-center justify-between gap-3 text-sm hover:bg-muted/40 px-2 rounded-xl transition"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className="text-xs font-mono text-muted-foreground w-4">
                              #{index + 1}
                            </span>
                            <span className="font-medium text-foreground truncate">
                              {item.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground">You stocked</span>
                            <Badge
                              variant="secondary"
                              className="text-xs font-mono bg-muted text-foreground border border-border px-2 py-0.5"
                            >
                              {item.count}×
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Card 4: Shopping Footprint & Habits */}
                <Card className="border border-border bg-card rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
                  {/* Card Header Pattern */}
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Compass className="w-4 h-4 text-muted-foreground" />
                      <span>Shopping Habits</span>
                    </h2>
                    <Badge variant="secondary" className="text-xs font-mono bg-muted text-muted-foreground border border-border">
                      Routine
                    </Badge>
                  </div>

                  <div className="space-y-4 pt-1">
                    {/* Top Store Footprint */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground truncate max-w-[65%]">
                          {userCategoryFootprint ? userCategoryFootprint.categoryName : "Balanced Spend"}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-muted-foreground">
                            {userCategoryFootprint ? formatCurrency(userCategoryFootprint.amount, currency) : "€ 0.00"}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-mono bg-muted text-foreground border border-border px-1.5 py-0"
                          >
                            {userCategoryFootprint ? `${userCategoryFootprint.percentage}%` : "0%"}
                          </Badge>
                        </div>
                      </div>

                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${userCategoryFootprint ? Math.max(userCategoryFootprint.percentage, 2) : 0}%` }}
                        />
                      </div>

                      <span className="text-[11px] text-muted-foreground block font-mono">
                        {userCategoryFootprint ? userCategoryFootprint.displayText : "No dominant merchant footprint yet"}
                      </span>
                    </div>

                    {/* Role Highlight: Subtle clean notification card */}
                    <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <span className="text-xs font-semibold text-foreground block">
                          {userHabitRole.roleTitle}
                        </span>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {userHabitRole.roleDescription}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </>
      )}

      {/* Hidden Snapshot Export Card: Styled "kartli Wrapped" */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none" aria-hidden="true">
        <div
          ref={exportCardRef}
          style={{
            width: "600px",
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

          {/* 2-Column Hero Grid in Export */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#131720] border border-[#242b38] rounded-2xl p-4 space-y-1">
              <div className="text-xs text-[#94a3b8] flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Monthly Spend</span>
              </div>
              <div className="text-2xl font-bold font-mono text-white pt-1">
                {formatCurrency(totalSpendCurrentMonth, currency)}
              </div>
              <div className="text-[11px] font-mono text-[#94a3b8] pt-1">
                Avg. {formatCurrency(vitals.averageBasketSize, currency)} / trip
              </div>
            </div>

            <div className="bg-[#131720] border border-[#242b38] rounded-2xl p-4 space-y-1">
              <div className="text-xs text-[#94a3b8] flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                <span>Pantry Health</span>
              </div>
              <div className="text-2xl font-bold font-mono text-[#4ade80] pt-1">
                {pantryStockRatio.inStockPercentage}%
              </div>
              <div className="text-[11px] font-mono text-[#94a3b8] pt-1">
                {pantryStockRatio.inStock} stocked · {pantryStockRatio.outOfStock} needed
              </div>
            </div>
          </div>

          {/* Highlights */}
          <div className="grid grid-cols-2 gap-4 bg-[#131720] border border-[#242b38] rounded-2xl p-4 text-xs">
            <div>
              <span className="text-[#94a3b8] block text-[10px] uppercase font-semibold">Restock Speed</span>
              <span className="font-bold text-white font-mono">{vitals.compactRestockLatency || "—"} avg.</span>
            </div>
            <div>
              <span className="text-[#94a3b8] block text-[10px] uppercase font-semibold">Attention Item</span>
              <span className="font-bold text-white">
                {attentionDeadStock ? `${attentionDeadStock.name} (${attentionDeadStock.idleDays}d idle)` : "None"}
              </span>
            </div>
          </div>

          {/* Top Stores Breakdown */}
          {categoryBreakdown.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider block">
                Top Merchants
              </span>
              <div className="space-y-2">
                {categoryBreakdown.slice(0, 3).map((item, idx) => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-white">{item.name}</span>
                      <span className="font-mono text-[#94a3b8]">
                        {formatCurrency(item.amount, currency)} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#1a202c] rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", categoryBarColors[idx % categoryBarColors.length])}
                        style={{ width: `${Math.max(item.percentage, 2)}%` }}
                      />
                    </div>
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
