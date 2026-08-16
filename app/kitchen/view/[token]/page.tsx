import { notFound } from "next/navigation";
import Link from "next/link";
import { getKitchenByPublicToken } from "@/lib/kitchen";
import { ShoppingBag, Users, ArrowRight } from "lucide-react";

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
      <div className="bg-zinc-900 border border-zinc-800 text-white rounded-3xl p-8 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-xs font-semibold uppercase tracking-wider text-zinc-300">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Supermarket View</span>
          </span>
          <span className="text-xs text-zinc-500 font-medium">
            Read-only mode
          </span>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{kitchen.name}</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Viewing shared kitchen grocery list and household roster.
          </p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-400" />
            <span>Kitchen Roster</span>
            <span className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full font-medium">
              {activeMembers.length} active
            </span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {kitchen.members.map((member) => (
              <div
                key={member.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between text-sm ${
                  member.is_active
                    ? "bg-zinc-950 border-zinc-800"
                    : "bg-zinc-950/40 border-dashed border-zinc-800 opacity-60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold flex items-center justify-center text-xs">
                    {member.kitchen_display_name.charAt(0).toUpperCase()}
                  </span>
                  <span className="font-medium text-zinc-200">
                    {member.kitchen_display_name}
                  </span>
                </div>

                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                  {member.is_active ? member.role : "Pending"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <span>Are you a member of this kitchen?</span>
          <Link
            href="/login"
            className="inline-flex items-center gap-1 font-semibold text-white hover:underline"
          >
            <span>Sign in to manage</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
