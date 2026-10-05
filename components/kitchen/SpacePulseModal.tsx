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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      {/* Spend hero card skeleton */}
      <Card className="border border-white/[0.08] bg-card/80 backdrop-blur-md rounded-3xl p-5 space-y-4">
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
        <Card className="border border-white/[0.08] bg-card/80 backdrop-blur-md rounded-3xl p-5 space-y-3">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-2 w-full rounded-full" />
        </Card>
        <Card className="border border-white/[0.08] bg-card/80 backdrop-blur-md rounded-3xl p-5 space-y-3">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-2 w-full rounded-full" />
        </Card>
      </div>

      {/* List items skeleton */}
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
}: SpacePulseModalProps) {
  const { t, locale } = useTranslation();
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
        toast.success(t.kitchen.pulse.updated);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.kitchen.pulse.couldNotLoad;
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
      <DialogContent
        onDismiss={() => onOpenChange(false)}
        className="sm:max-w-3xl sm:w-full p-0 gap-0 overflow-hidden bg-card/90 border border-white/[0.08] backdrop-blur-2xl shadow-2xl rounded-3xl flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-white/[0.08] pr-12 flex flex-col space-y-3 shrink-0 bg-muted/20 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shrink-0 shadow-xs">
              <Activity className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
                  {kitchenName} {t.kitchen.pulse.title}
                </DialogTitle>
                {stats?.monthLabel && (
                  <Badge
                    variant="secondary"
                    className="bg-muted/80 text-muted-foreground text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full border border-border/70"
                  >
                    {stats.monthLabel}
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {t.kitchen.pulse.subtitle}
              </DialogDescription>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => loadData(true)}
              disabled={isRefreshing || isLoading}
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 shrink-0 cursor-pointer"
              title={t.kitchen.pulse.refresh}
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
            </Button>
          </div>

          {/* Sub-navigation Tray: Refined glass pill switcher with tactile active state */}
          <div className="pt-1">
            <Tabs
              value={activeTab}
              onValueChange={(val) => setActiveTab(val as "spending" | "pantry" | "activity")}
              className="w-full"
            >
              <TabsList className="w-full flex items-center gap-1.5 p-1.5 bg-muted/40 backdrop-blur-xl border border-white/[0.08] rounded-2xl mb-0 overflow-x-auto no-scrollbar h-auto shadow-inner">
                <TabsTrigger
                  value="spending"
                  className="flex-1 py-2 px-3 text-xs font-medium rounded-xl text-center whitespace-nowrap transition-all duration-200 data-[state=active]:bg-card/90 data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-white/[0.1] data-[state=active]:font-semibold text-muted-foreground hover:text-foreground active:scale-[0.98] flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                  <span>{t.kitchen.pulse.spendBalance}</span>
                </TabsTrigger>

                <TabsTrigger
                  value="pantry"
                  className="flex-1 py-2 px-3 text-xs font-medium rounded-xl text-center whitespace-nowrap transition-all duration-200 data-[state=active]:bg-card/90 data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-white/[0.1] data-[state=active]:font-semibold text-muted-foreground hover:text-foreground active:scale-[0.98] flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  <Package className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                  <span>{t.kitchen.pulse.depletedStaples}</span>
                  {depletedStaples.length > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 shrink-0 shadow-xs">
                      {depletedStaples.length}
                    </span>
                  )}
                </TabsTrigger>

                <TabsTrigger
                  value="activity"
                  className="flex-1 py-2 px-3 text-xs font-medium rounded-xl text-center whitespace-nowrap transition-all duration-200 data-[state=active]:bg-card/90 data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-white/[0.1] data-[state=active]:font-semibold text-muted-foreground hover:text-foreground active:scale-[0.98] flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  <Receipt className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                  <span>{t.kitchen.pulse.restockFeed}</span>
                  {checkoutsList.length > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-muted/80 text-muted-foreground border border-border/80 shrink-0">
                      {checkoutsList.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </DialogHeader>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-8 pt-4 sm:p-6 space-y-6 overscroll-contain">
          {isLoading ? (
            <SpacePulseModalSkeleton />
          ) : !stats ? (
            <Card className="border border-white/[0.08] bg-card/80 backdrop-blur-md rounded-3xl p-6 text-center space-y-3 shadow-md">
              <div className="w-10 h-10 mx-auto rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                <AlertCircle className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-sm font-semibold text-foreground">{t.kitchen.pulse.couldNotLoad}</p>
              <p className="text-xs text-muted-foreground">
                {t.kitchen.pulse.networkError}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadData(true)}
                className="rounded-full text-xs h-8 px-4 border-border cursor-pointer"
              >
                {t.kitchen.pulse.retry}
              </Button>
            </Card>
          ) : (
            <>
              {/* TAB 1: Spending & Balance */}
              {activeTab === "spending" && (
                <div className="space-y-5 animate-in fade-in-50 duration-200">
                  {stats.totalReceiptsCount === 0 && stats.totalSpendCurrentMonth === 0 ? (
                    <Card className="border border-white/[0.08] bg-card/80 backdrop-blur-md rounded-3xl p-8 text-center space-y-3 shadow-lg">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-muted border border-border/80 flex items-center justify-center text-muted-foreground">
                        <CreditCard className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-foreground">
                          {t.kitchen.pulse.noRuns}
                        </h3>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          {t.pulse.emptyMonthSub}
                        </p>
                      </div>
                    </Card>
                  ) : (
                    <>
                      {/* Hero Spend Card */}
                      <Card className="border border-white/[0.08] bg-card/80 backdrop-blur-md rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-cyan-400" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                              {t.kitchen.pulse.monthlySpend}
                            </span>
                          </div>
                          <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs font-mono rounded-full px-2.5">
                            {stats.monthLabel}
                          </Badge>
                        </div>

                        <div className="flex items-baseline gap-3 flex-wrap">
                          <span className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight font-mono">
                            {formatCurrency(stats.totalSpendCurrentMonth, "EUR")}
                          </span>

                          {/* Month-over-month Trend Indicator */}
                          {stats.spendTrendDirection === "down" && (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono gap-1 rounded-full px-2.5 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                              <TrendingDown className="w-3 h-3 text-emerald-400" />
                              <span>-{stats.spendTrendPercentage}% {t.kitchen.pulse.vsLastMonth}</span>
                            </Badge>
                          )}

                          {stats.spendTrendDirection === "up" && (
                            <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono gap-1 rounded-full px-2.5 shadow-[0_0_10px_rgba(245,158,11,0.15)]">
                              <TrendingUp className="w-3 h-3 text-amber-400" />
                              <span>+{stats.spendTrendPercentage}% {t.kitchen.pulse.vsLastMonth}</span>
                            </Badge>
                          )}

                          {stats.spendTrendDirection === "flat" && (
                            <Badge variant="secondary" className="text-xs font-mono bg-muted text-muted-foreground border border-border gap-1 rounded-full px-2.5">
                              <Minus className="w-3 h-3" />
                              <span>0% {t.kitchen.pulse.vsLastMonth}</span>
                            </Badge>
                          )}

                          {stats.spendTrendDirection === "new" && (
                            <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs font-mono gap-1 rounded-full px-2.5">
                              <Sparkles className="w-3 h-3" />
                              <span>{t.kitchen.pulse.firstMonth}</span>
                            </Badge>
                          )}
                        </div>

                        {/* Comparison note & quick stats */}
                        <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border/60">
                          <span>{t.kitchen.pulse.prevMonthSpend}</span>
                          <span className="font-mono font-medium text-foreground">
                            {formatCurrency(stats.totalSpendPreviousMonth, "EUR")}
                          </span>
                        </div>
                      </Card>

                      {/* Real "My Impact" Checkout Breakdown (with intentional subtle indigo highlight) */}
                      <Card className="border border-indigo-500/20 bg-card/80 backdrop-blur-md rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-indigo-400" />
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                              {t.kitchen.pulse.myImpact}
                            </h4>
                          </div>
                          {stats.userReceiptsCount > 0 && (
                            <Badge variant="secondary" className="text-xs font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-2.5 shadow-xs">
                              {stats.userHabitRole.roleTitle}
                            </Badge>
                          )}
                        </div>

                        {stats.userReceiptsCount === 0 && stats.userSpend === 0 && (!stats.userSettlement || stats.userSettlement.pendingRefundAmount === 0) ? (
                          <div className="py-6 px-4 rounded-2xl bg-muted/20 border border-dashed border-border/70 text-center space-y-1.5">
                            <p className="text-xs font-semibold text-foreground">
                              {t.kitchen.pulse.noCheckoutsLogged}
                            </p>
                            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                              {t.kitchen.pulse.noCheckoutsLoggedDesc}
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="p-3.5 rounded-2xl bg-indigo-500/[0.04] border border-indigo-500/20 space-y-1">
                                <span className="text-[11px] text-muted-foreground">{t.kitchen.pulse.personalSpend}</span>
                                <div className="text-lg font-bold font-mono text-indigo-400">
                                  {formatCurrency(stats.userSpend, "EUR")}
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                  {t.kitchen.pulse.totalSpendShare.replace("{percentage}", String(stats.userSpendSharePercentage))}
                                </span>
                              </div>

                              <div className="p-3.5 rounded-2xl bg-cyan-500/[0.04] border border-cyan-500/20 space-y-1">
                                <span className="text-[11px] text-muted-foreground">{t.kitchen.pulse.personalRuns}</span>
                                <div className="text-lg font-bold font-mono text-cyan-400">
                                  {stats.userReceiptsCount} <span className="text-xs font-normal text-muted-foreground">/ {stats.totalReceiptsCount}</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                  {t.kitchen.pulse.householdRunsShare.replace("{percentage}", String(stats.userHabitRole.runPercentage))}
                                </span>
                              </div>

                              <div className="p-3.5 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/20 space-y-1">
                                <span className="text-[11px] text-muted-foreground">{t.kitchen.pulse.settlementStatus}</span>
                                <div className="text-lg font-bold font-mono">
                                  {stats.userSettlement.pendingRefundAmount > 0 ? (
                                    <span className="text-amber-400">
                                      +{formatCurrency(stats.userSettlement.pendingRefundAmount, "EUR")}
                                    </span>
                                  ) : (
                                    <span className="text-emerald-400">{t.kitchen.pulse.balanced}</span>
                                  )}
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                  {stats.userSettlement.pendingRefundAmount > 0
                                    ? t.kitchen.pulse.owedToYou.replace("{count}", String(stats.userSettlement.pendingRefundsCount))
                                    : t.kitchen.pulse.allRefundsSettled}
                                </span>
                              </div>
                            </div>

                            <p className="text-xs text-muted-foreground">
                              {stats.userHabitRole.roleDescription} (
                              {t.kitchen.pulse.avgContributionPerRun.replace(
                                "{amount}",
                                formatCurrency(stats.userAverageContribution, "EUR")
                              )}
                              )
                            </p>
                          </>
                        )}
                      </Card>

                      {/* 2-Column Metrics: Basket Size & Category Footprint */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Average Basket Size */}
                        <Card className="border border-white/[0.08] bg-card/80 backdrop-blur-md rounded-3xl p-5 shadow-lg space-y-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-medium">{t.kitchen.pulse.avgHouseholdBasket}</span>
                            <ShoppingBag className="w-3.5 h-3.5 text-cyan-400" />
                          </div>
                          <div className="text-2xl font-bold font-mono text-foreground">
                            {formatCurrency(stats.averageBasketSize, "EUR")}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {t.kitchen.pulse.avgBasketDesc
                              .replace("{count}", String(stats.totalReceiptsCount))
                              .replace(
                                "{runs}",
                                stats.totalReceiptsCount === 1
                                  ? t.kitchen.pulse.runSingular
                                  : t.kitchen.pulse.runPlural
                              )}
                          </p>
                        </Card>

                        {/* Top Store Footprint */}
                        <Card className="border border-white/[0.08] bg-card/80 backdrop-blur-md rounded-3xl p-5 shadow-lg space-y-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-medium">{t.kitchen.pulse.primaryStoreFootprint}</span>
                            <Store className="w-3.5 h-3.5 text-indigo-400" />
                          </div>
                          <div className="text-2xl font-bold text-foreground truncate">
                            {stats.userCategoryFootprint
                              ? stats.userCategoryFootprint.categoryName
                              : stats.categoryBreakdown[0]?.name || "Local Supermarket"}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {stats.userCategoryFootprint
                              ? stats.userCategoryFootprint.displayText
                              : t.kitchen.pulse.storeSpendingShare.replace(
                                  "{percentage}",
                                  String(stats.categoryBreakdown[0]?.percentage || 0)
                                )}
                          </p>
                        </Card>
                      </div>
                    </>
                  )}

                  {/* Merchant & Category Spending Breakdown */}
                  <Card className="border border-white/[0.08] bg-card/80 backdrop-blur-md rounded-3xl p-5 sm:p-6 shadow-xl space-y-3.5">
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
                          ? t.kitchen.pulse.storeSingular
                          : t.kitchen.pulse.storePlural}
                      </span>
                    </div>

                    {stats.categoryBreakdown.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">
                        {t.pulse.noMerchantData}
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
                                  className="text-[10px] font-mono bg-muted text-foreground border border-border px-2 py-0 rounded-full"
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
                  {/* Stock Health Banner: Health & Stock with Emerald gradient glow */}
                  <Card className="border border-white/[0.08] bg-card/80 backdrop-blur-md rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                          {t.kitchen.pulse.inventoryHealth}
                        </h4>
                      </div>
                      {stats.pantryStockRatio.outOfStock > 0 ? (
                        <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium gap-1 rounded-full px-2.5 shadow-[0_0_10px_rgba(245,158,11,0.15)]">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          <span>{t.kitchen.pulse.depletedCount.replace("{count}", String(stats.pantryStockRatio.outOfStock))}</span>
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium gap-1 rounded-full px-2.5 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>{t.kitchen.pulse.fullyStocked}</span>
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-3xl font-extrabold text-foreground font-mono">
                          {stats.pantryStockRatio.inStockPercentage}%
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">
                          {t.kitchen.pulse.stockSummary
                            .replace("{inStock}", String(stats.pantryStockRatio.inStock))
                            .replace("{outOfStock}", String(stats.pantryStockRatio.outOfStock))}
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden p-0.5">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(16,185,129,0.35)]"
                          style={{ width: `${stats.pantryStockRatio.inStockPercentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border/60">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{t.kitchen.pulse.restockResponseTime}:</span>
                      </div>
                      <span className="font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-xs">
                        {stats.vitals.compactRestockLatency || stats.vitals.formattedRestockLatency || t.kitchen.pulse.instant}
                      </span>
                    </div>
                  </Card>

                  {/* Top Depleted Staples List: Warm amber accents */}
                  <Card className="border border-white/[0.08] bg-card/80 backdrop-blur-md rounded-3xl p-5 sm:p-6 shadow-xl space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                          {t.kitchen.pulse.depletedNeedingRestock}
                        </h4>
                      </div>
                      <Badge variant="secondary" className="text-xs font-mono bg-muted text-muted-foreground border border-border rounded-full px-2.5">
                        {depletedStaples.length} {depletedStaples.length === 1 ? t.kitchen.ledger.item : t.kitchen.ledger.items}
                      </Badge>
                    </div>

                    {depletedStaples.length === 0 ? (
                      <div className="py-6 text-center space-y-2">
                        <div className="w-10 h-10 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <p className="text-xs font-medium text-foreground">{t.kitchen.pulse.allStaplesInStock}</p>
                        <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                          {t.kitchen.pulse.allStaplesInStockDesc}
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/60">
                        {depletedStaples.map((item: PantryItem) => (
                          <div
                            key={item.id}
                            className="py-2.5 flex items-center justify-between gap-3 text-sm hover:bg-muted/40 px-2 rounded-2xl transition"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.5)] shrink-0" />
                              <span className="font-medium text-foreground truncate">
                                {item.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                                {formatRelativeDate(item.updated_at || item.created_at, locale)}
                              </span>
                              <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono px-2.5 py-0.5 rounded-full">
                                {t.kitchen.pulse.depleted}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Frequently Restocked Items */}
                  <Card className="border border-white/[0.08] bg-card/80 backdrop-blur-md rounded-3xl p-5 sm:p-6 shadow-xl space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-amber-400" />
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                          {t.kitchen.pulse.frequentlyRestocked}
                        </h4>
                      </div>
                      <Badge variant="secondary" className="text-xs font-mono bg-muted text-muted-foreground border border-border rounded-full px-2.5">
                        {t.kitchen.pulse.frequentlyRestockedSub.replace("{count}", String(stats.allTopItems.length))}
                      </Badge>
                    </div>

                    {stats.allTopItems.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">
                        {t.kitchen.pulse.noRestockedThisMonth}
                      </p>
                    ) : (
                      <div className="divide-y divide-border/60">
                        {stats.allTopItems.map((item, index) => (
                          <div
                            key={item.name}
                            className="py-2.5 flex items-center justify-between gap-3 text-sm hover:bg-muted/40 px-2 rounded-2xl transition"
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
                                className="text-xs font-mono bg-muted text-foreground border border-border px-2.5 py-0.5 rounded-full"
                              >
                                {t.kitchen.pulse.restockedTimes.replace("{count}", String(item.count))}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Dead Stock / Idle Items Warning */}
                  {stats.deadStockItems.length > 0 && (
                    <Card className="border border-white/[0.08] bg-card/80 backdrop-blur-md rounded-3xl p-5 shadow-xl space-y-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                          {t.kitchen.pulse.untouchedStaplesSub}
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {stats.deadStockItems.slice(0, 4).map((dead) => (
                          <div
                            key={dead.name}
                            className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/70 text-xs"
                          >
                            <span className="font-medium text-foreground truncate max-w-[65%]">
                              {dead.name}
                            </span>
                            <Badge variant="secondary" className="text-[10px] font-mono bg-muted text-muted-foreground rounded-full px-2">
                              {t.kitchen.pulse.idleDays.replace("{days}", String(dead.idleDays))}
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
                      <Receipt className="w-4 h-4 text-indigo-400" />
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                        {t.kitchen.pulse.recentRestocks}
                      </h4>
                    </div>
                    <Badge variant="secondary" className="text-xs font-mono bg-muted text-muted-foreground border border-border rounded-full px-2.5">
                      {t.kitchen.pulse.logsCount.replace("{count}", String(checkoutsList.length))}
                    </Badge>
                  </div>

                  {checkoutsList.length === 0 ? (
                    <Card className="border border-white/[0.08] bg-card/80 backdrop-blur-md rounded-3xl p-8 text-center space-y-3 shadow-lg">
                      <div className="w-10 h-10 mx-auto rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                        <ShoppingBag className="w-5 h-5 text-indigo-400" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">{t.kitchen.pulse.noRecentRestocks}</p>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        {t.kitchen.pulse.noRecentRestocksDesc}
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
                            className="border border-white/[0.08] bg-card/80 backdrop-blur-md rounded-3xl p-4 sm:p-5 shadow-lg space-y-3 hover:border-border/80 transition"
                          >
                            {/* Top row: store, date, amount */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-0.5 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm text-foreground truncate">
                                    {checkout.store_name || t.kitchen.pulse.generalRestock}
                                  </span>
                                  {checkout.username && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] font-mono bg-muted text-muted-foreground px-2 py-0 rounded-full"
                                    >
                                      @{checkout.username}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <span>{formatRelativeDate(checkout.created_at, locale)}</span>
                                  <span>·</span>
                                  <span>{formatShortDate(checkout.created_at, locale)}</span>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="font-mono font-bold text-sm text-foreground">
                                  {formatCurrency(checkout.total_claimed_amount, checkout.currency || currency)}
                                </div>
                                <div className="flex items-center gap-1 justify-end pt-1">
                                  {checkout.is_refunded ? (
                                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono px-2 py-0 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.15)]">
                                      {t.kitchen.ledger.settled}
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono px-2 py-0 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.15)]">
                                      {t.kitchen.ledger.pending}
                                    </Badge>
                                  )}
                                  {hasReceipt && (
                                    <Badge variant="secondary" className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0 rounded-full" title={t.kitchen.pulse.receiptAttached}>
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
                                  <span>{t.kitchen.pulse.itemsRestocked.replace("{count}", String(itemsCount))}</span>
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
                                      {t.kitchen.pulse.moreItems.replace("{count}", String(itemsCount - 6))}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Note if present */}
                            {checkout.note && (
                              <p className="text-xs text-muted-foreground italic bg-muted/30 p-2.5 rounded-2xl border border-border/40">
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
        <div className="p-4 sm:p-5 border-t border-white/[0.08] bg-muted/20 backdrop-blur-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs text-muted-foreground shrink-0">
          <div className="hidden sm:flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="truncate">{t.kitchen.pulse.liveSync}</span>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto rounded-full text-xs font-semibold h-9 px-5 border border-border/80 shrink-0 cursor-pointer shadow-xs"
          >
            {t.common.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SpacePulseModal;
