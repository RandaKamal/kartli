"use client";

import React, { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export function FeatureDeck() {
  const { locale } = useTranslation();
  const [settled, setSettled] = useState(false);

  const isDe = locale === "de";

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-zinc-900/60 border border-white/[0.08] rounded-xl p-4 sm:p-5 shadow-xl space-y-4">
        {/* Clean Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-foreground tracking-tight truncate">
              {isDe ? "WG Sonnenstraße" : "Flatshare Kitchen"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>{isDe ? "3 Mitglieder" : "3 members"}</span>
          </div>
        </div>

        {/* Compact 3-Row Preview List */}
        <div className="space-y-2">
          {/* Row 1: Staple Restock Item */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-zinc-900/40 border border-white/[0.05] text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <span className="font-medium text-zinc-200 truncate">
                {isDe ? "Hafermilch" : "Oat Milk"}
              </span>
            </div>
            <span className="text-[11px] font-medium text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md shrink-0">
              {isDe ? "Benötigt" : "Needed"}
            </span>
          </div>

          {/* Row 2: Scanned Receipt Line */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-zinc-900/40 border border-white/[0.05] text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="font-medium text-zinc-200 truncate tabular-nums">
                {isDe ? "EDEKA · 2× Zwiebeln · 2,58 €" : "EDEKA · 2× Onions · €2.58"}
              </span>
            </div>
            <span className="text-[11px] font-medium text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md shrink-0">
              {isDe ? "Gescannt" : "Scanned"}
            </span>
          </div>

          {/* Row 3: Clean Settlement Row */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-zinc-900/40 border border-white/[0.05] text-xs">
            <div className="min-w-0">
              <span className="font-medium text-zinc-200 tabular-nums">
                Finn → Lisa · 14,10 €
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSettled(!settled)}
              className={cn(
                "h-7 px-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 shrink-0",
                settled
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
                  : "bg-white text-zinc-950 hover:bg-zinc-200 shadow-xs"
              )}
            >
              {settled && <Check className="w-3 h-3" />}
              <span>
                {settled
                  ? (isDe ? "Ausgeglichen" : "Settled")
                  : (isDe ? "Als ausgeglichen markieren" : "Settle")}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
