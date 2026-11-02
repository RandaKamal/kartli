import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import {
  getKitchenById,
  getUserMembership,
  getKitchenMembersWithUsers,
} from "@/lib/kitchen";
import { KitchenSettingsView } from "@/components/KitchenSettingsView";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const kitchen = await getKitchenById(id);
  return {
    title: kitchen ? `${kitchen.name} Settings - kartli` : "Kitchen Settings - kartli",
  };
}

export default async function KitchenSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session, headerList] = await Promise.all([
    params,
    auth(),
    headers(),
  ]);

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/kitchen/${id}/settings`);
  }

  const [membership, kitchen, members] = await Promise.all([
    getUserMembership(id, session.user.id),
    getKitchenById(id),
    getKitchenMembersWithUsers(id),
  ]);

  if (!kitchen) {
    notFound();
  }

  if (!membership) {
    redirect("/dashboard");
  }

  const host = headerList.get("x-forwarded-host") || headerList.get("host") || "";
  const protocol = headerList.get("x-forwarded-proto") || "http";
  const baseUrl = host ? `${protocol}://${host}` : "";

  return (
    <KitchenSettingsView
      kitchen={kitchen}
      membership={membership}
      members={members}
      currentUserId={session.user.id}
      baseUrl={baseUrl}
    />
  );
}
