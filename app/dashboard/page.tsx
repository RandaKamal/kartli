import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getUserKitchensWithStats } from "@/lib/kitchen";
import {
  Plus,
  ArrowRight,
  ExternalLink,
  UtensilsCrossed,
  Home,
  Heart,
  Briefcase,
  Layers,
  Settings,
  Users,
  ShoppingCart,
  CheckCircle2,
  PackageCheck,
  Sparkles,
} from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/CopyButton";
import { DashboardInviteJoin } from "@/components/DashboardInviteJoin";
import { capitalize } from "@/lib/utils";

function getSpaceIcon(spaceType?: string) {
  switch (spaceType) {
    case "FAMILY":
      return <Heart className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />;
    case "OFFICE":
      return <Briefcase className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />;
    case "NEUTRAL":
      return <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />;
    default:
      return <Home className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
  }
}

function getSpaceLabel(spaceType?: string) {
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

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const userKitchens = await getUserKitchensWithStats(session.user.id);
  const headerList = await headers();
  const host = headerList.get("host") || "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") || "http";
  const baseUrl = `${protocol}://${host}`;

  const rawName = session.user.name || session.user.username || "there";
  const cleanName = rawName.replace(/^@/, "");
  const displayName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
  const isSingleSpace = userKitchens.length === 1;

  return (
    <div className="relative w-full py-4 sm:py-6">
      {/* Ambient Glow: Subtle, centered background radial blur behind the greeting */}
      <div className="w-[500px] h-[300px] bg-primary/10 rounded-full blur-[120px] -z-10 pointer-events-none absolute top-6 left-1/2 -translate-x-1/2" />

      {/* 1. EDITORIAL HEADER & GREETING */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Welcome back, {displayName}
            </h1>
            <span className="text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/80">
              {userKitchens.length} {userKitchens.length === 1 ? "Space" : "Spaces"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Your shared kitchens, studios, and culinary spaces.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/profile"
            className="text-xs font-semibold px-3 py-2 rounded-xl border border-border/80 bg-secondary/40 hover:bg-secondary text-foreground transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <Settings className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Settings</span>
          </Link>
          <Button
            asChild
            className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <Link href="/kitchen/new">
              <Plus className="w-3.5 h-3.5" />
              <span>New Space</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. SPACES GRID OR EMPTY STATE */}
      <div className="mt-8">
        {userKitchens.length === 0 ? (
          /* EMPTY STATE */
          <div className="space-y-6 max-w-xl mx-auto py-6">
            <Card className="border border-dashed border-border/80 bg-gradient-to-b from-card via-card to-muted/20 p-8 sm:p-12 text-center space-y-5 rounded-3xl shadow-sm">
              <div className="w-14 h-14 rounded-3xl bg-muted/60 border border-border flex items-center justify-center text-muted-foreground mx-auto shadow-xs">
                <UtensilsCrossed className="w-7 h-7 text-accent-brand" />
              </div>

              <div className="space-y-2">
                <CardTitle className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                  No active spaces yet
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Start your first flatshare, family kitchen, or studio space in seconds, or join an existing household with an invite code.
                </CardDescription>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button asChild size="default" className="rounded-xl font-semibold w-full sm:w-auto shadow-xs">
                  <Link href="/kitchen/new" className="flex items-center gap-1.5">
                    <Plus className="w-4 h-4" />
                    <span>Create New Space</span>
                  </Link>
                </Button>
              </div>

              {/* Paste Invite Code Widget */}
              <div className="pt-4 border-t border-border/60 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Or Join via Roommate Invite
                </p>
                <DashboardInviteJoin />
              </div>
            </Card>
          </div>
        ) : (
          /* ACTIVE SPACES GRID */
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Active Spaces
              </h2>
            </div>

            <div
              className={
                isSingleSpace
                  ? "grid grid-cols-1 max-w-2xl"
                  : userKitchens.length === 2
                  ? "grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl"
                  : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              }
            >
              {userKitchens.map(
                ({
                  kitchen,
                  membership,
                  memberCount,
                  neededItemCount,
                  sampleNeededItems,
                }) => {
                  const targetUrl = `/kitchen/${kitchen.id}`;
                  const guestUrl = `${baseUrl}/kitchen/view/${kitchen.public_view_token}`;

                  return (
                    <div
                      key={kitchen.id}
                      className="group relative flex flex-col justify-between rounded-2xl bg-card dark:bg-[#121215] border border-border/75 dark:border-white/[0.08] hover:border-foreground/20 dark:hover:border-white/20 shadow-xs hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/40 transition-all duration-300 overflow-hidden w-full min-w-0 md:min-w-[340px]"
                    >
                      {/* Top Micro-border Highlight: understated accent line reacting to hover */}
                      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent group-hover:via-primary group-hover:h-[2.5px] transition-all duration-300 pointer-events-none z-20" />

                      {/* Terminal-Style Header Row */}
                      <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-border/50 dark:border-white/[0.06] bg-muted/25 dark:bg-white/[0.02]">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium text-foreground bg-background/90 dark:bg-white/[0.05] border border-border/70 dark:border-white/[0.08] px-2.5 py-0.5 rounded-md shadow-2xs">
                            {getSpaceIcon(kitchen.space_type)}
                            <span>{getSpaceLabel(kitchen.space_type)}</span>
                          </span>

                          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-secondary text-muted-foreground font-semibold border border-border/40 dark:border-white/[0.04]">
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
                      <div
                        className={`flex flex-col justify-between flex-1 relative z-0 ${
                          isSingleSpace ? "p-6 sm:p-7 space-y-6" : "p-5 sm:p-6 space-y-5"
                        }`}
                      >
                        {/* Entire Card Overlay Link for smooth whole-card navigation */}
                        <Link
                          href={targetUrl}
                          className="absolute inset-0 z-0 rounded-b-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={`Open ${kitchen.name}`}
                        />

                        <div className="space-y-4 relative z-0 pointer-events-none">
                          {/* Space Name Hero Title & User Identity */}
                          <div className="space-y-1">
                            <h3
                              className={`font-black tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-1 ${
                                isSingleSpace ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
                              }`}
                            >
                              {kitchen.name}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              Connected as <span className="text-foreground font-semibold">{capitalize(membership.kitchen_display_name)}</span>
                            </p>
                          </div>

                          {/* Metrics / Status Row */}
                          <div className="flex items-center gap-3 text-xs pt-1">
                            <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                              <Users className="w-3.5 h-3.5 text-muted-foreground/80" />
                              <span>{memberCount} {memberCount === 1 ? "member" : "members"}</span>
                            </div>
                            <span className="text-muted-foreground/30 font-mono">&bull;</span>
                            <div className="flex items-center gap-1.5">
                              {neededItemCount > 0 ? (
                                <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                                  <ShoppingCart className="w-3.5 h-3.5" />
                                  <span>{neededItemCount} {neededItemCount === 1 ? "item needed" : "needed"}</span>
                                </span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5 text-xs">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Stocked</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Restock Queue Activity Preview Row */}
                          {sampleNeededItems.length > 0 ? (
                            <div className="rounded-xl bg-muted/40 dark:bg-white/[0.03] border border-border/60 dark:border-white/[0.06] p-3 transition-colors group-hover:border-border/90 dark:group-hover:border-white/10">
                              <div className="flex items-center gap-2.5">
                                <span className="relative flex h-2 w-2 shrink-0">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                                </span>
                                <span className="text-[11px] font-mono font-medium text-muted-foreground shrink-0">
                                  Needs restock:
                                </span>
                                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                  {sampleNeededItems.slice(0, 3).map((item, idx) => (
                                    <span
                                      key={idx}
                                      className="text-[11px] font-medium text-foreground bg-background dark:bg-[#18181c] border border-border/70 dark:border-white/[0.08] px-2 py-0.5 rounded-md truncate max-w-[130px] shadow-2xs"
                                    >
                                      {item}
                                    </span>
                                  ))}
                                  {neededItemCount > 3 && (
                                    <span className="text-[10px] font-mono text-muted-foreground/80 px-1.5 py-0.5 rounded bg-background/60 dark:bg-white/[0.04] border border-border/40">
                                      +{neededItemCount - 3} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-xl bg-muted/30 dark:bg-white/[0.02] border border-border/40 dark:border-white/[0.04] px-3.5 py-2.5 flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span className="font-mono text-[11px] text-muted-foreground">Queue clear:</span>
                              <span className="text-foreground/80 font-medium text-xs">All essential supplies stocked</span>
                            </div>
                          )}
                        </div>

                        {/* Card Action Footer */}
                        <div className="pt-4 border-t border-border/60 dark:border-white/[0.06] flex items-center justify-between gap-3 relative z-0 pointer-events-none">
                          {/* Open Space: Inviting primary action button */}
                          <span className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-primary text-primary-foreground shadow-sm group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-200">
                            <span>Open Space</span>
                            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                          </span>

                          {/* Copy Guest Link: Refined secondary button */}
                          <div className="relative z-10 pointer-events-auto">
                            <CopyButton
                              text={guestUrl}
                              label="Copy Guest Link"
                              size="sm"
                              className="text-xs font-medium px-3 py-2 rounded-xl bg-secondary/80 hover:bg-secondary border border-border/70 hover:border-border text-foreground transition-all duration-200 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
