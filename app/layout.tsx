import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { logoutAction } from "@/app/actions/auth";
import { User, Plus, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "kartli - Shared Kitchens",
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
        <TooltipProvider delayDuration={200}>
          <header className="bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 sticky top-0 z-40">
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
              <Link
                href="/"
                className="flex items-center gap-2.5 font-bold text-lg text-white tracking-tight hover:opacity-90 transition group"
              >
                <span className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 group-hover:border-accent-primary/50 flex items-center justify-center text-xs font-black transition-colors shadow-xs relative">
                  <span className="text-white">k</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-primary absolute top-1.5 right-1.5" />
                </span>
                <span className="tracking-tight">kartli</span>
              </Link>

              <nav className="flex items-center gap-3 text-sm">
                {session?.user ? (
                  <>
                    <Button asChild size="sm" variant="default" className="rounded-xl shadow-xs">
                      <Link href="/kitchen/new" className="flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">New Kitchen</span>
                      </Link>
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex items-center gap-2 rounded-xl border-zinc-800 px-2.5"
                        >
                          <Avatar className="h-5 w-5 border-0">
                            <AvatarFallback className="bg-zinc-800 text-[10px] text-zinc-200">
                              {session.user.username?.charAt(0).toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">@{session.user.username}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel className="font-normal text-xs text-zinc-400">
                          Signed in as <strong className="text-white">@{session.user.username}</strong>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/profile" className="flex items-center gap-2 w-full cursor-pointer">
                            <Settings className="w-3.5 h-3.5" />
                            <span>Settings & Profile</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <form action={logoutAction} className="w-full">
                            <button
                              type="submit"
                              className="flex items-center gap-2 w-full text-accent-primary hover:text-accent-primary cursor-pointer text-xs"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Sign out</span>
                            </button>
                          </form>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button asChild variant="secondary" size="sm" className="rounded-xl">
                      <Link href="/login">Log in</Link>
                    </Button>
                    <Button asChild variant="default" size="sm" className="rounded-xl">
                      <Link href="/register">Sign up</Link>
                    </Button>
                  </div>
                )}
              </nav>
            </div>
          </header>

          <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
            {children}
          </main>

          <footer className="bg-zinc-950 border-t border-zinc-900 py-6 text-center text-xs text-zinc-600">
            <p>© {new Date().getFullYear()} kartli. All rights reserved.</p>
          </footer>

          <Toaster position="top-right" richColors />
        </TooltipProvider>
      </body>
    </html>
  );
}

