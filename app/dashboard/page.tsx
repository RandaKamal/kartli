import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserKitchens } from "@/lib/kitchen";
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
} from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      return "Family";
    case "OFFICE":
      return "Office / Studio";
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

  const userKitchens = await getUserKitchens(session.user.id);

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2 sm:py-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <span>Welcome back, {capitalize(session.user.username)}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your shared households, grocery inventory, and receipt splits.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button asChild variant="outline" size="sm" className="rounded-xl font-semibold text-xs border-border hover:bg-muted">
            <Link href="/profile" className="flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Settings</span>
            </Link>
          </Button>

          <Button asChild size="sm" className="rounded-xl font-semibold shadow-xs">
            <Link href="/kitchen/new" className="flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              <span>New Kitchen</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Kitchens Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Your Active Kitchens ({userKitchens.length})
          </h2>
        </div>

        {userKitchens.length === 0 ? (
          <Card className="border-dashed border-border bg-card/60 p-10 sm:p-12 text-center space-y-4 rounded-3xl">
            <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground mx-auto">
              <UtensilsCrossed className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <CardTitle className="text-base font-bold text-foreground">
                You are not part of any kitchen yet
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Create a new kitchen workspace or ask a roommate for an invite link.
              </CardDescription>
            </div>
            <div className="pt-2">
              <Button asChild size="default" className="rounded-xl font-semibold">
                <Link href="/kitchen/new">Create your first kitchen</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {userKitchens.map(({ kitchen, membership }) => {
              const isAdmin = membership.role === "ADMIN";
              const targetUrl = `/kitchen/${kitchen.id}`;

              return (
                <Card
                  key={kitchen.id}
                  className="relative border border-border bg-card flex flex-col justify-between rounded-3xl p-6 hover:border-primary/50 transition-all group overflow-hidden shadow-xs hover:shadow-md"
                >
                  {/* Entire Card Overlay Link */}
                  <Link
                    href={targetUrl}
                    className="absolute inset-0 z-0 rounded-3xl focus:outline-none focus:ring-2 focus:ring-accent-brand"
                    aria-label={`Open ${kitchen.name}`}
                  />

                  <div className="space-y-3.5 relative z-0 pointer-events-none">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={isAdmin ? "accent" : "secondary"}
                          className="font-medium text-[10px] uppercase tracking-wider"
                        >
                          {membership.role}
                        </Badge>
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-medium bg-muted/50 px-2 py-0.5 rounded-lg border border-border/50">
                          {getSpaceIcon(kitchen.space_type)}
                          <span>{getSpaceLabel(kitchen.space_type)}</span>
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {new Date(kitchen.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                        {kitchen.name}
                      </h3>

                      <p className="text-xs text-muted-foreground mt-1">
                        Display Name: <strong className="text-foreground">{capitalize(membership.kitchen_display_name)}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="pt-5 border-t border-border/70 mt-5 flex items-center justify-between relative z-0 pointer-events-none">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <span>Open Dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </span>

                    <div className="pointer-events-auto relative z-10">
                      <Button
                        asChild
                        variant="secondary"
                        size="sm"
                        className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-lg border border-border/70 gap-1"
                      >
                        <Link
                          href={`/kitchen/view/${kitchen.public_view_token}`}
                          title="Public Supermarket Guest Link"
                        >
                          <span>Guest</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
