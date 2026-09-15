"use client";

import React, { useState } from "react";
import {
  Package,
  ShoppingCart,
  Receipt,
  Scale,
  Check,
  Plus,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Geometric Clean Offsets (Prevents cards from ever vanishing or getting swallowed)
const TAB_HEIGHT = 52;
const BODY_HEIGHT = 160;

export function FeatureDeck() {
  // Stable React state: defaults to card 3 (open at bottom in resting state)
  const [activeCard, setActiveCard] = useState<number>(3);

  // --- Interactive Feature States ---
  const [espressoAdded, setEspressoAdded] = useState(false);
  const [cartCheckedOut, setCartCheckedOut] = useState(false);
  const [receiptScanned, setReceiptScanned] = useState(false);
  const [settled, setSettled] = useState(false);

  const cards = [
    {
      id: "pantry",
      label: "Pantry Staples",
      tag: "Always stocked",
      shortName: "Pantry",
      icon: Package,
      accentText: "text-emerald-400",
      accentBorder: "group-hover:border-emerald-500/30",
      iconBg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
      tagBg: "bg-emerald-500/10 text-emerald-400/90 border-emerald-500/20",
    },
    {
      id: "cart",
      label: "Shared Cart",
      tag: "Live sync",
      shortName: "Cart",
      icon: ShoppingCart,
      accentText: "text-teal-400",
      accentBorder: "group-hover:border-teal-500/30",
      iconBg: "bg-teal-500/10 border-teal-500/20 text-teal-400",
      tagBg: "bg-teal-500/10 text-teal-400/90 border-teal-500/20",
    },
    {
      id: "receipt",
      label: "Receipt Scanner",
      tag: "AI Vision",
      shortName: "Receipt",
      icon: Receipt,
      accentText: "text-amber-400",
      accentBorder: "group-hover:border-amber-500/30",
      iconBg: "bg-amber-500/10 border-amber-500/20 text-amber-400",
      tagBg: "bg-amber-500/10 text-amber-400/90 border-amber-500/20",
    },
    {
      id: "settlement",
      label: "Settlement & Refunds",
      tag: "Fair split",
      shortName: "Split",
      icon: Scale,
      accentText: "text-cyan-400",
      accentBorder: "group-hover:border-cyan-500/30",
      iconBg: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
      tagBg: "bg-cyan-500/10 text-cyan-400/90 border-cyan-500/20",
    },
  ];

  // Dynamic vertical offset calculation based on activeCard
  const getCardTop = (index: number) => {
    if (index <= activeCard) {
      return index * TAB_HEIGHT;
    }
    return index * TAB_HEIGHT + BODY_HEIGHT;
  };

  // Pure, editorial, punchy preview content
  const renderCardContent = (cardId: string) => {
    switch (cardId) {
      case "pantry":
        return (
          <div className="space-y-1.5 pt-2">
            {/* Item 1 */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] text-xs">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="font-medium text-foreground">Oat Milk Barista</span>
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                In Stock
              </span>
            </div>

            {/* Item 2: Espresso Beans */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] text-xs">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="font-medium text-foreground">Espresso Beans</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Low
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEspressoAdded((prev) => !prev);
                  }}
                  className={cn(
                    "text-[11px] font-medium px-2 py-0.5 rounded-md border transition-all cursor-pointer flex items-center gap-1",
                    espressoAdded
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-white/[0.06] hover:bg-white/[0.12] text-foreground border-white/10"
                  )}
                >
                  {espressoAdded ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Added to Cart</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3 text-muted-foreground" />
                      <span>Add to list</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Item 3 */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] text-xs">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="font-medium text-foreground">Olive Oil</span>
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                In Stock
              </span>
            </div>
          </div>
        );

      case "cart":
        return (
          <div className="space-y-2 pt-2">
            {/* Item 1: Sourdough */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-foreground truncate">Sourdough Loaf</span>
                <span className="text-[11px] text-muted-foreground">&middot; Sophie</span>
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 shrink-0">
                Staged
              </span>
            </div>

            {/* Item 2: Feta */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-foreground truncate">Feta Cheese</span>
                <span className="text-[11px] text-muted-foreground">&middot; Lisa</span>
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 shrink-0">
                Staged
              </span>
            </div>

            {/* Compact CTA */}
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCartCheckedOut((prev) => !prev);
                }}
                className={cn(
                  "bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-zinc-950 font-bold text-xs py-2 px-4 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer",
                  cartCheckedOut && "from-emerald-600 to-teal-600 text-white"
                )}
              >
                {cartCheckedOut ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Cart Checked Out</span>
                  </>
                ) : (
                  <>
                    <span>Checkout Cart</span>
                    <ArrowRight className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>
          </div>
        );

      case "receipt":
        return (
          <div className="space-y-2 pt-2">
            {/* Clean Receipt Snapshot */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-xs">
              <div>
                <span className="font-semibold text-foreground">Rewe Supermarkt</span>
                <span className="text-muted-foreground ml-2 font-mono">€18.40</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setReceiptScanned(true);
                  setTimeout(() => setReceiptScanned(false), 1200);
                }}
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-foreground transition-colors cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>{receiptScanned ? "Parsing..." : "Rescan"}</span>
              </button>
            </div>

            {/* Clean Stat Chip */}
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs text-amber-400 font-medium">
              <Check className="w-3.5 h-3.5 text-amber-400" />
              <span>7 items parsed &amp; categorized automatically</span>
            </div>
          </div>
        );

      case "settlement":
        return (
          <div className="space-y-2.5 pt-2">
            {/* Sleek Balance Row */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-xs">
              <span className="font-medium text-foreground">Colin +€28.20</span>
              <span className="text-zinc-500">&middot;</span>
              <span className="font-medium text-foreground">Lisa -€14.10</span>
            </div>

            {/* Refined Luxury CTA Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSettled((prev) => !prev);
              }}
              className={cn(
                "w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-zinc-950 font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                settled && "from-emerald-600 to-teal-600 text-white"
              )}
            >
              {settled ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>All Balances Settled</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Mark as Settled</span>
                </>
              )}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto select-none">
      {/* ========================================================================= */}
      {/* 1. MOBILE RESPONSIVE SWITCHER (VISIBLE ON `< md`)                         */}
      {/* Touch-friendly tabs, zero overflow, no negative margins, zero clipping   */}
      {/* ========================================================================= */}
      <div className="block md:hidden w-full">
        <div className="bg-[#121215]/95 border border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs tracking-tight text-foreground">
                Shared Kitchen OS
              </span>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400/80" />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/80" />
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
              Live Preview
            </span>
          </div>

          {/* 4 Clean Mobile Touch Chips */}
          <div className="grid grid-cols-4 gap-1.5">
            {cards.map((card, idx) => {
              const Icon = card.icon;
              const isSelected = activeCard === idx;

              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setActiveCard(idx)}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer gap-1 text-[11px] font-medium border",
                    isSelected
                      ? "bg-white/[0.08] text-foreground border-white/20 shadow-xs"
                      : "bg-white/[0.02] text-muted-foreground border-white/[0.05] hover:text-foreground hover:bg-white/[0.05]"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-3.5 h-3.5 transition-colors",
                      isSelected ? card.accentText : "text-muted-foreground"
                    )}
                  />
                  <span className="truncate">{card.shortName}</span>
                </button>
              );
            })}
          </div>

          {/* Active Mobile Feature Card */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">
                {cards[activeCard].label}
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/[0.06] text-muted-foreground border border-white/10">
                {cards[activeCard].tag}
              </span>
            </div>

            {/* Active Content Preview */}
            <div className="min-h-[140px]">
              {renderCardContent(cards[activeCard].id)}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DESKTOP APPLE WALLET CARD DECK (VISIBLE ON `md:`)                       */}
      {/* Fixed absolute base position: calculated vertical offsets per activeCard */}
      {/* ========================================================================= */}
      <div className="hidden md:block relative w-full max-w-md h-[380px] mx-auto">
        {/* Ambient Emerald Glow Blur Backdrop */}
        <div className="absolute inset-0 bg-emerald-500/10 blur-[90px] pointer-events-none -z-10 rounded-3xl" />

        {/* Stable Cards Container (Zero Container Reflow) */}
        <div className="relative w-full h-full">
          {cards.map((card, index) => {
            const isActive = index === activeCard;
            const Icon = card.icon;
            const topOffset = getCardTop(index);

            return (
              <div
                key={card.id}
                style={{
                  top: `${topOffset}px`,
                  zIndex: index + 10,
                }}
                className={cn(
                  "group absolute left-0 right-0 w-full rounded-2xl p-4 border transition-all duration-300 ease-out will-change-transform",
                  // Unified Obsidian-Graphite Base
                  "bg-[#121215]/95 backdrop-blur-xl border-white/10",
                  // Top specular highlight
                  "border-t border-t-white/[0.16]",
                  // Subtle ambient hover glow on card border
                  card.accentBorder,
                  // Dynamic shadow based on state
                  isActive
                    ? "shadow-[0_20px_50px_rgba(0,0,0,0.85)] border-white/[0.14]"
                    : "shadow-[0_-4px_24px_rgba(0,0,0,0.6)] cursor-pointer"
                )}
              >
                {/* Header Trigger Zone: Clicking or hovering on top h-[52px] sets active card */}
                <div
                  className="h-[52px] flex items-center justify-between cursor-pointer select-none -m-4 p-4 mb-0"
                  onMouseEnter={() => setActiveCard(index)}
                  onClick={() => setActiveCard(index)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-200",
                        card.iconBg,
                        isActive && "ring-1 ring-white/10 shadow-xs"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-bold text-foreground tracking-tight truncate">
                        {card.label}
                      </span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      )}
                    </div>
                  </div>

                  <span
                    className={cn(
                      "text-[11px] font-medium px-2.5 py-0.5 rounded-full border shrink-0 transition-colors",
                      isActive ? card.tagBg : "bg-white/[0.05] text-zinc-400 border-white/10"
                    )}
                  >
                    {card.tag}
                  </span>
                </div>

                {/* Body Content: Fixed height h-[160px] when active, h-0 when inactive */}
                <div
                  className={cn(
                    isActive
                      ? "h-[160px] opacity-100 transition-opacity duration-200 delay-100"
                      : "h-0 opacity-0 pointer-events-none overflow-hidden"
                  )}
                >
                  {renderCardContent(card.id)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
