import Link from "next/link";
import { auth } from "@/auth";
import { getUserKitchens } from "@/lib/kitchen";
import { Plus, ArrowRight, ExternalLink, UtensilsCrossed } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { capitalize } from "@/lib/utils";

export default async function HomePage() {
  const session = await auth();
  const userKitchens = session?.user?.id
    ? await getUserKitchens(session.user.id)
    : [];

  return (
    <div className="space-y-10">
      {!session?.user ? (
        <Card className="border border-border/80 bg-gradient-to-br from-card via-card to-muted/30 text-card-foreground relative overflow-hidden p-8 sm:p-12">
          <div className="max-w-2xl space-y-6 relative z-10">
            <Badge variant="secondary" className="px-3 py-1 font-semibold tracking-wider uppercase text-[11px]">
              Email-Free &amp; Lean
            </Badge>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-foreground">
              Manage your shared kitchen groceries effortlessly.
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
              Set up your flatmate or family kitchen in seconds. No emails or complicated passwords required—just pick a username and share instant invite links.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Button asChild size="lg" className="rounded-xl shadow-xs font-semibold">
                <Link href="/register">Get Started</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-xl font-semibold">
                <Link href="/login">Log In</Link>
              </Button>
            </div>
          </div>
          {/* Subtle background glow element using brand primary */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-accent-primary/10 rounded-full blur-3xl pointer-events-none" />
        </Card>
      ) : (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Welcome back, <span>{capitalize(session.user.username)}</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your shared households and grocery inventory.
              </p>
            </div>
            <Button asChild size="default" className="rounded-xl shadow-sm">
              <Link href="/kitchen/new" className="flex items-center gap-1.5 font-semibold">
                <Plus className="w-4 h-4" />
                <span>Create New Kitchen</span>
              </Link>
            </Button>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
              Your Kitchens
            </h2>

            {userKitchens.length === 0 ? (
              <Card className="border-dashed border-border bg-card/60 p-10 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground mx-auto">
                  <UtensilsCrossed className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold text-foreground">
                    You are not part of any kitchen yet
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Create a new kitchen or accept an invite link from your flatmate.
                  </CardDescription>
                </div>
                <div className="pt-2">
                  <Button asChild variant="default" size="default" className="rounded-xl font-semibold">
                    <Link href="/kitchen/new">Create your first kitchen</Link>
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userKitchens.map(({ kitchen, membership }) => {
                  const isAdmin = membership.role === "ADMIN";
                  const targetUrl = isAdmin
                    ? `/kitchen/${kitchen.id}/admin`
                    : `/kitchen/${kitchen.id}/member`;

                  return (
                    <Card
                      key={kitchen.id}
                      className="relative border border-border bg-card flex flex-col justify-between rounded-2xl p-6 overflow-hidden"
                    >
                      {/* Entire Card Overlay Link */}
                      <Link
                        href={targetUrl}
                        className="absolute inset-0 z-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent-primary"
                        aria-label={`Open ${kitchen.name} dashboard`}
                      />

                      <div className="space-y-3 relative z-0 pointer-events-none">
                        <div className="flex items-center justify-between">
                          <Badge
                            variant={isAdmin ? "accent" : "secondary"}
                            className="font-medium text-[11px]"
                          >
                            {membership.role}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            {new Date(kitchen.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <h3 className="text-xl font-bold text-foreground">
                          {kitchen.name}
                        </h3>

                        <p className="text-xs text-muted-foreground">
                          Display Name: <strong className="text-foreground">{capitalize(membership.kitchen_display_name)}</strong>
                        </p>
                      </div>

                      <div className="pt-5 border-t border-border/70 mt-6 flex items-center justify-between relative z-0 pointer-events-none">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <span>Open Dashboard</span>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
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
                              title="Public Guest Link"
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
        </section>
      )}
    </div>
  );
}

