"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, Settings, Loader2, UtensilsCrossed } from "lucide-react";
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

interface UserDropdownProps {
  user: {
    username: string;
  };
}

export function UserDropdown({ user }: UserDropdownProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
          size="sm"
          className="flex items-center gap-2 rounded-xl border border-border/70 px-2.5"
        >
          <Avatar className="h-5 w-5 border-0">
            <AvatarFallback className="bg-secondary text-[10px] text-foreground font-semibold">
              {user.username?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium max-w-[90px] sm:max-w-none truncate">@{user.username}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="font-normal text-xs text-muted-foreground">
          Signed in as <strong className="text-foreground">@{user.username}</strong>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="flex items-center gap-2 w-full cursor-pointer">
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>My Kitchens</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex items-center gap-2 w-full cursor-pointer">
            <Settings className="w-3.5 h-3.5" />
            <span>Settings &amp; Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            handleLogout();
          }}
          disabled={isLoggingOut}
          className="flex items-center gap-2 w-full text-destructive focus:text-destructive cursor-pointer text-xs"
        >
          {isLoggingOut ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Signing out...</span>
            </>
          ) : (
            <>
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
