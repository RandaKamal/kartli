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

  const headerList = await headers();
  const host = headerList.get("host") || "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") || "http";
  const baseUrl = `${protocol}://${host}`;
  const publicGuestUrl = `${baseUrl}/kitchen/view/${kitchen.public_view_token}`;

  return (
    <div className="space-y-8">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
              Kitchen Member
            </span>
            <span className="text-xs text-slate-400">
              Joined {membership.joined_at ? new Date(membership.joined_at).toLocaleDateString() : ""}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {kitchen.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Your display name: <strong className="text-slate-800">{membership.kitchen_display_name}</strong>
          </p>
        </div>

        {membership.role === "ADMIN" && (
          <Link
            href={`/kitchen/${id}/admin`}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition"
          >
            Open Admin Dashboard
          </Link>
        )}
      </div>

      {/* Guest Link */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-bold text-emerald-950 text-sm sm:text-base">
            🛒 Supermarket / Guest Read-Only Link
          </h3>
          <p className="text-xs text-emerald-800">
            Share this link with anyone for instant read-only shopping view.
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Active Members Roster */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <span>👥 Kitchen Members</span>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
            {activeMembers.length}
          </span>
        </h2>

        <div className="divide-y divide-slate-100">
          {activeMembers.map((member) => (
            <div
              key={member.id}
              className="py-3 flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                  {member.kitchen_display_name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <div className="font-semibold text-slate-900">
                    {member.kitchen_display_name}
                    {member.user_id === session.user.id && (
                      <span className="ml-2 text-xs text-emerald-600 font-normal">(You)</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    @{member.username || "guest"}
                  </div>
                </div>
              </div>

              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  member.role === "ADMIN"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
