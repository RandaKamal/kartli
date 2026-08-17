import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getKitchenByPublicToken, getUserMembership } from "@/lib/kitchen";
import { ShoppingBag, Users, ArrowRight } from "lucide-react";
import { getShoppingListItems } from "@/lib/pantry";


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

  const session = await auth();
  const userId = session?.user?.id;
  const membership = userId ? await getUserMembership(kitchen.id, userId) : null;

  const activeMembers = kitchen.members.filter((m) => m.is_active);

  const shoppingListItems = await getShoppingListItems(kitchen.id);
  const pendingItems = shoppingListItems.filter((item) => !item.is_purchased);


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

      {/* Shopping List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-zinc-400" />
          <span>Shopping List</span>
          <span className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full font-medium">
            {pendingItems.length}
          </span>
        </h2>

        {pendingItems.length === 0 ? (
          <p className="text-xs text-zinc-500 py-2">Nothing needed right now.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {pendingItems.map((item) => (
              <li
                key={item.id}
                className="px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 font-medium"
              >
                {item.name}
              </li>
            ))}
          </ul>
        )}
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
          {session?.user ? (
            membership ? (
              <>
                <span>You are a member ({membership.kitchen_display_name})</span>
                <Link
                  href={`/kitchen/${kitchen.id}`}
                  className="inline-flex items-center gap-1 font-semibold text-white hover:underline"
                >
                  <span>Go to kitchen space</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </>
            ) : (
              <>
                <span>Signed in as <strong className="text-zinc-200">{session.user.username}</strong></span>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1 font-semibold text-white hover:underline"
                >
                  <span>My Kitchens</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </>
            )
          ) : (
            <>
              <span>Are you a member of this kitchen?</span>
              <Link
                href={`/login?callbackUrl=${encodeURIComponent(`/kitchen/${kitchen.id}`)}`}
                className="inline-flex items-center gap-1 font-semibold text-white hover:underline"
              >
                <span>Sign in to manage</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
