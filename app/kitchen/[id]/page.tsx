import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import {
  getKitchenById,
  getUserMembership,
} from "@/lib/kitchen";
import { getPantryItems, getShoppingListItems } from "@/lib/pantry";
import { getKitchenStats } from "@/lib/actions/stats";
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

  const initialTab = resolvedSearchParams?.tab || "kitchen";

  // Concurrent execution of all primary data queries via Promise.all
  const [membership, kitchen, pantryItems, shoppingListItems, initialPulseStats] = await Promise.all([
    getUserMembership(id, session.user.id),
    getKitchenById(id),
    getPantryItems(id),
    getShoppingListItems(id),
    initialTab === "pulse"
      ? getKitchenStats(id, session.user.id).catch(() => undefined)
      : Promise.resolve(undefined),
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

  const preferredCurrency = session.user.preferred_currency || "EUR";

  return (
    <KitchenSpaceView
      kitchen={kitchen}
      membership={membership}
      pantryItems={pantryItems}
      shoppingListItems={shoppingListItems}
      initialPulseStats={initialPulseStats}
      currentUserId={session.user.id}
      preferredCurrency={preferredCurrency}
      userPreferredCurrency={preferredCurrency}
      baseUrl={baseUrl}
      initialTab={initialTab}
    />
  );
}
