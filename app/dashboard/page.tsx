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
      return <Heart className="w-3.5 h-3.5 text-rose-400" />;
    case "OFFICE":
      return <Briefcase className="w-3.5 h-3.5 text-teal-400" />;
    case "NEUTRAL":
      return <Layers className="w-3.5 h-3.5 text-indigo-400" />;
    default:
      return <Home className="w-3.5 h-3.5 text-amber-400" />;
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

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2 sm:py-4">
      {/* 1. ELEVATED HEADER & GREETING */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Welcome back, {displayName}
            </h1>
            <Badge
              variant="secondary"
              className="text-[11px] font-mono px-2 py-0.5 bg-muted/60"
            >
              {userKitchens.length} {userKitchens.length === 1 ? "Space" : "Spaces"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Your shared homes, studios, and spaces.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl font-semibold text-xs border-border/80 hover:bg-muted"
          >
            <Link href="/profile" className="flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Settings</span>
            </Link>
          </Button>

          <Button
            asChild
            size="sm"
            className="rounded-xl font-semibold text-xs shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 ring-1 ring-primary/20"
          >
            <Link href="/kitchen/new">
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Space</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. SPACES GRID OR EMPTY STATE */}
      <div className="space-y-6">
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
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Active Spaces
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {userKitchens.map(
                ({
                  kitchen,
                  membership,
                  memberCount,
                  neededItemCount,
                  sampleNeededItems,
                }) => {
                  const isAdmin = membership.role === "ADMIN";
                  const targetUrl = `/kitchen/${kitchen.id}`;
                  const guestUrl = `${baseUrl}/kitchen/view/${kitchen.public_view_token}`;

                  return (
                    <div
                      key={kitchen.id}
                      className="relative rounded-2xl border border-border bg-card p-5 transition-colors hover:border-foreground/20 flex flex-col justify-between group overflow-hidden space-y-5"
                    >
                      {/* Entire Card Overlay Link for accessibility and smooth navigation */}
                      <Link
                        href={targetUrl}
                        className="absolute inset-0 z-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`Open ${kitchen.name}`}
                      />

                      {/* Card Content Top */}
                      <div className="space-y-4 relative z-0 pointer-events-none">
                        {/* Header Row: Space Context + Role */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground bg-muted/60 px-2.5 py-1 rounded-xl border border-border/60">
                              {getSpaceIcon(kitchen.space_type)}
                              <span>{getSpaceLabel(kitchen.space_type)}</span>
                            </span>

                            <Badge
                              variant={isAdmin ? "accent" : "secondary"}
                              className="font-semibold text-[10px] uppercase tracking-wider px-2 py-0.5"
                            >
                              {membership.role}
                            </Badge>
                          </div>

                          <span className="text-[11px] text-muted-foreground font-mono">
                            {new Date(kitchen.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>

                        {/* Title & Display Name */}
                        <div>
                          <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors tracking-tight line-clamp-1">
                            {kitchen.name}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            As <strong className="text-foreground font-medium">{capitalize(membership.kitchen_display_name)}</strong>
                          </p>
                        </div>

                        {/* Live Contextual Stats Row */}
                        <div className="flex items-center gap-3 text-xs pt-1 border-t border-border/50">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Users className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{memberCount} {memberCount === 1 ? "member" : "members"}</span>
                          </div>
                          <span>&middot;</span>
                          <div className="flex items-center gap-1.5">
                            {neededItemCount > 0 ? (
                              <span className="text-amber-500 font-medium flex items-center gap-1">
                                <ShoppingCart className="w-3.5 h-3.5" />
                                <span>{neededItemCount} needed</span>
                              </span>
                            ) : (
                              <span className="text-primary font-medium flex items-center gap-1">
                                <PackageCheck className="w-3.5 h-3.5" />
                                <span>Stocked</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quick Peek: Needed Restock Items Pills */}
                        {sampleNeededItems.length > 0 ? (
                          <div className="space-y-1.5 pt-0.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                              Restock Queue:
                            </span>
                            <div className="flex flex-wrap gap-1.5 max-h-14 overflow-hidden">
                              {sampleNeededItems.slice(0, 3).map((item, idx) => (
                                <span
                                  key={idx}
                                  className="text-[11px] font-medium bg-muted/70 border border-border/70 text-foreground px-2 py-0.5 rounded-lg truncate max-w-[120px]"
                                >
                                  {item}
                                </span>
                              ))}
                              {neededItemCount > 3 && (
                                <span className="text-[11px] text-muted-foreground font-mono self-center px-1">
                                  +{neededItemCount - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="py-1 flex items-center gap-1.5 text-[11px] text-muted-foreground italic">
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>No urgent groceries on the list.</span>
                          </div>
                        )}
                      </div>

                      {/* Card Action Footer */}
                      <div className="pt-4 border-t border-border/70 flex items-center justify-between relative z-0 pointer-events-none">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                          <span>Open Space</span>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
                        </span>

                        <div className="pointer-events-auto relative z-10 flex items-center gap-1.5">
                          <CopyButton
                            text={guestUrl}
                            label="Copy Guest Link"
                            size="sm"
                          />
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
