import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import {
  getKitchenById,
  getUserMembership,
} from "@/lib/kitchen";
import { getPantryItems, getShoppingListItems } from "@/lib/pantry";
import { KitchenSpaceView } from "@/components/KitchenSpaceView";

export default async function KitchenPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const [{ id }, session, headerList, resolvedSearchParams] = await Promise.all([
    params,
    auth(),
    headers(),
    searchParams ? searchParams : Promise.resolve(undefined),
  ]);

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/kitchen/${id}`);
  }

  // Concurrent execution of all primary data queries via Promise.all
  const [membership, kitchen, pantryItems, shoppingListItems] = await Promise.all([
    getUserMembership(id, session.user.id),
    getKitchenById(id),
    getPantryItems(id),
    getShoppingListItems(id),
  ]);

  if (!membership) {
    redirect("/");
  }

  if (!kitchen) {
    notFound();
  }

  const host = headerList.get("x-forwarded-host") || headerList.get("host") || "";
  const protocol = headerList.get("x-forwarded-proto") || "http";
  const baseUrl = host ? `${protocol}://${host}` : "";

  const initialTab = resolvedSearchParams?.tab || "kitchen";

  const preferredCurrency = session.user.preferred_currency || "EUR";

  return (
    <KitchenSpaceView
      kitchen={kitchen}
      membership={membership}
      pantryItems={pantryItems}
      shoppingListItems={shoppingListItems}
      currentUserId={session.user.id}
      preferredCurrency={preferredCurrency}
      userPreferredCurrency={preferredCurrency}
      baseUrl={baseUrl}
      initialTab={initialTab}
    />
  );
}
