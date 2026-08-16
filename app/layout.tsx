import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { logoutAction } from "@/app/actions/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "WGrocery - Shared Kitchens & Grocery Management",
  description: "Lean, email-free shared kitchen management and grocery lists.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col antialiased">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-emerald-600">
              <span>🍳</span>
              <span>WGrocery</span>
            </Link>

            <nav className="flex items-center gap-4 text-sm font-medium">
              {session?.user ? (
                <>
                  <Link
                    href="/kitchen/new"
                    className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition font-semibold"
                  >
                    + New Kitchen
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-600">
                      Signed in as <strong className="text-slate-900 font-semibold">{session.user.username}</strong>
                    </span>
                    <form action={logoutAction}>
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
                      >
                        Sign out
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="px-3 py-1.5 rounded-lg text-slate-700 hover:text-slate-900 transition"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
          {children}
        </main>

        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} WGrocery. Shared Kitchens & Invite Engine.</p>
        </footer>
      </body>
    </html>
  );
}
