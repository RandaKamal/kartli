import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  getKitchenById,
  getKitchenMembersWithUsers,
  isUserKitchenAdmin,
  addKitchenMember,
} from "@/lib/kitchen";
import { CopyButton } from "@/components/CopyButton";
import { AdminActiveMembersList } from "@/components/AdminActiveMembersList";
import { AdminPendingInvitesList } from "@/components/AdminPendingInvitesList";
import { headers } from "next/headers";
import { ExternalLink, Users, Mail, UserPlus, ArrowLeft } from "lucide-react";
import { getPantryItems, getShoppingListItems } from "@/lib/pantry";
import { PantrySection } from "@/components/PantrySection";
import { ShoppingListSection } from "@/components/ShoppingListSection";
import { getUserCheckouts } from "@/lib/pantry";
import { ShoppingCart } from "@/components/ShoppingCart";
import { MyPurchasesSection } from "@/components/MyPurchasesSection";

export default async function KitchenAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/login?callbackUrl=/kitchen/${id}/admin`);
  }

  const isAdmin = await isUserKitchenAdmin(id, session.user.id);
  if (!isAdmin) {
    redirect(`/kitchen/${id}/member`);
  }

  const kitchen = await getKitchenById(id);
  if (!kitchen) {
    notFound();
  }

  const members = await getKitchenMembersWithUsers(id);
  const activeMembers = members.filter((m) => m.joined_at !== null);
  const pendingInvites = members.filter((m) => m.joined_at === null && m.invite_token !== null);
  
  const pantryItems = await getPantryItems(id);
  const shoppingListItems = await getShoppingListItems(id);
  const myCheckouts = await getUserCheckouts(id, session.user.id);

  const headerList = await headers();
  const host = headerList.get("host") || "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") || "http";
  const baseUrl = `${protocol}://${host}`;

  const publicGuestUrl = `${baseUrl}/kitchen/view/${kitchen.public_view_token}`;

  async function handleAddMember(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const memberName = String(formData.get("memberName") || "").trim();
    if (!memberName) return;

    await addKitchenMember(id, memberName, session.user.id);
    revalidatePath(`/kitchen/${id}/admin`);
  }

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
                ADMIN PANEL
              </span>
              <span className="text-xs text-zinc-500">
                Created {new Date(kitchen.created_at).toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {kitchen.name}
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Manage members, generate invite tokens, and view guest links.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ShoppingCart kitchenId={id} items={shoppingListItems} currentUserId={session.user.id} />
            <Link
              href={`/kitchen/${id}/admin/purchases`}
              className="px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white hover:bg-zinc-700 text-sm font-medium transition"
            >
              Purchases
            </Link>
            <Link
              href={`/kitchen/${id}/member`}
              className="px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white hover:bg-zinc-700 text-sm font-medium transition"
            >
              Member View
            </Link>
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
            Share this link with anyone for instant read-only grocery access without requiring an account.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={publicGuestUrl}
            className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-xs text-zinc-300 font-mono w-48 sm:w-64 select-all"
          />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Member tables */}
        <div className="lg:col-span-2 space-y-8">
          {/* Active Members */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-zinc-400" />
                <span>Active Members</span>
                <span className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full font-medium">
                  {activeMembers.length}
                </span>
              </h2>
            </div>

            <AdminActiveMembersList
              kitchenId={id}
              members={activeMembers}
              currentUserId={session.user.id}
            />
          </div>

          {/* Pending Invites */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-zinc-400" />
                <span>Pending Invites</span>
                <span className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full font-medium">
                  {pendingInvites.length}
                </span>
              </h2>
            </div>

            <AdminPendingInvitesList
              kitchenId={id}
              invites={pendingInvites}
              baseUrl={baseUrl}
            />
          </div>
        </div>

        {/* Right Col: Add Member Form */}
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-zinc-400" />
              <span>Invite New Member</span>
            </h2>
            <p className="text-xs text-zinc-400">
              Add another placeholder member to generate a new one-time claim link.
            </p>

            <form action={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Member Display Name
                </label>
                <input
                  type="text"
                  name="memberName"
                  required
                  placeholder="e.g. Mia or Daniel"
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm transition"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 transition text-sm shadow-sm"
              >
                Add Member & Generate Link
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
