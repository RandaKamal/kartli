import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  getKitchenById,
  getKitchenMembersWithUsers,
  getUserMembership,
} from "@/lib/kitchen";
import { CopyButton } from "@/components/CopyButton";
import { headers } from "next/headers";
import { ExternalLink, Users, ArrowLeft } from "lucide-react";
import { getPantryItems, getShoppingListItems } from "@/lib/pantry";
import { PantrySection } from "@/components/PantrySection";
import { ShoppingListSection } from "@/components/ShoppingListSection";
import { getUserCheckouts } from "@/lib/pantry";
import { ShoppingCart } from "@/components/ShoppingCart";
import { MyPurchasesSection } from "@/components/MyPurchasesSection";
import { GuestCartHandoverListener } from "@/components/GuestCartHandoverListener";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { capitalize } from "@/lib/utils";

export default async function KitchenMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/login?callbackUrl=/kitchen/${id}/member`);
  }

  const membership = await getUserMembership(id, session.user.id);
  if (!membership) {
    redirect("/");
  }

  const kitchen = await getKitchenById(id);
  if (!kitchen) {
    notFound();
  }

  const members = await getKitchenMembersWithUsers(id);
  const activeMembers = members.filter((m) => m.joined_at !== null);

  const pantryItems = await getPantryItems(id);
  const shoppingListItems = await getShoppingListItems(id);
  const myCheckouts = await getUserCheckouts(id, session.user.id);

  const headerList = await headers();
  const host = headerList.get("host") || "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") || "http";
  const baseUrl = `${protocol}://${host}`;
  const publicGuestUrl = `${baseUrl}/kitchen/view/${kitchen.public_view_token}`;

  return (
    <div className="space-y-8">
      <GuestCartHandoverListener kitchenId={id} />
      {/* Top Breadcrumb & Header */}
      <div className="space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition px-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Kitchens</span>
        </Link>

        <Card className="border border-border/80 bg-card rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="font-semibold text-[11px]">
                MEMBER SPACE
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                Joined {membership.joined_at ? new Date(membership.joined_at).toLocaleDateString() : ""}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              {kitchen.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Display Name: <strong className="text-foreground">{capitalize(membership.kitchen_display_name)}</strong>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ShoppingCart kitchenId={id} items={shoppingListItems} currentUserId={session.user.id} />
            {membership.role === "ADMIN" && (
              <Button asChild variant="default" size="sm" className="rounded-xl font-semibold shadow-xs">
                <Link href={`/kitchen/${id}/admin`}>Open Admin Dashboard</Link>
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Guest Link Banner */}
      <Card className="border-border bg-card rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-semibold uppercase tracking-wider text-[10px]">
              Supermarket &amp; Guest Link
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Share this link with anyone for instant read-only shopping view.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            readOnly
            value={publicGuestUrl}
            className="h-8 px-2.5 text-xs text-foreground font-mono w-48 sm:w-64 select-all rounded-lg"
          />
          <CopyButton text={publicGuestUrl} label="Copy Link" size="sm" />
          <Button asChild variant="default" size="sm" className="h-8 px-3 rounded-lg text-xs font-semibold gap-1">
            <Link href={`/kitchen/view/${kitchen.public_view_token}`} target="_blank">
              <span>Open</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </Button>
        </div>
      </Card>

      {/* Pantry & Shopping List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PantrySection kitchenId={id} items={pantryItems} />
        <ShoppingListSection kitchenId={id} items={shoppingListItems} currentUserId={session.user.id} />
      </div>

      <MyPurchasesSection checkouts={myCheckouts} />

      {/* Active Members Roster */}
      <Card className="border-border bg-card rounded-3xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span>Kitchen Members</span>
          <Badge variant="secondary" className="text-xs font-mono">
            {activeMembers.length}
          </Badge>
        </h2>

        <div className="divide-y divide-border">
          {activeMembers.map((member) => (
            <div
              key={member.id}
              className="py-3 flex items-center justify-between text-sm hover:bg-muted/40 px-2 rounded-xl transition"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
                    {member.kitchen_display_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-foreground">
                    {capitalize(member.kitchen_display_name)}
                    {member.user_id === session.user.id && (
                      <span className="ml-2 text-xs text-muted-foreground font-normal">(You)</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    @{member.username || "guest"}
                  </div>
                </div>
              </div>

              <Badge
                variant={member.role === "ADMIN" ? "accent" : "secondary"}
                className="text-[11px]"
              >
                {member.role}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

