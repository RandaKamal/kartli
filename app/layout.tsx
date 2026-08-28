import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { UserDropdown } from "@/components/UserDropdown";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
                  className="flex items-center gap-2.5 font-bold text-lg text-foreground tracking-tight"
                >
                  <span className="w-8 h-8 rounded-xl bg-card border border-border/80 flex items-center justify-center text-xs font-black relative">
                    <span className="text-foreground">k</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-primary absolute top-1.5 right-1.5" />
                  </span>
                  <span className="tracking-tight text-foreground font-extrabold">kartli</span>
                </Link>

                <nav className="flex items-center gap-2.5 text-sm">
                  <ThemeToggle />

                  {session?.user ? (
                    <>
                      <Button asChild size="sm" variant="default" className="rounded-xl">
                        <Link href="/kitchen/new" className="flex items-center gap-1.5 font-semibold">
                          <Plus className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">New Kitchen</span>
                        </Link>
                      </Button>

                      <UserDropdown user={{ username: session.user.username }} />
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

