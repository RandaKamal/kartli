"use client";

import Link from "next/link";
import {
  Plus,
  Settings,
  UtensilsCrossed,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardInviteJoin } from "@/components/DashboardInviteJoin";
import { SpaceCard } from "@/components/SpaceCard";
import type { UserKitchenWithStats } from "@/lib/kitchen";
import { useTranslation } from "@/lib/i18n";

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
  const isSingleSpace = userKitchens.length === 1;

  return (
    <div className="relative max-w-5xl mx-auto w-full px-6 py-12">
      {/* Ambient Glow: Centered background radial blur */}
      <div className="w-[520px] h-[300px] bg-primary/10 rounded-full blur-[140px] -z-10 pointer-events-none absolute top-6 left-1/2 -translate-x-1/2" />

      {/* 1. EDITORIAL HEADER & GREETING */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {t.dashboard.welcome}, {displayName}
            </h1>
            <span className="text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/80">
              {userKitchens.length} {userKitchens.length === 1 ? t.dashboard.space : t.dashboard.spaces}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t.dashboard.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/profile"
            className="h-9 px-4 rounded-xl bg-secondary/60 hover:bg-secondary border border-border text-foreground font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Settings className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{t.dashboard.settings}</span>
          </Link>
          <Link
            href="/kitchen/new"
            className="h-9 px-4 rounded-xl bg-foreground text-background font-semibold text-xs flex items-center gap-1.5 shadow-sm hover:opacity-90 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.dashboard.newSpace}</span>
          </Link>
        </div>
      </div>

      {/* 2. SPACES SECTION (EMPTY STATE, SINGLE-SPACE HERO, OR GRID) */}
      <div className="mt-8">
        {userKitchens.length === 0 ? (
          /* EMPTY STATE ONBOARDING */
          <div className="max-w-2xl mx-auto py-4 sm:py-6">
            <div className="relative overflow-hidden rounded-3xl bg-card border border-border/80 shadow-xl backdrop-blur-xl p-8 sm:p-10 text-center space-y-8">
              {/* Subtle top micro-border highlight */}
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent pointer-events-none" />

              {/* Welcome culinary icon & badge */}
              <div className="flex flex-col items-center space-y-3.5">
                <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
                  <UtensilsCrossed className="w-8 h-8 text-primary" />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-xs font-mono font-medium text-muted-foreground border border-border/70">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Welcome to kartli</span>
                </div>

                <div className="space-y-2 max-w-md">
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    {t.dashboard.emptyTitle}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {t.dashboard.emptySubtitle}
                  </p>
                </div>
              </div>

              {/* Step-by-Step Onboarding Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left relative pt-1">
                {/* Step 1: Create a kitchen */}
                <div className="flex flex-col justify-between rounded-2xl bg-muted/30 border border-border/80 p-6 space-y-5">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold font-mono flex items-center justify-center shadow-xs">
                        1
                      </span>
                      <h3 className="font-bold text-foreground text-sm tracking-tight">
                        {t.dashboard.step1Title}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t.dashboard.step1Desc}
                    </p>
                  </div>

                  <Button
                    asChild
                    className="rounded-xl font-semibold shadow-sm hover:shadow-md transition-all w-full text-xs h-10"
                  >
                    <Link href="/kitchen/new" className="flex items-center justify-center gap-1.5">
                      <Plus className="w-4 h-4" />
                      <span>{t.dashboard.step1Button}</span>
                    </Link>
                  </Button>
                </div>

                {/* Step 2: Paste invite code */}
                <div className="flex flex-col justify-between rounded-2xl bg-muted/30 border border-border/80 p-6 space-y-5">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-secondary text-foreground border border-border text-xs font-bold font-mono flex items-center justify-center shadow-xs">
                        2
                      </span>
                      <h3 className="font-bold text-foreground text-sm tracking-tight">
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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                {t.dashboard.commandCenter}
              </h2>
            </div>
            <SpaceCard
              kitchenWithStats={userKitchens[0]}
              baseUrl={baseUrl}
              variant="hero"
            />
          </div>
        ) : (
          /* MULTIPLE SPACES GRID */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                {t.dashboard.activeSpaces} ({userKitchens.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {userKitchens.map((kitchenWithStats) => (
                <SpaceCard
                  key={kitchenWithStats.kitchen.id}
                  kitchenWithStats={kitchenWithStats}
                  baseUrl={baseUrl}
                  variant="card"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
