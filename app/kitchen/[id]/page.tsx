import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import {
  getKitchenById,
  getUserMembership,
  getKitchenMembersWithUsers,
} from "@/lib/kitchen";
import { getPantryItems, getShoppingListItems, getUserCheckouts, getKitchenCheckouts } from "@/lib/pantry";
import { KitchenSpaceView } from "@/components/KitchenSpaceView";

export default async function KitchenPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/kitchen/${id}`);
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
  const pantryItems = await getPantryItems(id);
  const shoppingListItems = await getShoppingListItems(id);
  const myCheckouts = await getUserCheckouts(id, session.user.id);
  const adminCheckouts = membership.role === "ADMIN" ? await getKitchenCheckouts(id) : [];

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") || headerList.get("host") || "";
  const protocol = headerList.get("x-forwarded-proto") || "http";
  const baseUrl = host ? `${protocol}://${host}` : "";

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialTab = resolvedSearchParams?.tab || "kitchen";

  return (
    <KitchenSpaceView
      kitchen={kitchen}
      membership={membership}
      members={members}
      pantryItems={pantryItems}
      shoppingListItems={shoppingListItems}
      myCheckouts={myCheckouts}
      adminCheckouts={adminCheckouts}
      currentUserId={session.user.id}
      baseUrl={baseUrl}
      initialTab={initialTab}
    />
  );
}
