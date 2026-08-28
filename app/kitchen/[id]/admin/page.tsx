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
import { ExternalLink, Users, Mail, UserPlus, ArrowLeft, Shield } from "lucide-react";
import { getPantryItems, getShoppingListItems } from "@/lib/pantry";
import { PantrySection } from "@/components/PantrySection";
import { ShoppingListSection } from "@/components/ShoppingListSection";
import { getUserCheckouts } from "@/lib/pantry";
import { ShoppingCart } from "@/components/ShoppingCart";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition px-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Kitchens</span>
        </Link>

        <Card className="border-zinc-800/80 bg-zinc-900/90 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="destructive" className="font-semibold text-[11px] gap-1 px-2.5 py-0.5">
                <Shield className="w-3 h-3" />
                ADMIN PANEL
              </Badge>
              <span className="text-xs text-zinc-500 font-mono">
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

          <div className="flex items-center gap-2.5 flex-wrap">
            <ShoppingCart kitchenId={id} items={shoppingListItems} currentUserId={session.user.id} />
            <Button asChild variant="secondary" size="sm" className="rounded-xl font-medium">
              <Link href={`/kitchen/${id}/admin/purchases`}>Purchases</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-xl font-medium">
              <Link href={`/kitchen/${id}/member`}>Member View</Link>
            </Button>
          </div>
        </Card>
      </div>

      {/* Guest Link Banner */}
      <Card className="border-zinc-800 bg-zinc-900/80 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-semibold uppercase tracking-wider text-[10px]">
              Supermarket &amp; Guest Link
            </Badge>
          </div>
          <p className="text-xs text-zinc-400">
            Share this link with anyone for instant read-only grocery access without requiring an account.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="text"
            readOnly
            value={publicGuestUrl}
            className="h-8 px-2.5 text-xs text-zinc-300 font-mono w-48 sm:w-64 select-all rounded-lg"
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
        <ShoppingListSection kitchenId={id} items={shoppingListItems} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Member tables */}
        <div className="lg:col-span-2 space-y-8">
          {/* Active Members */}
          <Card className="border-zinc-800/80 bg-zinc-900/90 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-zinc-400" />
                <span>Active Members</span>
                <Badge variant="secondary" className="text-xs font-mono">
                  {activeMembers.length}
                </Badge>
              </h2>
            </div>

            <AdminActiveMembersList
              kitchenId={id}
              members={activeMembers}
              currentUserId={session.user.id}
            />
          </Card>

          {/* Pending Invites */}
          <Card className="border-zinc-800/80 bg-zinc-900/90 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-zinc-400" />
                <span>Pending Invites</span>
                <Badge variant="secondary" className="text-xs font-mono">
                  {pendingInvites.length}
                </Badge>
              </h2>
            </div>

            <AdminPendingInvitesList
              kitchenId={id}
              invites={pendingInvites}
              baseUrl={baseUrl}
            />
          </Card>
        </div>

        {/* Right Col: Add Member Form */}
        <div className="space-y-6">
          <Card className="border-zinc-800/80 bg-zinc-900/90 rounded-3xl p-6 shadow-sm space-y-4">
            <CardHeader className="p-0 space-y-1">
              <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-zinc-400" />
                <span>Invite New Member</span>
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Add another placeholder member to generate a new one-time claim link.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              <form action={handleAddMember} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-member-name">
                    Member Display Name
                  </Label>
                  <Input
                    id="admin-member-name"
                    type="text"
                    name="memberName"
                    required
                    placeholder="e.g. Mia or Daniel"
                    className="rounded-xl"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-10 rounded-xl font-semibold shadow-sm text-xs sm:text-sm"
                >
                  Add Member &amp; Generate Link
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

