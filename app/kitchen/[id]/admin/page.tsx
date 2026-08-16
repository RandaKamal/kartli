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
import { headers } from "next/headers";

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

  const headerList = await headers();
  const host = headerList.get("host") || "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") || "http";
  const baseUrl = `${protocol}://${host}`;

  const publicGuestUrl = `${baseUrl}/kitchen/view/${kitchen.public_view_token}`;

  // Inline server action to add a new member slot
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
      {/* Top Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              Admin Panel
            </span>
            <span className="text-xs text-slate-400">
              Created {new Date(kitchen.created_at).toLocaleDateString()}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {kitchen.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage members, generate invite tokens, and access guest links.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/kitchen/${id}/member`}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium transition"
          >
            Member View
          </Link>
        </div>
      </div>

      {/* Guest Link Card */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛒</span>
            <h3 className="font-bold text-emerald-950 text-sm sm:text-base">
              Supermarket & Guest Read-Only Link
            </h3>
          </div>
          <p className="text-xs text-emerald-800">
            Share this link with anyone for instant, low-bandwidth read-only access without requiring a login.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={publicGuestUrl}
            className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-white text-xs text-emerald-900 font-mono w-48 sm:w-64 select-all"
          />
          <CopyButton text={publicGuestUrl} label="Copy Guest Link" />
          <Link
            href={`/kitchen/view/${kitchen.public_view_token}`}
            target="_blank"
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition"
          >
            Open ↗
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Member tables */}
        <div className="lg:col-span-2 space-y-8">
          {/* Active Members */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>👥 Active Members</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                  {activeMembers.length}
                </span>
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3">Display Name</th>
                    <th className="pb-3">Username</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50/50">
                      <td className="py-3 font-semibold text-slate-900">
                        {member.kitchen_display_name}
                      </td>
                      <td className="py-3 text-slate-600 font-mono text-xs">
                        @{member.username || "—"}
                      </td>
                      <td className="py-3">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            member.role === "ADMIN"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {member.role}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-slate-400">
                        {member.joined_at
                          ? new Date(member.joined_at).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Invites */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>✉️ Pending Invites</span>
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                  {pendingInvites.length}
                </span>
              </h2>
            </div>

            {pendingInvites.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">
                No pending invites. All invited members have claimed their links!
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingInvites.map((invite) => {
                  const inviteUrl = `${baseUrl}/invite/${invite.invite_token}`;
                  return (
                    <div
                      key={invite.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">
                          {invite.kitchen_display_name}
                        </div>
                        <div className="text-xs text-amber-600 font-medium">
                          Status: Pending Claim
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={inviteUrl}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700 font-mono w-48 sm:w-64 select-all"
                        />
                        <CopyButton text={inviteUrl} label="Copy Invite" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Add Member Form */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>➕ Invite New Member</span>
            </h2>
            <p className="text-xs text-slate-500">
              Add another placeholder member to generate a new claim link.
            </p>

            <form action={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Member Display Name
                </label>
                <input
                  type="text"
                  name="memberName"
                  required
                  placeholder="e.g. Mia or Daniel"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition text-sm shadow-sm"
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
