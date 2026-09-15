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
import { SiteFooter } from "@/components/SiteFooter";
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

  const normalizeTheme = (t?: string) => {
    if (!t || t === "truffle" || t === "black_truffle") return "black-truffle";
    if (t === "saffron" || t === "olive") return "campari-bitter";
    if (t === "plum") return "velvet-fig";
    if (t === "nordic") return "matcha-pistachio";
    return t;
  };

  const initialTheme = normalizeTheme(culinaryTheme);

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
            __html: `(function(){try{var t=localStorage.getItem('kartli-theme')||localStorage.getItem('culinary-theme')||(document.cookie.match(/(?:kartli-theme|culinary-theme)=([^;]+)/)||[])[1]||'${initialTheme}';if(t==='truffle'||t==='black_truffle')t='black-truffle';else if(t==='saffron'||t==='olive')t='campari-bitter';else if(t==='plum')t='velvet-fig';else if(t==='nordic')t='matcha-pistachio';document.documentElement.setAttribute('data-theme',t);document.documentElement.setAttribute('data-culinary-theme',t);}catch(e){}})()`,
          }}
        />
      </head>
      <body className="bg-background text-foreground min-h-[100dvh] flex flex-col antialiased selection:bg-accent-primary/20 selection:text-foreground overflow-x-hidden">
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

            <main className="w-full flex-1 flex flex-col">
              {children}
            </main>

            <SiteFooter />

            <Toaster position="top-right" richColors />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

