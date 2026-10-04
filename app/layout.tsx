import type { Metadata } from "next";
import { auth } from "@/auth";
import { Header } from "@/components/Header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { LanguageProvider, type Locale } from "@/lib/i18n";
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
  const cookieStore = await cookies();
  const culinaryTheme =
    cookieStore.get("kartli-theme")?.value ||
    cookieStore.get("culinary-theme")?.value ||
    "black-truffle";

  const normalizeTheme = (t?: string): "black-truffle" | "velvet-fig" => {
    if (t === "velvet-fig" || t === "plum") return "velvet-fig";
    return "black-truffle";
  };

  const initialTheme = normalizeTheme(culinaryTheme);

  const cookieLocale = cookieStore.get("kartli_locale")?.value;
  const initialLocale: Locale | undefined =
    cookieLocale === "de" || cookieLocale === "en" ? (cookieLocale as Locale) : undefined;

  return (
    <html
      lang={initialLocale || "en"}
      data-theme={initialTheme}
      data-culinary-theme={initialTheme}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var raw=localStorage.getItem('kartli-theme')||localStorage.getItem('culinary-theme')||(document.cookie.match(/(?:kartli-theme|culinary-theme)=([^;]+)/)||[])[1]||'${initialTheme}';var t=(raw==='velvet-fig'||raw==='plum')?'velvet-fig':'black-truffle';document.documentElement.setAttribute('data-theme',t);document.documentElement.setAttribute('data-culinary-theme',t);}catch(e){}})()`,
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
          <LanguageProvider initialLocale={initialLocale}>
            <TooltipProvider delayDuration={200}>
              <Header session={session} />

              <main className="w-full flex-1 flex flex-col">
                {children}
              </main>

              <SiteFooter />

              <Toaster position="top-right" richColors />
            </TooltipProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

