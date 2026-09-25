"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserDropdown } from "@/components/UserDropdown";

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
  const isDashboard =
    pathname === "/dashboard" || pathname?.startsWith("/dashboard/");
  const brandHref = user ? "/dashboard" : "/";

  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border/70">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
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
          {/* Subtle theme toggle */}
          <ThemeToggle />

          {user ? (
            <>
              {/* Secondary + New Kitchen trigger */}
              <Button
                asChild
                variant="outline"
                className="h-9 rounded-xl px-3.5 text-xs font-semibold hidden sm:inline-flex items-center gap-1.5 border-border/70 hover:border-border hover:bg-secondary/60 hover:-translate-y-px hover:shadow-xs transition-all"
              >
                <Link href="/kitchen/new">
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Kitchen</span>
                </Link>
              </Button>

              {/* Redundancy-free Dashboard trigger (hidden when already on dashboard) */}
              {!isDashboard && (
                <Button
                  asChild
                  size="sm"
                  variant="default"
                  className="h-9 rounded-xl px-3.5 text-xs font-semibold shadow-xs hover:-translate-y-px transition-all"
                >
                  <Link href="/dashboard" className="flex items-center gap-1">
                    <span>Dashboard</span>
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
                <Link href="/login">Log in</Link>
              </Button>
              <Button
                asChild
                variant="default"
                className="h-9 rounded-xl px-3.5 text-xs font-semibold shadow-xs hover:-translate-y-px transition-all"
              >
                <Link href="/register">Sign up</Link>
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
