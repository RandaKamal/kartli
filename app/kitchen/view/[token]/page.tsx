import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getKitchenByPublicToken, getUserMembership } from "@/lib/kitchen";
import { getShoppingListItems } from "@/lib/pantry";
import { GuestShoppingView } from "@/components/GuestShoppingView";
import { UtensilsCrossed, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function PublicKitchenViewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const kitchen = await getKitchenByPublicToken(token);

  if (!kitchen) {
    return (
      <div className="max-w-md mx-auto py-12 space-y-6">
        <Card className="border border-border/80 bg-card rounded-3xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground mx-auto">
            <UtensilsCrossed className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Kitchen List Not Found
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This supermarket guest link may be invalid, expired, or the kitchen no longer exists.
            </p>
          </div>

          <div className="pt-2">
            <Button asChild variant="outline" size="sm" className="rounded-xl font-medium gap-1.5">
              <Link href="/">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Home</span>
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const session = await auth();
  const userId = session?.user?.id;
  const membership = userId ? await getUserMembership(kitchen.id, userId) : null;

  const allItems = await getShoppingListItems(kitchen.id);
  const openItems = allItems.filter((item) => !item.is_purchased);
  const inCartItems = allItems.filter((item) => item.is_purchased && !item.checkout_id);

  const sessionUser = session?.user
    ? {
        id: session.user.id,
        username: session.user.username,
        isMember: !!membership,
        role: membership?.role || null,
      }
    : null;

  return (
    <GuestShoppingView
      kitchen={kitchen}
      openItems={openItems}
      inCartItems={inCartItems}
      sessionUser={sessionUser}
    />
  );
}
