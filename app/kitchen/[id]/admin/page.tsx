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
import { AdminKitchenHeader } from "@/components/AdminKitchenHeader";
import { headers } from "next/headers";
import { ExternalLink, Users, Mail, UserPlus } from "lucide-react";
import { getPantryItems, getShoppingListItems } from "@/lib/pantry";
import { PantrySection } from "@/components/PantrySection";
import { ShoppingListSection } from "@/components/ShoppingListSection";
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
      {/* Top Breadcrumb & Header with Inline Name Editing */}
      <AdminKitchenHeader
        kitchen={kitchen}
        shoppingListItems={shoppingListItems}
        currentUserId={session.user.id}
      />

      {/* Guest Link Banner */}
      <Card className="border-border bg-card rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-semibold uppercase tracking-wider text-[10px]">
              Supermarket &amp; Guest Link
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Share this link with anyone for instant read-only grocery access without requiring an account.
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Member tables */}
        <div className="lg:col-span-2 space-y-8">
          {/* Active Members */}
          <Card className="border-border bg-card rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
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
          <Card className="border-border bg-card rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
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
          <Card className="border-border bg-card rounded-3xl p-6 shadow-sm space-y-4">
            <CardHeader className="p-0 space-y-1">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-muted-foreground" />
                <span>Invite New Member</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
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

