"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserDropdown } from "@/components/UserDropdown";
import { useTranslation } from "@/lib/i18n";

export interface NavbarUser {
  id?: string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export interface NavbarProps {
  user?: NavbarUser | null;
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const { locale, setLocale, t } = useTranslation();
  const isDashboard =
    pathname === "/dashboard" || pathname?.startsWith("/dashboard/");
  const brandHref = user ? "/dashboard" : "/";

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/60">
      <div className="flex items-center justify-between px-4 md:px-6 h-14 md:h-16 w-full max-w-7xl mx-auto">
        {/* Left: kartli brand mark + clean wordmark */}
        <Link
          href={brandHref}
          className="flex items-center gap-2.5 font-bold text-lg text-foreground tracking-tight group"
          aria-label="kartli home"
        >
          <span className="w-8 h-8 rounded-xl bg-card border border-border/70 flex items-center justify-center text-xs font-black relative shadow-xs group-hover:border-accent-brand/50 transition-colors">
            <span className="text-foreground">k</span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent-brand absolute top-1.5 right-1.5" />
          </span>
          <span className="tracking-tight text-foreground font-extrabold text-lg">
            kartli
          </span>
        </Link>

        {/* Right: Actions */}
        <nav className="flex items-center gap-2 text-sm">
          {/* Compact Secondary Actions (Language & Theme) */}
          <div className="flex items-center gap-1.5">
            {/* Understated language switcher pill */}
            <button
              type="button"
              onClick={() => setLocale(locale === "en" ? "de" : "en")}
              className="h-7 px-2 text-[11px] font-mono rounded-lg border border-border/60 bg-secondary/30 md:h-8 md:px-2.5 md:text-xs md:rounded-xl md:border-border hover:bg-secondary font-semibold transition-colors flex items-center gap-1 cursor-pointer select-none text-foreground"
              title={locale === "en" ? "Auf Deutsch umschalten" : "Switch to English"}
              aria-label={`Current language: ${locale.toUpperCase()}. Toggle language.`}
            >
              <Globe className="w-3.5 h-3.5 text-muted-foreground hidden md:block" />
              <span>{locale === "en" ? "EN" : "DE"}</span>
            </button>

            {/* Subtle theme toggle */}
            <ThemeToggle />
          </div>

          {user ? (
            <>
              {/* Secondary + New Kitchen trigger */}
              <Button
                asChild
                variant="outline"
                className="h-9 rounded-xl px-3.5 text-xs font-semibold hidden md:inline-flex items-center gap-1.5 border-border/70 hover:border-border hover:bg-secondary/60 hover:-translate-y-px hover:shadow-xs transition-all"
              >
                <Link href="/kitchen/new">
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.nav.newKitchen}</span>
                </Link>
              </Button>

              {/* Redundancy-free Dashboard trigger (hidden when already on dashboard, hidden on mobile) */}
              {!isDashboard && (
                <Button
                  asChild
                  size="sm"
                  variant="default"
                  className="h-9 rounded-xl px-3.5 text-xs font-semibold shadow-xs hover:-translate-y-px transition-all hidden md:inline-flex"
                >
                  <Link href="/dashboard" className="flex items-center gap-1">
                    <span>{t.nav.dashboard}</span>
                    <span className="text-[11px] opacity-80">→</span>
                  </Link>
                </Button>
              )}

              {/* User identity badge / dropdown */}
              <UserDropdown user={{ username: user.username || "user" }} />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="secondary"
                className="h-9 rounded-xl px-3.5 text-xs font-medium border border-border/70 hover:bg-secondary transition-all"
              >
                <Link href="/login">{t.nav.login}</Link>
              </Button>
              <Button
                asChild
                variant="default"
                className="h-9 rounded-xl px-3.5 text-xs font-semibold shadow-xs hover:-translate-y-px transition-all"
              >
                <Link href="/register">{t.nav.signup}</Link>
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
