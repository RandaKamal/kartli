"use client";

import Link from "next/link";
import {
  ArrowRight,
  Home,
  Heart,
  Briefcase,
  Layers,
  ShoppingCart,
  CheckCircle2,
} from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { UserKitchenWithStats } from "@/lib/kitchen";
import { capitalize, cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { KitchenMuteButton } from "@/components/KitchenMuteButton";
import type { PushStatus } from "@/components/NotificationToggle";

export function getSpaceIcon(spaceType?: string, className: string = "w-3.5 h-3.5") {
  switch (spaceType) {
    case "FAMILY":
      return <Heart className={cn(className, "text-muted-foreground")} />;
    case "OFFICE":
      return <Briefcase className={cn(className, "text-muted-foreground")} />;
    case "NEUTRAL":
      return <Layers className={cn(className, "text-muted-foreground")} />;
    default:
      return <Home className={cn(className, "text-muted-foreground")} />;
  }
}

export function getSpaceLabel(spaceType?: string, t?: any) {
  if (t?.kitchenSettings?.types) {
    switch (spaceType) {
      case "FAMILY":
        return t.kitchenSettings.types.family;
      case "OFFICE":
        return t.kitchenSettings.types.office;
      case "NEUTRAL":
        return t.kitchenSettings.types.neutral;
      default:
        return t.kitchenSettings.types.flatshare;
    }
  }
  switch (spaceType) {
    case "FAMILY":
      return "Family Home";
    case "OFFICE":
      return "Studio & Office";
    case "NEUTRAL":
      return "Neutral Space";
    default:
      return "Flatshare (WG)";
  }
}

function getInitials(name: string): string {
  const clean = name.replace(/^@/, "").trim();
  if (!clean) return "?";
  const parts = clean.split(/\s+/);
  if (parts.length > 1) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export function MemberAvatarCluster({
  members = [],
  totalCount,
}: {
  members?: string[];
  totalCount: number;
  size?: "sm" | "md";
}) {
  const displayMembers = members.length > 0 ? members : [];
  const displayCount = Math.max(totalCount, displayMembers.length, 1);
  const remaining = Math.max(0, displayCount - displayMembers.length);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center overflow-hidden py-0.5">
        {displayMembers.map((name, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-semibold ring-1 ring-border bg-secondary text-foreground -ml-1.5 first:ml-0 uppercase shrink-0 cursor-default select-none">
                {getInitials(name)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {name}
            </TooltipContent>
          </Tooltip>
        ))}
        {remaining > 0 && (
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-semibold ring-1 ring-border bg-secondary text-foreground -ml-1.5 first:ml-0 font-mono shrink-0 tabular-nums">
            +{remaining}
          </span>
        )}
      </div>
      <span className="text-xs text-muted-foreground font-medium tabular-nums">
        {displayCount} {displayCount === 1 ? "member" : "members"}
      </span>
    </div>
  );
}

export interface SpaceCardProps {
  kitchenWithStats: UserKitchenWithStats;
  baseUrl: string;
  variant?: "hero" | "card";
  pushStatus: PushStatus;
}

export function SpaceCard({
  kitchenWithStats,
  baseUrl,
  variant = "card",
  pushStatus,
}: SpaceCardProps) {
  const { t, locale } = useTranslation();
  const { kitchen, membership, memberCount, neededItemCount, sampleNeededItems } =
    kitchenWithStats;

  const targetUrl = `/kitchen/${kitchen.id}`;
  const guestLink = `${baseUrl}/kitchen/view/${kitchen.public_view_token}`;

  if (variant === "hero") {
    return (
      <div className="w-full p-5 sm:p-6 rounded-xl bg-card border border-border/70 shadow-xs flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Column: Info */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-foreground bg-secondary/80 border border-border/70 px-2.5 py-0.5 rounded-md">
                {getSpaceIcon(kitchen.space_type, "w-3.5 h-3.5")}
                <span>{getSpaceLabel(kitchen.space_type, t)}</span>
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-secondary text-muted-foreground font-semibold border border-border/40">
                {membership.role === "ADMIN" ? t.kitchen.header.admin : t.kitchen.header.member}
              </span>
              <KitchenMuteButton
                kitchenId={kitchen.id}
                initialMuted={membership.notifications_muted ?? false}
                pushStatus={pushStatus}
              />
            </div>

            <div className="space-y-1">
              <Link
                href={targetUrl}
                className="hover:text-primary transition-colors inline-block"
              >
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground hover:text-primary transition-colors">
                  {kitchen.name}
                </h2>
              </Link>
              <p className="text-xs text-muted-foreground">
                Connected as{" "}
                <span className="text-foreground font-medium">
                  {capitalize(membership.kitchen_display_name)}
                </span>
              </p>
            </div>

            <div className="pt-1">
              <MemberAvatarCluster
                members={kitchenWithStats.sampleMembers}
                totalCount={memberCount}
                size="md"
              />
            </div>
          </div>

          {/* Middle Column: Status */}
          <div className="lg:col-span-4">
            <div className="rounded-lg bg-muted/40 border border-border/70 p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      neededItemCount === 0 ? "bg-emerald-500" : "bg-amber-500"
                    )}
                  />
                  <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-muted-foreground">
                    {t.dashboard.card.pantryHealth}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground/70">
                  {t.dashboard.card.liveStatus}
                </span>
              </div>

              {neededItemCount === 0 ? (
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{t.dashboard.card.allStocked}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t.dashboard.card.allStockedSub}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <ShoppingCart className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="tabular-nums">
                      {neededItemCount === 1
                        ? t.dashboard.card.itemsDepletedSingular
                        : t.dashboard.card.itemsDepleted.replace("{count}", String(neededItemCount))}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {sampleNeededItems.slice(0, 3).map((item, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-medium text-foreground bg-background border border-border/80 px-2 py-0.5 rounded-md truncate max-w-[130px]"
                      >
                        {item}
                      </span>
                    ))}
                    {neededItemCount > 3 && (
                      <span className="text-[11px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-background/60 border border-border/40 tabular-nums">
                        +{neededItemCount - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Actions */}
          <div className="lg:col-span-3 flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end justify-center gap-2.5">
            <Link
              href={targetUrl}
              className="h-8 px-4 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-medium text-xs flex items-center justify-center gap-1.5 shadow-xs hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors w-full lg:w-auto"
            >
              <span>{t.dashboard.openSpace}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <CopyButton
              text={guestLink}
              label={t.dashboard.guestLink}
              tooltip="Quick read-only supermarket view for household members and guests, not a member onboarding invite."
              size="sm"
              className="h-8 rounded-lg px-3 text-xs font-medium bg-secondary/70 hover:bg-secondary border border-border/70 text-foreground transition-colors flex items-center justify-center gap-1.5 cursor-pointer w-full lg:w-auto"
            />
          </div>
        </div>
      </div>
    );
  }

  // Standard Card Layout (Multiple Spaces Grid)
  return (
    <div className="group relative flex flex-col justify-between rounded-xl bg-card border border-border/70 hover:border-border transition-colors shadow-xs overflow-hidden w-full">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border/60 bg-muted/20">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium text-foreground bg-background border border-border/70 px-2 py-0.5 rounded-md">
            {getSpaceIcon(kitchen.space_type)}
            <span>{getSpaceLabel(kitchen.space_type, t)}</span>
          </span>

          <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground font-semibold border border-border/40">
            {membership.role === "ADMIN" ? t.kitchen.header.admin : t.kitchen.header.member}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground/70">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
            <span className="tabular-nums">
              {new Date(kitchen.created_at).toLocaleDateString(locale === "de" ? "de-DE" : "en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          <KitchenMuteButton
            kitchenId={kitchen.id}
            initialMuted={membership.notifications_muted ?? false}
            pushStatus={pushStatus}
          />
        </div>
      </div>

      {/* Card Content Body */}
      <div className="flex flex-col justify-between flex-1 relative z-0 p-4 sm:p-5 space-y-4">
        {/* Whole Card Overlay Link */}
        <Link
          href={targetUrl}
          className="absolute inset-0 z-0 rounded-b-xl focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label={`Open ${kitchen.name}`}
        />

        <div className="space-y-3 relative z-0 pointer-events-none">
          {/* Space Name & Identity */}
          <div className="space-y-0.5">
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {kitchen.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              Connected as{" "}
              <span className="text-foreground font-medium">
                {capitalize(membership.kitchen_display_name)}
              </span>
            </p>
          </div>

          {/* Member Avatar Cluster */}
          <div>
            <MemberAvatarCluster
              members={kitchenWithStats.sampleMembers}
              totalCount={memberCount}
              size="sm"
            />
          </div>

          {/* Restock Status / Pantry Gauge */}
          {neededItemCount > 0 ? (
            <div className="rounded-lg bg-muted/40 border border-border/60 p-2.5 transition-colors">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span className="text-[11px] font-mono font-medium text-amber-600 dark:text-amber-400 shrink-0 tabular-nums">
                  {neededItemCount === 1
                    ? t.dashboard.card.itemsDepletedSingular
                    : t.dashboard.card.itemsDepleted.replace("{count}", String(neededItemCount))}:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  {sampleNeededItems.slice(0, 3).map((item, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] font-medium text-foreground bg-background border border-border/70 px-2 py-0.5 rounded-md truncate max-w-[120px]"
                    >
                      {item}
                    </span>
                  ))}
                  {neededItemCount > 3 && (
                    <span className="text-[10px] font-mono text-muted-foreground/80 px-1.5 py-0.5 rounded bg-background/60 border border-border/40 tabular-nums">
                      +{neededItemCount - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-muted/30 border border-border/40 px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                {t.dashboard.card.allStocked}
              </span>
            </div>
          )}
        </div>

        {/* Card Action Footer */}
        <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2.5 relative z-0 pointer-events-none">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs transition-colors">
            <span>{t.dashboard.openSpace}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </span>

          <div className="relative z-10 pointer-events-auto">
            <CopyButton
              text={guestLink}
              label={t.dashboard.guestLink}
              tooltip="Quick read-only supermarket view for household members and guests, not a member onboarding invite."
              size="sm"
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-secondary/70 hover:bg-secondary border border-border/70 text-foreground transition-colors flex items-center gap-1.5 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
