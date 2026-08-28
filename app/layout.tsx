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
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
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
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground min-h-screen flex flex-col antialiased selection:bg-accent-primary/20 selection:text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={200}>
            <header className="bg-background/85 backdrop-blur-md border-b border-border/70 sticky top-0 z-40">
              <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                <Link
                  href="/"
                  className="flex items-center gap-2.5 font-bold text-lg text-foreground tracking-tight hover:opacity-90 transition group"
                >
                  <span className="w-8 h-8 rounded-xl bg-card border border-border/80 group-hover:border-accent-primary/50 flex items-center justify-center text-xs font-black transition-colors shadow-xs relative">
                    <span className="text-foreground">k</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-primary absolute top-1.5 right-1.5" />
                  </span>
                  <span className="tracking-tight text-foreground font-extrabold">kartli</span>
                </Link>

                <nav className="flex items-center gap-2.5 text-sm">
                  <ThemeToggle />

                  {session?.user ? (
                    <>
                      <Button asChild size="sm" variant="default" className="rounded-xl shadow-xs">
                        <Link href="/kitchen/new" className="flex items-center gap-1.5 font-semibold">
                          <Plus className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">New Kitchen</span>
                        </Link>
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex items-center gap-2 rounded-xl border border-border/70 px-2.5"
                          >
                            <Avatar className="h-5 w-5 border-0">
                              <AvatarFallback className="bg-secondary text-[10px] text-foreground font-semibold">
                                {session.user.username?.charAt(0).toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium">@{session.user.username}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 shadow-lg">
                          <DropdownMenuLabel className="font-normal text-xs text-muted-foreground">
                            Signed in as <strong className="text-foreground">@{session.user.username}</strong>
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
                                className="flex items-center gap-2 w-full text-destructive hover:text-destructive cursor-pointer text-xs"
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
                      <Button asChild variant="secondary" size="sm" className="rounded-xl font-medium">
                        <Link href="/login">Log in</Link>
                      </Button>
                      <Button asChild variant="default" size="sm" className="rounded-xl font-semibold">
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

            <footer className="bg-muted/30 border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
              <p>© {new Date().getFullYear()} kartli. All rights reserved.</p>
            </footer>

            <Toaster position="top-right" richColors />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

