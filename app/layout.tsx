import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { UserDropdown } from "@/components/UserDropdown";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";
import Script from "next/script";

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
  const cookieStore = await cookies();
  const culinaryTheme =
    cookieStore.get("kartli-theme")?.value ||
    cookieStore.get("culinary-theme")?.value ||
    "black-truffle";

  const initialTheme = culinaryTheme === "truffle" ? "black-truffle" : culinaryTheme;

  return (
    <html
      lang="en"
      data-theme={initialTheme}
      data-culinary-theme={initialTheme}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('kartli-theme')||localStorage.getItem('culinary-theme')||(document.cookie.match(/(?:kartli-theme|culinary-theme)=([^;]+)/)||[])[1]||'${initialTheme}';if(t==='truffle')t='black-truffle';document.documentElement.setAttribute('data-theme',t);document.documentElement.setAttribute('data-culinary-theme',t);}catch(e){}})()`,
          }}
        />
      </head>
      <body className="bg-background text-foreground min-h-[100dvh] flex flex-col antialiased selection:bg-accent-primary/20 selection:text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          themes={["light", "dark", "system"]}
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={200}>
            <header className="bg-background/85 backdrop-blur-md border-b border-border/70 sticky top-0 z-40">
              <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                <Link
                  href={session?.user ? "/dashboard" : "/"}
                  className="flex items-center gap-2.5 font-bold text-lg text-foreground tracking-tight"
                >
                  <span className="w-8 h-8 rounded-xl bg-card border border-border/80 flex items-center justify-center text-xs font-black relative shadow-xs">
                    <span className="text-foreground">k</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-brand absolute top-1.5 right-1.5" />
                  </span>
                  <span className="tracking-tight text-foreground font-extrabold">kartli</span>
                </Link>

                <nav className="flex items-center gap-2 text-sm">
                  <ThemeToggle />

                  {session?.user ? (
                    <>
                      <Button asChild size="sm" variant="ghost" className="rounded-xl font-medium text-xs hidden sm:inline-flex">
                        <Link href="/dashboard">Dashboard</Link>
                      </Button>

                      <Button asChild size="sm" variant="default" className="rounded-xl font-medium shadow-sm">
                        <Link href="/kitchen/new" className="flex items-center gap-1.5">
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

            <main className="w-full flex-1 pb-32 max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
              {children}
            </main>

            <footer className="bg-muted/30 border-t border-border/60 py-5 text-xs text-muted-foreground">
              <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                <p>© {new Date().getFullYear()} kartli. All rights reserved.</p>
                <a
                  href="https://github.com/randakamal/kartli"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
                >
                  <svg
                    className="w-4 h-4 fill-current"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    />
                  </svg>
                  <span>Open Source on GitHub</span>
                </a>
              </div>
            </footer>

            <Toaster position="top-right" richColors />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

