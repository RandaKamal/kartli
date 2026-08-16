import { notFound } from "next/navigation";
import Link from "next/link";
import { getKitchenByPublicToken } from "@/lib/kitchen";

export default async function PublicKitchenViewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const kitchen = await getKitchenByPublicToken(token);

  if (!kitchen) {
    notFound();
  }

  const activeMembers = kitchen.members.filter((m) => m.is_active);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-emerald-600 text-white rounded-3xl p-8 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider">
            Guest / Supermarket View
          </span>
          <span className="text-xs text-emerald-100">
            Read-only mode
          </span>
        </div>

        <h1 className="text-3xl font-extrabold">{kitchen.name}</h1>
        <p className="text-sm text-emerald-100">
          Viewing shared kitchen grocery list and household overview.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span>👥 Kitchen Members</span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
              {activeMembers.length} active
            </span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {kitchen.members.map((member) => (
              <div
                key={member.id}
                className={`p-3 rounded-xl border flex items-center justify-between text-sm ${
                  member.is_active
                    ? "bg-slate-50 border-slate-200"
                    : "bg-slate-50/50 border-dashed border-slate-200 opacity-60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                    {member.kitchen_display_name.charAt(0).toUpperCase()}
                  </span>
                  <span className="font-semibold text-slate-800">
                    {member.kitchen_display_name}
                  </span>
                </div>

                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    member.is_active
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {member.is_active ? member.role : "Pending"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Are you a member of this kitchen?</span>
          <Link
            href="/login"
            className="font-bold text-emerald-600 hover:text-emerald-700 underline"
          >
            Sign in to edit list
          </Link>
        </div>
      </div>
    </div>
  );
}
