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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import {
  Activity,
  CreditCard,
  Package,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShoppingBag,
  Receipt,
  Sparkles,
  ArrowUpRight,
  Flame,
  Store,
  Calendar,
  AlertCircle,
  FileText,
  User,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { getKitchenStats, type KitchenPulseStats } from "@/lib/actions/stats";
import { getMyCheckoutsAction } from "@/app/actions/checkout";
import type { PantryItem, CheckoutWithDetails } from "@/types";
import { toast } from "sonner";

export interface SpacePulseModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  kitchenId: string;
  kitchenName: string;
  currentUserId: string;
  initialStats?: KitchenPulseStats | any;
  pantryItems?: PantryItem[] | any[];
  myCheckouts?: CheckoutWithDetails[] | any[];
}

function formatRelativeDate(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return "Recently";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Recently";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatShortDate(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SpacePulseModalSkeleton() {
  return (
    <div className="space-y-6 py-2 animate-pulse">
      {/* Spend hero card skeleton */}
      <Card className="border border-border bg-card rounded-2xl p-5 space-y-4">
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

      {/* 2-column widgets skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border border-border bg-card rounded-2xl p-4 space-y-3">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-2 w-full rounded-full" />
        </Card>
        <Card className="border border-border bg-card rounded-2xl p-4 space-y-3">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-2 w-full rounded-full" />
        </Card>
      </div>

      {/* List items skeleton */}
      <div className="space-y-2 pt-1">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
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
}: SpacePulseModalProps) {
  const [stats, setStats] = useState<KitchenPulseStats | null>(initialStats || null);
  const [checkoutsList, setCheckoutsList] = useState<CheckoutWithDetails[]>(
    Array.isArray(myCheckouts) ? myCheckouts : []
  );
  const [isLoading, setIsLoading] = useState(!initialStats);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"spending" | "pantry" | "activity">("spending");
  const [, startTransition] = useTransition();

  // Sync initialStats when prop updates
  useEffect(() => {
    if (initialStats) {
      setStats(initialStats);
      setIsLoading(false);
    }
  }, [initialStats]);

  // Sync checkouts when prop updates
  useEffect(() => {
    if (Array.isArray(myCheckouts)) {
      setCheckoutsList(myCheckouts);
    }
  }, [myCheckouts]);

  // Fetch data on modal open if not available
  const loadData = async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
    } else if (!stats) {
      setIsLoading(true);
    }

    try {
      const promises: [Promise<KitchenPulseStats>, Promise<CheckoutWithDetails[]> | Promise<null>] = [
        getKitchenStats(kitchenId, currentUserId),
        !myCheckouts ? getMyCheckoutsAction(kitchenId) : Promise.resolve(null),
      ];

      const [statsData, checkoutsData] = await Promise.all(promises);

      setStats(statsData);
      if (checkoutsData) {
        setCheckoutsList(checkoutsData);
      }

      if (isManual) {
        toast.success("Space pulse updated");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load space statistics";
      toast.error(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (!stats) {
        loadData();
      } else if (!myCheckouts && checkoutsList.length === 0) {
        // Fetch checkouts in background if missing
        getMyCheckoutsAction(kitchenId)
          .then((data) => setCheckoutsList(data))
          .catch(() => {});
      }
    }
  }, [isOpen, kitchenId, currentUserId]);

  // Derived depleted pantry staples
  const depletedStaples = useMemo(() => {
    if (!pantryItems || !Array.isArray(pantryItems)) return [];
    return pantryItems.filter((item) => item.is_out_of_stock);
  }, [pantryItems]);

  const currency = stats?.currency || "EUR";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent onDismiss={() => onOpenChange(false)} className="sm:max-w-3xl sm:w-full p-0 gap-0">
        {/* Modal Header */}
        <DialogHeader className="p-5 sm:p-6 pb-3 border-b border-border/80 pr-12 flex flex-col space-y-1.5 shrink-0 bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
                  {kitchenName} Pulse
                </DialogTitle>
                {stats?.monthLabel && (
                  <Badge
                    variant="secondary"
                    className="bg-muted text-muted-foreground text-[10px] font-mono uppercase px-2 py-0.5 rounded-md"
                  >
                    {stats.monthLabel}
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                Monthly balance, depleted essentials, and restock logs
              </DialogDescription>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => loadData(true)}
              disabled={isRefreshing || isLoading}
              className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 cursor-pointer"
              title="Refresh statistics"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
            </Button>
          </div>

          {/* Sub-navigation Tray */}
          <div className="pt-2">
            <Tabs
              value={activeTab}
              onValueChange={(val) => setActiveTab(val as "spending" | "pantry" | "activity")}
              className="w-full"
            >
              <TabsList className="w-full flex items-center gap-1.5 p-1 bg-secondary/50 rounded-xl mb-1 overflow-x-auto no-scrollbar border-0 h-auto">
                <TabsTrigger
                  value="spending"
                  className="flex-1 py-1.5 px-3 text-xs font-medium rounded-lg text-center whitespace-nowrap transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 shrink-0"
                >
                  <CreditCard className="w-3.5 h-3.5 shrink-0" />
                  <span>Spend Balance</span>
                </TabsTrigger>

                <TabsTrigger
                  value="pantry"
                  className="flex-1 py-1.5 px-3 text-xs font-medium rounded-lg text-center whitespace-nowrap transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Package className="w-3.5 h-3.5 shrink-0" />
                  <span>Depleted Staples</span>
                  {depletedStaples.length > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] font-mono rounded-full bg-destructive/15 text-destructive border border-destructive/25 shrink-0">
                      {depletedStaples.length}
                    </span>
                  )}
                </TabsTrigger>

                <TabsTrigger
                  value="activity"
                  className="flex-1 py-1.5 px-3 text-xs font-medium rounded-lg text-center whitespace-nowrap transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Receipt className="w-3.5 h-3.5 shrink-0" />
                  <span>Restock Feed</span>
                  {checkoutsList.length > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] font-mono rounded-full bg-muted text-muted-foreground border border-border shrink-0">
                      {checkoutsList.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </DialogHeader>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-8 pt-2 sm:p-6 space-y-6 overscroll-contain">
          {isLoading ? (
            <SpacePulseModalSkeleton />
          ) : !stats ? (
            <Card className="border border-border bg-card rounded-2xl p-6 text-center space-y-3 shadow-xs">
              <div className="w-10 h-10 mx-auto rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">Could not load space stats</p>
              <p className="text-xs text-muted-foreground">
                Please check your network connection and try again.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadData(true)}
                className="rounded-xl text-xs h-8 border-border cursor-pointer"
              >
                Retry
              </Button>
            </Card>
          ) : (
            <>
              {/* TAB 1: Spending & Balance */}
              {activeTab === "spending" && (
                <div className="space-y-5 animate-in fade-in-50 duration-200">
                  {stats.totalReceiptsCount === 0 && stats.totalSpendCurrentMonth === 0 ? (
                    <Card className="border border-border/70 bg-muted/20 rounded-2xl p-8 text-center space-y-3 shadow-xs">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-muted border border-border/80 flex items-center justify-center text-muted-foreground">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-foreground">
                          No grocery runs recorded yet this month.
                        </h3>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          Check out your supermarket run or upload a receipt to track household spending and personal impact.
                        </p>
                      </div>
                    </Card>
                  ) : (
                    <>
                      {/* Hero Spend Card */}
                      <Card className="border border-border bg-card rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                              Total Spend This Month
                            </span>
                          </div>
                          <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs font-mono">
                            {stats.monthLabel}
                          </Badge>
                        </div>

                        <div className="flex items-baseline gap-3 flex-wrap">
                          <span className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight font-mono">
                            {formatCurrency(stats.totalSpendCurrentMonth, "EUR")}
                          </span>

                          {/* Month-over-month Trend Indicator */}
                          {stats.spendTrendDirection === "down" && (
                            <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs font-mono gap-1">
                              <TrendingDown className="w-3 h-3 text-primary" />
                              <span>-{stats.spendTrendPercentage}% vs last month</span>
                            </Badge>
                          )}

                          {stats.spendTrendDirection === "up" && (
                            <Badge className="bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 text-xs font-mono gap-1">
                              <TrendingUp className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                              <span>+{stats.spendTrendPercentage}% vs last month</span>
                            </Badge>
                          )}

                          {stats.spendTrendDirection === "flat" && (
                            <Badge variant="secondary" className="text-xs font-mono bg-muted text-muted-foreground border border-border gap-1">
                              <Minus className="w-3 h-3" />
                              <span>0% vs last month</span>
                            </Badge>
                          )}

                          {stats.spendTrendDirection === "new" && (
                            <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs font-mono gap-1">
                              <Sparkles className="w-3 h-3" />
                              <span>First month</span>
                            </Badge>
                          )}
                        </div>

                        {/* Comparison note & quick stats */}
                        <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border/60">
                          <span>Previous Month Spend:</span>
                          <span className="font-mono font-medium text-foreground">
                            {formatCurrency(stats.totalSpendPreviousMonth, "EUR")}
                          </span>
                        </div>
                      </Card>

                      {/* Real "My Impact" Checkout Breakdown */}
                      <Card className="border border-border bg-card rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-primary" />
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                              My Impact &amp; Checkout Breakdown
                            </h4>
                          </div>
                          {stats.userReceiptsCount > 0 && (
                            <Badge variant="secondary" className="text-xs font-mono">
                              {stats.userHabitRole.roleTitle}
                            </Badge>
                          )}
                        </div>

                        {stats.userReceiptsCount === 0 && stats.userSpend === 0 && (!stats.userSettlement || stats.userSettlement.pendingRefundAmount === 0) ? (
                          <div className="py-6 px-4 rounded-xl bg-muted/20 border border-dashed border-border/70 text-center space-y-1.5">
                            <p className="text-xs font-semibold text-foreground">
                              No checkouts logged by you yet this month.
                            </p>
                            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                              When you complete a supermarket run or claim an expense, your personal spend, run share, and settlement balance will be tracked here.
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                                <span className="text-[11px] text-muted-foreground">Personal Spend</span>
                                <div className="text-lg font-bold font-mono text-foreground">
                                  {formatCurrency(stats.userSpend, "EUR")}
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                  {stats.userSpendSharePercentage}% of total
                                </span>
                              </div>

                              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                                <span className="text-[11px] text-muted-foreground">Personal Runs</span>
                                <div className="text-lg font-bold font-mono text-foreground">
                                  {stats.userReceiptsCount} <span className="text-xs font-normal text-muted-foreground">/ {stats.totalReceiptsCount}</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                  {stats.userHabitRole.runPercentage}% of household runs
                                </span>
                              </div>

                              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                                <span className="text-[11px] text-muted-foreground">Settlement Status</span>
                                <div className="text-lg font-bold font-mono text-foreground">
                                  {stats.userSettlement.pendingRefundAmount > 0 ? (
                                    <span className="text-amber-600 dark:text-amber-400">
                                      +{formatCurrency(stats.userSettlement.pendingRefundAmount, "EUR")}
                                    </span>
                                  ) : (
                                    <span className="text-emerald-600 dark:text-emerald-400">Balanced</span>
                                  )}
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                  {stats.userSettlement.pendingRefundAmount > 0
                                    ? `Owed to you (${stats.userSettlement.pendingRefundsCount} pending)`
                                    : "All refunds settled"}
                                </span>
                              </div>
                            </div>

                            <p className="text-xs text-muted-foreground">
                              {stats.userHabitRole.roleDescription} (Avg contribution:{" "}
                              <strong className="text-foreground">{formatCurrency(stats.userAverageContribution, "EUR")}</strong> per run)
                            </p>
                          </>
                        )}
                      </Card>

                      {/* 2-Column Metrics: Basket Size & Category Footprint */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Average Basket Size */}
                        <Card className="border border-border bg-card rounded-2xl p-4 shadow-xs space-y-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-medium">Avg. Household Basket</span>
                            <ShoppingBag className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-2xl font-bold font-mono text-foreground">
                            {formatCurrency(stats.averageBasketSize, "EUR")}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Across {stats.totalReceiptsCount} logged grocery {stats.totalReceiptsCount === 1 ? "run" : "runs"} this month
                          </p>
                        </Card>

                        {/* Top Store Footprint */}
                        <Card className="border border-border bg-card rounded-2xl p-4 shadow-xs space-y-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-medium">Primary Store Footprint</span>
                            <Store className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-2xl font-bold text-foreground truncate">
                            {stats.userCategoryFootprint ? stats.userCategoryFootprint.categoryName : (stats.categoryBreakdown[0]?.name || "Local Supermarket")}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {stats.userCategoryFootprint
                              ? stats.userCategoryFootprint.displayText
                              : `${stats.categoryBreakdown[0]?.percentage || 0}% of household spending`}
                          </p>
                        </Card>
                      </div>
                    </>
                  )}

                  {/* Merchant & Category Spending Breakdown */}
                  <Card className="border border-border bg-card rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-muted-foreground" />
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                          Merchant Spending Breakdown
                        </h4>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">
                        {stats.categoryBreakdown.length} {stats.categoryBreakdown.length === 1 ? "store" : "stores"}
                      </span>
                    </div>

                    {stats.categoryBreakdown.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">
                        No merchant spending categorized yet this month.
                      </p>
                    ) : (
                      <div className="space-y-3 pt-1">
                        {stats.categoryBreakdown.map((store) => (
                          <div key={store.name} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-foreground truncate max-w-[60%]">
                                {store.name}
                              </span>
                              <div className="flex items-center gap-2">
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
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-300"
                                style={{ width: `${Math.max(store.percentage, 3)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              )}

              {/* TAB 2: Depleted Pantry Staples */}
              {activeTab === "pantry" && (
                <div className="space-y-5 animate-in fade-in-50 duration-200">
                  {/* Stock Health Banner */}
                  <Card className="border border-border bg-card rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                          Pantry Inventory Health
                        </h4>
                      </div>
                      {stats.pantryStockRatio.outOfStock > 0 ? (
                        <Badge className="bg-destructive/10 text-destructive border border-destructive/20 text-xs font-medium gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{stats.pantryStockRatio.outOfStock} depleted</span>
                        </Badge>
                      ) : (
                        <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs font-medium gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Fully Stocked</span>
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-3xl font-extrabold text-foreground font-mono">
                          {stats.pantryStockRatio.inStockPercentage}%
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">
                          {stats.pantryStockRatio.inStock} in stock · {stats.pantryStockRatio.outOfStock} depleted
                        </span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${stats.pantryStockRatio.inStockPercentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border/60">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        <span>Restock Response Time:</span>
                      </div>
                      <span className="font-mono font-medium text-foreground">
                        {stats.vitals.compactRestockLatency || stats.vitals.formattedRestockLatency || "Instant"}
                      </span>
                    </div>
                  </Card>

                  {/* Top Depleted Staples List */}
                  <Card className="border border-border bg-card rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-destructive" />
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                          Depleted Staples Needing Restock
                        </h4>
                      </div>
                      <Badge variant="secondary" className="text-xs font-mono bg-muted text-muted-foreground border border-border">
                        {depletedStaples.length} items
                      </Badge>
                    </div>

                    {depletedStaples.length === 0 ? (
                      <div className="py-6 text-center space-y-2">
                        <div className="w-9 h-9 mx-auto rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-medium text-foreground">All pantry staples in stock!</p>
                        <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                          None of your tracked staples are currently marked as depleted.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/60">
                        {depletedStaples.map((item: PantryItem) => (
                          <div
                            key={item.id}
                            className="py-2.5 flex items-center justify-between gap-3 text-sm hover:bg-muted/40 px-2 rounded-xl transition"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span className="w-2 h-2 rounded-full bg-destructive shrink-0" />
                              <span className="font-medium text-foreground truncate">
                                {item.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                                {formatRelativeDate(item.updated_at || item.created_at)}
                              </span>
                              <Badge className="bg-destructive/10 text-destructive border border-destructive/20 text-[10px] font-mono px-2 py-0.5">
                                Depleted
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Frequently Restocked Items */}
                  <Card className="border border-border bg-card rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-amber-500" />
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                          Frequently Restocked Staples
                        </h4>
                      </div>
                      <Badge variant="secondary" className="text-xs font-mono bg-muted text-muted-foreground border border-border">
                        Top {stats.allTopItems.length}
                      </Badge>
                    </div>

                    {stats.allTopItems.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">
                        No restocked items recorded yet this month.
                      </p>
                    ) : (
                      <div className="divide-y divide-border/60">
                        {stats.allTopItems.map((item, index) => (
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
                              <Badge
                                variant="secondary"
                                className="text-xs font-mono bg-muted text-foreground border border-border px-2 py-0.5"
                              >
                                {item.count}× restocked
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Dead Stock / Idle Items Warning */}
                  {stats.deadStockItems.length > 0 && (
                    <Card className="border border-border bg-card rounded-2xl p-4 shadow-xs space-y-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                          Untouched Staples (Idle Stock)
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {stats.deadStockItems.slice(0, 4).map((dead) => (
                          <div
                            key={dead.name}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/70 text-xs"
                          >
                            <span className="font-medium text-foreground truncate max-w-[65%]">
                              {dead.name}
                            </span>
                            <Badge variant="secondary" className="text-[10px] font-mono bg-muted text-muted-foreground">
                              {dead.idleDays}d idle
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {/* TAB 3: Recent Restock Activity Feed */}
              {activeTab === "activity" && (
                <div className="space-y-4 animate-in fade-in-50 duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-muted-foreground" />
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                        Recent Checkout Receipts &amp; Restocks
                      </h4>
                    </div>
                    <Badge variant="secondary" className="text-xs font-mono bg-muted text-muted-foreground border border-border">
                      {checkoutsList.length} logs
                    </Badge>
                  </div>

                  {checkoutsList.length === 0 ? (
                    <Card className="border border-border bg-card rounded-2xl p-8 text-center space-y-3 shadow-xs">
                      <div className="w-10 h-10 mx-auto rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">No recent restocks logged</p>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        When grocery runs are checked out and receipts are submitted, items restocked and audit trails will appear here.
                      </p>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {checkoutsList.map((checkout) => {
                        const itemsCount = checkout.items?.length || 0;
                        const hasReceipt = Boolean(
                          checkout.receipt_filename || (checkout.receipts && checkout.receipts.length > 0)
                        );

                        return (
                          <Card
                            key={checkout.id}
                            className="border border-border bg-card rounded-2xl p-4 shadow-xs space-y-3 hover:border-border/80 transition"
                          >
                            {/* Top row: store, date, amount */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-0.5 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm text-foreground truncate">
                                    {checkout.store_name || "General Restock"}
                                  </span>
                                  {checkout.username && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0"
                                    >
                                      @{checkout.username}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <span>{formatRelativeDate(checkout.created_at)}</span>
                                  <span>·</span>
                                  <span>{formatShortDate(checkout.created_at)}</span>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="font-mono font-bold text-sm text-foreground">
                                  {formatCurrency(checkout.total_claimed_amount, checkout.currency || currency)}
                                </div>
                                <div className="flex items-center gap-1 justify-end pt-1">
                                  {checkout.is_refunded ? (
                                    <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-mono px-1.5 py-0">
                                      Settled
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 text-[10px] font-mono px-1.5 py-0">
                                      Pending
                                    </Badge>
                                  )}
                                  {hasReceipt && (
                                    <Badge variant="secondary" className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0" title="Receipt attached">
                                      <FileText className="w-2.5 h-2.5" />
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Restocked items list */}
                            {itemsCount > 0 && (
                              <div className="pt-2 border-t border-border/60">
                                <div className="text-[11px] font-medium text-muted-foreground mb-1.5 flex items-center justify-between">
                                  <span>Items Restocked ({itemsCount})</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {checkout.items.slice(0, 6).map((item) => (
                                    <span
                                      key={item.id}
                                      className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-lg bg-muted text-foreground border border-border/80"
                                    >
                                      {item.name}
                                    </span>
                                  ))}
                                  {itemsCount > 6 && (
                                    <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-lg bg-muted/60 text-muted-foreground">
                                      +{itemsCount - 6} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Note if present */}
                            {checkout.note && (
                              <p className="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded-xl border border-border/40">
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

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-border/80 bg-muted/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs text-muted-foreground shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="truncate">Live data synchronized with household inventory</span>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto rounded-xl text-xs font-semibold h-9 px-4 border border-border shrink-0 cursor-pointer"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SpacePulseModal;
