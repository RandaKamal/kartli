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

export function getSpaceIcon(spaceType?: string, className: string = "w-3.5 h-3.5") {
  switch (spaceType) {
    case "FAMILY":
      return <Heart className={cn(className, "text-rose-500 dark:text-rose-400")} />;
    case "OFFICE":
      return <Briefcase className={cn(className, "text-teal-600 dark:text-teal-400")} />;
    case "NEUTRAL":
      return <Layers className={cn(className, "text-indigo-600 dark:text-indigo-400")} />;
    default:
      return <Home className={cn(className, "text-amber-600 dark:text-amber-400")} />;
  }
}

export function getSpaceLabel(spaceType?: string) {
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

const AVATAR_PALETTES = [
  "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30",
];

function getAvatarPalette(name: string, index: number) {
  let hash = index;
  for (let i = 0; i < name.length; i++) {
    hash = (hash + name.charCodeAt(i)) % AVATAR_PALETTES.length;
  }
  return AVATAR_PALETTES[hash];
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
    <div className="flex items-center gap-2.5">
      <div className="flex items-center overflow-hidden py-0.5">
        {displayMembers.map((name, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <span
                className="inline-flex items-center justify-center h-7 w-7 rounded-full text-[11px] font-bold ring-2 ring-card bg-secondary text-foreground -ml-2 first:ml-0 shadow-sm uppercase shrink-0 cursor-default select-none"
              >
                {getInitials(name)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {name}
            </TooltipContent>
          </Tooltip>
        ))}
        {remaining > 0 && (
          <span
            className="inline-flex items-center justify-center h-7 w-7 rounded-full text-[11px] font-bold ring-2 ring-card bg-secondary text-foreground -ml-2 first:ml-0 shadow-sm font-mono shrink-0"
          >
            +{remaining}
          </span>
        )}
      </div>
      <span className="text-xs text-muted-foreground font-medium">
        {displayCount} {displayCount === 1 ? "member" : "members"}
      </span>
    </div>
  );
}

export interface SpaceCardProps {
  kitchenWithStats: UserKitchenWithStats;
  baseUrl: string;
  variant?: "hero" | "card";
}

export function SpaceCard({
  kitchenWithStats,
  baseUrl,
  variant = "card",
}: SpaceCardProps) {
  const { t } = useTranslation();
  const { kitchen, membership, memberCount, neededItemCount, sampleNeededItems } =
    kitchenWithStats;

  const targetUrl = `/kitchen/${kitchen.id}`;
  const guestLink = `${baseUrl}/kitchen/view/${kitchen.public_view_token}`;

  if (variant === "hero") {
    return (
      <div className="group relative w-full p-8 rounded-3xl bg-card border border-border/80 shadow-2xl backdrop-blur-xl overflow-hidden transition-all duration-300">
        {/* Top Micro-border Highlight */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent pointer-events-none" />

        {/* Subtle Ambient Radial Glow */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Hero Info */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-foreground bg-secondary/80 border border-border/70 px-3 py-1 rounded-xl shadow-2xs">
                {getSpaceIcon(kitchen.space_type, "w-3.5 h-3.5")}
                <span>{getSpaceLabel(kitchen.space_type)}</span>
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-secondary text-muted-foreground font-semibold border border-border/40">
                {membership.role}
              </span>
            </div>

            <div className="space-y-1.5">
              <Link
                href={targetUrl}
                className="group-hover:text-primary transition-colors inline-block"
              >
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground group-hover:text-primary transition-colors leading-tight">
                  {kitchen.name}
                </h2>
              </Link>
              <p className="text-xs text-muted-foreground">
                Connected as{" "}
                <span className="text-foreground font-semibold">
                  {capitalize(membership.kitchen_display_name)}
                </span>
              </p>
            </div>

            <div className="pt-2">
              <MemberAvatarCluster
                members={kitchenWithStats.sampleMembers}
                totalCount={memberCount}
                size="md"
              />
            </div>
          </div>

          {/* Middle Column: Quick-Status / Live Pantry Health Gauge */}
          <div className="lg:col-span-4">
            <div className="rounded-2xl bg-muted/40 border border-border/70 p-5 space-y-3.5 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  {neededItemCount === 0 ? (
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    </span>
                  ) : (
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                    </span>
                  )}
                  <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-muted-foreground">
                    Pantry Health
                  </span>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground/70">
                  Live Status
                </span>
              </div>

              {neededItemCount === 0 ? (
                <div className="space-y-1">
                  <div className="text-base font-bold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>All essentials stocked</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Queue clear &bull; Kitchen ready for cooking
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="text-base font-bold text-foreground flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>
                      {neededItemCount}{" "}
                      {neededItemCount === 1 ? "item needed" : "items needed"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {sampleNeededItems.slice(0, 3).map((item, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-medium text-foreground bg-background border border-border/80 px-2.5 py-1 rounded-lg truncate max-w-[130px] shadow-2xs"
                      >
                        {item}
                      </span>
                    ))}
                    {neededItemCount > 3 && (
                      <span className="text-[11px] font-mono text-muted-foreground px-2 py-1 rounded-lg bg-background/60 border border-border/40">
                        +{neededItemCount - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

            {/* Right Column: Actions */}
            <div className="lg:col-span-3 flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end justify-center gap-3">
              <Link
                href={targetUrl}
                className="rounded-2xl px-6 py-3.5 bg-primary text-primary-foreground font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-sm flex items-center justify-center gap-2 group w-full lg:w-auto"
              >
                <span>{t.dashboard.openSpace}</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>

              <CopyButton
                text={guestLink}
                label={t.dashboard.guestLink}
                tooltip="Quick read-only supermarket view for household members and guests, not a member onboarding invite."
                size="sm"
                className="rounded-xl px-4 py-2.5 text-xs font-medium bg-secondary/80 hover:bg-secondary border border-border/80 text-foreground transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs w-full lg:w-auto"
              />
            </div>
        </div>
      </div>
    );
  }

  // Standard Card Layout (Multiple Spaces Grid)
  return (
    <div className="group relative flex flex-col justify-between rounded-3xl bg-card border border-border/80 hover:border-foreground/20 shadow-xs hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/40 transition-all duration-300 overflow-hidden w-full">
      {/* Top Micro-border Highlight */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent group-hover:via-primary group-hover:h-[2.5px] transition-all duration-300 pointer-events-none z-20" />

      {/* Terminal-Style Header Row */}
      <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-border/50 bg-muted/25">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium text-foreground bg-background/90 border border-border/70 px-2.5 py-0.5 rounded-md shadow-2xs">
            {getSpaceIcon(kitchen.space_type)}
            <span>{getSpaceLabel(kitchen.space_type)}</span>
          </span>

          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-secondary text-muted-foreground font-semibold border border-border/40">
            {membership.role}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground/70">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
          <span>
            {new Date(kitchen.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="flex flex-col justify-between flex-1 relative z-0 p-5 sm:p-6 space-y-5">
        {/* Whole Card Overlay Link */}
        <Link
          href={targetUrl}
          className="absolute inset-0 z-0 rounded-b-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Open ${kitchen.name}`}
        />

        <div className="space-y-4 relative z-0 pointer-events-none">
          {/* Space Name & Identity */}
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {kitchen.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              Connected as{" "}
              <span className="text-foreground font-semibold">
                {capitalize(membership.kitchen_display_name)}
              </span>
            </p>
          </div>

          {/* Member Avatar Cluster */}
          <div className="pt-1">
            <MemberAvatarCluster
              members={kitchenWithStats.sampleMembers}
              totalCount={memberCount}
              size="sm"
            />
          </div>

          {/* Restock Status / Pantry Gauge */}
          {neededItemCount > 0 ? (
            <div className="rounded-xl bg-muted/40 border border-border/60 p-3 transition-colors group-hover:border-border/90">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                </span>
                <span className="text-[11px] font-mono font-medium text-amber-600 dark:text-amber-400 shrink-0">
                  {neededItemCount} {neededItemCount === 1 ? "needed" : "needed"}:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  {sampleNeededItems.slice(0, 3).map((item, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] font-medium text-foreground bg-background border border-border/70 px-2 py-0.5 rounded-md truncate max-w-[130px] shadow-2xs"
                    >
                      {item}
                    </span>
                  ))}
                  {neededItemCount > 3 && (
                    <span className="text-[10px] font-mono text-muted-foreground/80 px-1.5 py-0.5 rounded bg-background/60 border border-border/40">
                      +{neededItemCount - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-muted/30 border border-border/40 px-3.5 py-2.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              </span>
              <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                All stocked:
              </span>
              <span className="text-foreground/80 font-medium text-xs">
                Pantry inventory ready
              </span>
            </div>
          )}
        </div>

        {/* Card Action Footer */}
        <div className="pt-4 border-t border-border/60 flex items-center justify-between gap-3 relative z-0 pointer-events-none">
          <span className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-primary text-primary-foreground shadow-sm group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-200">
            <span>{t.dashboard.openSpace}</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
          </span>

          <div className="relative z-10 pointer-events-auto">
            <CopyButton
              text={guestLink}
              label={t.dashboard.guestLink}
              tooltip="Quick read-only supermarket view for household members and guests, not a member onboarding invite."
              size="sm"
              className="text-xs font-medium px-3 py-2 rounded-xl bg-secondary/80 hover:bg-secondary border border-border/70 hover:border-border text-foreground transition-all duration-200 shadow-2xs flex items-center gap-1.5 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
