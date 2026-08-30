import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getKitchenByPublicToken, getUserMembership } from "@/lib/kitchen";
import { ShoppingBag, Users, ArrowRight } from "lucide-react";
import { getShoppingListItems } from "@/lib/pantry";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { capitalize } from "@/lib/utils";

export default async function PublicKitchenViewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const kitchen = await getKitchenByPublicToken(token);

  if (!kitchen) {
    notFound();
  }

  const session = await auth();
  const userId = session?.user?.id;
  const membership = userId ? await getUserMembership(kitchen.id, userId) : null;

  const activeMembers = kitchen.members.filter((m) => m.is_active);

  const shoppingListItems = await getShoppingListItems(kitchen.id);
  const pendingItems = shoppingListItems.filter((item) => !item.is_purchased);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="border border-border/80 bg-card text-card-foreground rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="gap-1.5 px-3 py-1 font-semibold uppercase tracking-wider text-[11px]">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Supermarket View</span>
          </Badge>
          <span className="text-xs text-muted-foreground font-medium">
            Read-only mode
          </span>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{kitchen.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Viewing shared kitchen grocery list and household roster.
          </p>
        </div>
      </Card>

      {/* Shopping List */}
      <Card className="border-border bg-card rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-muted-foreground" />
          <span>Shopping List</span>
          <Badge variant="secondary" className="text-xs font-mono">
            {pendingItems.length}
          </Badge>
        </h2>

        {pendingItems.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Nothing needed right now.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {pendingItems.map((item) => (
              <li
                key={item.id}
                className="px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border text-sm text-foreground font-medium flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-warning shrink-0" />
                  <span className="truncate">{item.name}</span>
                </div>
                {item.pantry_item_id ? (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium text-muted-foreground shrink-0">
                    Pantry
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-medium shrink-0">
                    Custom
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="border-border bg-card rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>Kitchen Roster</span>
            <Badge variant="secondary" className="text-xs font-mono">
              {activeMembers.length} active
            </Badge>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {kitchen.members.map((member) => (
              <div
                key={member.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between text-sm ${
                  member.is_active
                    ? "bg-muted/40 border-border"
                    : "bg-muted/20 border-dashed border-border opacity-60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-secondary text-[11px] font-semibold text-secondary-foreground">
                      {member.kitchen_display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground">
                    {capitalize(member.kitchen_display_name)}
                  </span>
                </div>

                <Badge
                  variant={!member.is_active ? "outline" : member.role === "ADMIN" ? "accent" : "secondary"}
                  className="text-[10px]"
                >
                  {member.is_active ? member.role : "Pending"}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          {session?.user ? (
            membership ? (
              <>
                <span>You are a member ({capitalize(membership.kitchen_display_name)})</span>
                <Link
                  href={`/kitchen/${kitchen.id}`}
                  className="inline-flex items-center gap-1 font-semibold text-foreground hover:underline transition-colors"
                >
                  <span>Go to kitchen space</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </>
            ) : (
              <>
                <span>Signed in as <strong className="text-foreground">{capitalize(session.user.username)}</strong></span>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1 font-semibold text-foreground hover:underline transition-colors"
                >
                  <span>My Kitchens</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </>
            )
          ) : (
            <>
              <span>Are you a member of this kitchen?</span>
              <Link
                href={`/login?callbackUrl=${encodeURIComponent(`/kitchen/${kitchen.id}`)}`}
                className="inline-flex items-center gap-1 font-semibold text-foreground hover:underline transition-colors"
              >
                <span>Sign in to manage</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

