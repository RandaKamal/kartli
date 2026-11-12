"use client";

import Link from "next/link";
import {
  Plus,
  Settings,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardInviteJoin } from "@/components/DashboardInviteJoin";
import { SpaceCard } from "@/components/SpaceCard";
import type { UserKitchenWithStats } from "@/lib/kitchen";
import { useTranslation } from "@/lib/i18n";
import { usePushNotifications } from "@/components/NotificationToggle";

export interface DashboardViewProps {
  userKitchens: UserKitchenWithStats[];
  displayName: string;
  baseUrl: string;
}

export function DashboardView({
  userKitchens,
  displayName,
  baseUrl,
}: DashboardViewProps) {
  const { t } = useTranslation();
  const { status: pushStatus } = usePushNotifications();
  const isSingleSpace = userKitchens.length === 1;

  return (
    <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      {/* 1. CLEAN EDITORIAL HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {t.dashboard.welcome}, {displayName}
          </h1>
          <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border/70 tabular-nums">
            {userKitchens.length} {userKitchens.length === 1 ? t.dashboard.space : t.dashboard.spaces}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/profile"
            className="h-8 px-3 rounded-lg bg-secondary/60 hover:bg-secondary border border-border/70 text-foreground font-medium text-xs flex items-center gap-1.5 transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{t.dashboard.settings}</span>
          </Link>
          <Link
            href="/kitchen/new"
            className="h-8 px-3 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-medium text-xs flex items-center gap-1.5 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.dashboard.newSpace}</span>
          </Link>
        </div>
      </div>

      {/* 2. SPACES SECTION (EMPTY STATE, SINGLE-SPACE HERO, OR GRID) */}
      <div>
        {userKitchens.length === 0 ? (
          /* EMPTY STATE ONBOARDING */
          <div className="max-w-2xl mx-auto py-6">
            <div className="rounded-xl bg-card border border-border/70 p-6 sm:p-8 text-center space-y-6 shadow-xs">
              <div className="flex flex-col items-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-secondary border border-border/70 flex items-center justify-center text-foreground">
                  <UtensilsCrossed className="w-6 h-6 text-muted-foreground" />
                </div>

                <div className="space-y-1 max-w-md">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                    {t.dashboard.emptyTitle}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {t.dashboard.emptySubtitle}
                  </p>
                </div>
              </div>

              {/* Step-by-Step Onboarding Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left pt-2">
                {/* Step 1: Create a kitchen */}
                <div className="flex flex-col justify-between rounded-lg bg-muted/30 border border-border/70 p-4 space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-bold font-mono flex items-center justify-center">
                        1
                      </span>
                      <h3 className="font-semibold text-foreground text-sm tracking-tight">
                        {t.dashboard.step1Title}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t.dashboard.step1Desc}
                    </p>
                  </div>

                  <Button
                    asChild
                    size="sm"
                    className="w-full text-xs h-8"
                  >
                    <Link href="/kitchen/new" className="flex items-center justify-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.dashboard.step1Button}</span>
                    </Link>
                  </Button>
                </div>

                {/* Step 2: Paste invite code */}
                <div className="flex flex-col justify-between rounded-lg bg-muted/30 border border-border/70 p-4 space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-secondary text-foreground border border-border/70 text-xs font-bold font-mono flex items-center justify-center">
                        2
                      </span>
                      <h3 className="font-semibold text-foreground text-sm tracking-tight">
                        {t.dashboard.step2Title}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t.dashboard.step2Desc}
                    </p>
                  </div>

                  <div className="w-full">
                    <DashboardInviteJoin />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : isSingleSpace ? (
          /* SINGLE SPACE COMMAND CENTER HERO CARD */
          <div className="space-y-3">
            <SpaceCard
              kitchenWithStats={userKitchens[0]}
              baseUrl={baseUrl}
              variant="hero"
              pushStatus={pushStatus}
            />
          </div>
        ) : (
          /* MULTIPLE SPACES GRID */
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userKitchens.map((kitchenWithStats) => (
                <SpaceCard
                  key={kitchenWithStats.kitchen.id}
                  kitchenWithStats={kitchenWithStats}
                  baseUrl={baseUrl}
                  variant="card"
                  pushStatus={pushStatus}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
