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
      {/* Top Breadcrumb & Header */}
      <div className="space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Kitchens</span>
        </Link>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                MEMBER SPACE
              </span>
              <span className="text-xs text-zinc-500">
                Joined {membership.joined_at ? new Date(membership.joined_at).toLocaleDateString() : ""}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {kitchen.name}
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Your display name: <strong className="text-white">{membership.kitchen_display_name}</strong>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ShoppingCart kitchenId={id} items={shoppingListItems} currentUserId={session.user.id} />
            {membership.role === "ADMIN" && (
              <Link
                href={`/kitchen/${id}/admin`}
                className="px-4 py-2 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 text-sm transition"
              >
                Open Admin Dashboard
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Guest Link Banner */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 uppercase tracking-wider">
              Supermarket & Guest Link
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Share this link with anyone for instant read-only shopping view.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={publicGuestUrl} label="Copy Link" />
          <Link
            href={`/kitchen/view/${kitchen.public_view_token}`}
            target="_blank"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition"
          >
            <span>Open</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Pantry & Shopping List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PantrySection kitchenId={id} items={pantryItems} />
        <ShoppingListSection kitchenId={id} items={shoppingListItems} />
      </div>

      <MyPurchasesSection checkouts={myCheckouts} />

      {/* Active Members Roster */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-zinc-400" />
          <span>Kitchen Members</span>
          <span className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full font-medium">
            {activeMembers.length}
          </span>
        </h2>

        <div className="divide-y divide-zinc-800">
          {activeMembers.map((member) => (
            <div
              key={member.id}
              className="py-3 flex items-center justify-between text-sm hover:bg-zinc-800/20 px-2 rounded-lg transition"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold flex items-center justify-center text-xs">
                  {member.kitchen_display_name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <div className="font-medium text-white">
                    {member.kitchen_display_name}
                    {member.user_id === session.user.id && (
                      <span className="ml-2 text-xs text-zinc-400 font-normal">(You)</span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 font-mono">
                    @{member.username || "guest"}
                  </div>
                </div>
              </div>

              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
