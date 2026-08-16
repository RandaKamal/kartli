import Link from "next/link";
import { auth } from "@/auth";
import { getUserKitchens } from "@/lib/kitchen";

export default async function HomePage() {
  const session = await auth();
  const userKitchens = session?.user?.id
    ? await getUserKitchens(session.user.id)
    : [];

  return (
    <div className="space-y-10">
      {!session?.user ? (
        <section className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-8 sm:p-12 text-white shadow-xl">
          <div className="max-w-2xl space-y-6">
            <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide uppercase">
              Email-Free & Lean
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Manage your shared kitchen groceries effortlessly.
            </h1>
            <p className="text-emerald-100 text-base sm:text-lg">
              Set up your flatmate or family kitchen in seconds. No emails or complicated passwords required—just pick a username and share instant invite links.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/register"
                className="px-6 py-3 rounded-xl bg-white text-emerald-800 font-bold hover:bg-emerald-50 transition shadow-md"
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="px-6 py-3 rounded-xl bg-emerald-800/60 hover:bg-emerald-800 text-white font-semibold transition border border-white/20"
              >
                Log In
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Welcome back, {session.user.username}!
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Manage your shared households and shopping lists.
              </p>
            </div>
            <Link
              href="/kitchen/new"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition shadow-sm"
            >
              + Create New Kitchen
            </Link>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Your Kitchens</h2>
            {userKitchens.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
                <div className="text-4xl">🍳</div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-800">You are not part of any kitchen yet</h3>
                  <p className="text-sm text-slate-500">
                    Create a new kitchen or claim an invite link from your flatmate.
                  </p>
                </div>
                <Link
                  href="/kitchen/new"
                  className="inline-block px-4 py-2 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition"
                >
                  Create your first kitchen
                </Link>
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
                      className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                              isAdmin
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {membership.role}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(kitchen.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <h3 className="text-xl font-bold text-slate-900">
                          {kitchen.name}
                        </h3>

                        <p className="text-xs text-slate-500">
                          Display Name: <strong className="text-slate-700">{membership.kitchen_display_name}</strong>
                        </p>
                      </div>

                      <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between">
                        <Link
                          href={targetUrl}
                          className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                        >
                          Open Dashboard →
                        </Link>
                        <Link
                          href={`/kitchen/view/${kitchen.public_view_token}`}
                          className="text-xs text-slate-400 hover:text-slate-600"
                          title="Public Guest Link"
                        >
                          Guest View
                        </Link>
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
