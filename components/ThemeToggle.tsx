"use client";

import * as React from "react";
import { Moon, Sun, Laptop } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function ThemeToggle({
  className,
}: {
  className?: string;
}) {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "relative h-8 w-8 rounded-lg border border-border/60 bg-secondary/30 hover:bg-secondary inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors",
          className
        )}
        aria-label="Toggle theme"
      >
        <Sun className="h-3.5 w-3.5" />
      </Button>
    );
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative h-8 w-8 rounded-lg border border-border/60 bg-secondary/30 hover:bg-secondary inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors",
            className
          )}
          aria-label="Toggle theme"
        >
          <Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36 rounded-xl shadow-md">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={`cursor-pointer rounded-lg text-xs font-medium ${theme === "light" ? "text-foreground font-semibold bg-muted/60" : ""}`}
        >
          <Sun className="mr-2 h-3.5 w-3.5" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={`cursor-pointer rounded-lg text-xs font-medium ${theme === "dark" ? "text-foreground font-semibold bg-muted/60" : ""}`}
        >
          <Moon className="mr-2 h-3.5 w-3.5" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={`cursor-pointer rounded-lg text-xs font-medium ${theme === "system" ? "text-foreground font-semibold bg-muted/60" : ""}`}
        >
          <Laptop className="mr-2 h-3.5 w-3.5" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
