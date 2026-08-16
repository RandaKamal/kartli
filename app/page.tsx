import Link from "next/link";
import { auth } from "@/auth";
import { getUserKitchens } from "@/lib/kitchen";
import { Plus, ArrowRight, ExternalLink } from "lucide-react";

export default async function HomePage() {
  const session = await auth();
  const userKitchens = session?.user?.id
    ? await getUserKitchens(session.user.id)
    : [];

  return (
    <div className="space-y-10">
      {!session?.user ? (
        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
          <div className="max-w-2xl space-y-6">
            <span className="inline-block px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-xs font-semibold tracking-wider uppercase text-zinc-300">
              Email-Free & Lean
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-white">
              Manage your shared kitchen groceries effortlessly.
            </h1>
            <p className="text-zinc-400 text-base sm:text-lg">
              Set up your flatmate or family kitchen in seconds. No emails or complicated passwords required—just pick a username and share instant invite links.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/register"
                className="px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 transition shadow-md text-sm"
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition border border-zinc-700 text-sm"
              >
                Log In
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Welcome back, {session.user.username}
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Manage your shared households and shopping lists.
              </p>
            </div>
            <Link
              href="/kitchen/new"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 transition text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Kitchen</span>
            </Link>
          </div>

          <div>
            <h2 className="text-base font-semibold text-zinc-300 mb-4 uppercase tracking-wider text-xs">
              Your Kitchens
            </h2>

            {userKitchens.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 mx-auto text-lg">
                  🍳
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-white">
                    You are not part of any kitchen yet
                  </h3>
                  <p className="text-sm text-zinc-400 max-w-sm mx-auto">
                    Create a new kitchen or accept an invite link from your flatmate.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/kitchen/new"
                    className="inline-block px-4 py-2.5 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 transition text-sm"
                  >
                    Create your first kitchen
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userKitchens.map(({ kitchen, membership }) => {
                  const isAdmin = membership.role === "ADMIN";
                  const targetUrl = isAdmin
                    ? `/kitchen/${kitchen.id}/admin`
                    : `/kitchen/${kitchen.id}/member`;

                  return (
                    <div
                      key={kitchen.id}
                      className="group relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm hover:border-zinc-700 hover:bg-zinc-900/90 transition-all flex flex-col justify-between cursor-pointer"
                    >
                      {/* Entire Card Overlay Link */}
                      <Link
                        href={targetUrl}
                        className="absolute inset-0 z-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-400"
                        aria-label={`Open ${kitchen.name} dashboard`}
                      />

                      <div className="space-y-3 relative z-0 pointer-events-none">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {membership.role}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {new Date(kitchen.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <h3 className="text-xl font-bold text-white group-hover:text-zinc-100 transition">
                          {kitchen.name}
                        </h3>

                        <p className="text-xs text-zinc-400">
                          Display Name: <strong className="text-zinc-200">{membership.kitchen_display_name}</strong>
                        </p>
                      </div>

                      <div className="pt-5 border-t border-zinc-800 mt-6 flex items-center justify-between relative z-0 pointer-events-none">
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white group-hover:text-zinc-200 transition">
                          <span>Open Dashboard</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </span>

                        <div className="pointer-events-auto relative z-10">
                          <Link
                            href={`/kitchen/view/${kitchen.public_view_token}`}
                            className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg bg-zinc-800/90 hover:bg-zinc-800 border border-zinc-700 transition inline-flex items-center gap-1 shrink-0"
                            title="Public Guest Link"
                          >
                            <span>Guest</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
