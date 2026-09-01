"use client";

import React from "react";
import { useI18n } from "@/context/i18n-context";
import { Languages, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className={cn(
            "h-9 px-2.5 rounded-xl border border-border/80 bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors gap-1.5 text-xs font-semibold shadow-2xs",
            className
          )}
          aria-label="Switch language"
        >
          <Languages className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="uppercase font-mono text-[11px]">{lang}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36 rounded-2xl shadow-xl p-1 bg-card border-border">
        <DropdownMenuItem
          onClick={() => setLang("en")}
          className={cn(
            "cursor-pointer rounded-xl text-xs font-medium flex items-center justify-between px-2.5 py-2",
            lang === "en" && "bg-muted font-bold text-foreground"
          )}
        >
          <div className="flex items-center gap-2">
            <span>🇬🇧</span>
            <span>English</span>
          </div>
          {lang === "en" && <Check className="w-3.5 h-3.5 text-accent-brand" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setLang("de")}
          className={cn(
            "cursor-pointer rounded-xl text-xs font-medium flex items-center justify-between px-2.5 py-2",
            lang === "de" && "bg-muted font-bold text-foreground"
          )}
        >
          <div className="flex items-center gap-2">
            <span>🇩🇪</span>
            <span>Deutsch</span>
          </div>
          {lang === "de" && <Check className="w-3.5 h-3.5 text-accent-brand" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
