"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, Settings, Loader2, LayoutDashboard } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/app/actions/auth";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface UserDropdownProps {
  user: {
    username?: string | null;
  };
  className?: string;
}

export function UserDropdown({ user, className }: UserDropdownProps) {
  const { t } = useTranslation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const username = user.username || "user";
  const initial = username.charAt(0).toUpperCase() || "U";

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logoutAction();
    } catch {
      // In case of error or redirect
      setIsLoggingOut(false);
    }
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          className={cn(
            "h-8 w-8 rounded-full border border-border/70 bg-secondary/40 inline-flex items-center justify-center leading-none font-bold text-xs p-0 text-foreground md:h-8 md:w-auto md:px-2.5 md:rounded-lg md:border-border/60 md:font-medium md:gap-2 hover:bg-secondary transition-colors cursor-pointer",
            className
          )}
          aria-label={`User menu for @${username}`}
        >
          <span className="md:hidden select-none leading-none flex items-center justify-center">{initial}</span>
          <Avatar className="hidden md:flex h-4.5 w-4.5 border border-border/60 shadow-2xs">
            <AvatarFallback className="bg-secondary-foreground/10 text-[9px] text-foreground font-bold flex items-center justify-center">
              {initial}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:inline text-xs font-medium max-w-[90px] sm:max-w-none truncate">
            @{username}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-md">
        <DropdownMenuLabel className="font-normal text-xs text-muted-foreground">
          {t.userDropdown.signedInAs} <strong className="text-foreground">@{username}</strong>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="hover:bg-white/10 dark:hover:bg-white/5 hover:text-foreground transition-colors duration-150 rounded-lg">
          <Link href="/dashboard" className="flex items-center gap-2 w-full cursor-pointer">
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>{t.userDropdown.dashboard}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="hover:bg-white/10 dark:hover:bg-white/5 hover:text-foreground transition-colors duration-150 rounded-lg">
          <Link href="/profile" className="flex items-center gap-2 w-full cursor-pointer">
            <Settings className="w-3.5 h-3.5" />
            <span>{t.userDropdown.settingsAndProfile}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            handleLogout();
          }}
          disabled={isLoggingOut}
          className="flex items-center gap-2 w-full text-destructive focus:text-destructive hover:bg-white/10 dark:hover:bg-white/5 hover:text-destructive focus:bg-white/10 dark:focus:bg-white/5 data-[highlighted]:bg-white/10 dark:data-[highlighted]:bg-white/5 cursor-pointer text-xs transition-colors duration-150 rounded-lg"
        >
          {isLoggingOut ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{t.userDropdown.signingOut}</span>
            </>
          ) : (
            <>
              <LogOut className="w-3.5 h-3.5" />
              <span>{t.userDropdown.signOut}</span>
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
