import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getKitchenByPublicToken, getKitchenById, getUserMembership } from "@/lib/kitchen";
import { getShoppingListItems } from "@/lib/pantry";
import { GuestShoppingView } from "@/components/kitchen/GuestView";
import { UtensilsCrossed, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function PublicKitchenViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trimmedId = id?.trim() || "";

  if (!trimmedId) {
    return notFound();
  }

  // 1. First try lookup by public view token
  let kitchen = await getKitchenByPublicToken(trimmedId);

  // 2. If not found, attempt lookup as a kitchen ID (UUID)
  if (!kitchen) {
    const kitchenRecord = await getKitchenById(trimmedId);
    if (kitchenRecord) {
      if (kitchenRecord.public_view_token && kitchenRecord.public_view_token !== trimmedId) {
        redirect(`/kitchen/view/${kitchenRecord.public_view_token}`);
      }
      kitchen = await getKitchenByPublicToken(kitchenRecord.public_view_token);
    }
  }

  if (!kitchen) {
    return (
      <div className="max-w-2xl mx-auto w-full px-6 py-12 space-y-6">
        <Card className="border border-border/80 bg-card rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground mx-auto">
            <UtensilsCrossed className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Kitchen List Not Found
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
              This supermarket guest link may be invalid, expired, or the kitchen no longer exists.
            </p>
          </div>

          <div className="pt-3">
            <Button asChild variant="outline" size="sm" className="rounded-xl font-medium gap-1.5 px-4 h-9">
              <Link href="/">
                <ArrowLeft className="w-4 h-4" />
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
