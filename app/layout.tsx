import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { logoutAction } from "@/app/actions/auth";
import { User, Plus } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "WGrocery - Shared Kitchens",
  description: "Lean, email-free shared kitchen management and grocery lists.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en" className="dark">
      <body className="bg-black text-zinc-100 min-h-screen flex flex-col antialiased">
        <header className="bg-zinc-950 border-b border-zinc-900 sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-lg text-white tracking-tight hover:opacity-90 transition"
            >
              <span className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-black">
                W
              </span>
              <span>WGrocery</span>
            </Link>

            <nav className="flex items-center gap-3 text-sm">
              {session?.user ? (
                <>
                  <Link
                    href="/kitchen/new"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black font-medium text-xs sm:text-sm hover:bg-zinc-200 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Kitchen</span>
                  </Link>

                  <div className="flex items-center gap-2">
                    <Link
                      href="/profile"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 transition text-xs sm:text-sm font-medium"
                      title="View Profile and Settings"
                    >
                      <User className="w-3.5 h-3.5 text-zinc-400" />
                      <span>@{session.user.username}</span>
                    </Link>

                    <form action={logoutAction}>
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition text-xs sm:text-sm"
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
                    className="px-3.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition text-xs sm:text-sm font-medium"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    className="px-3.5 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 transition text-xs sm:text-sm font-medium"
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

        <footer className="bg-zinc-950 border-t border-zinc-900 py-6 text-center text-xs text-zinc-600">
          <p>© {new Date().getFullYear()} WGrocery. All rights reserved.</p>
        </footer>
      </body>
    </html>
  );
}
