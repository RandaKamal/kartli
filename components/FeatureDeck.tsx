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
const BODY_HEIGHT = 150;

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
      accentText: "text-accent-brand",
      accentBorder: "group-hover:border-accent-brand/40",
      iconBg: "bg-accent-brand/10 border-accent-brand/20 text-accent-brand",
      tagBg: "bg-accent-brand/10 text-accent-brand border-accent-brand/20",
    },
    {
      id: "cart",
      label: "Shared Cart",
      tag: "Live sync",
      shortName: "Cart",
      icon: ShoppingCart,
      accentText: "text-accent-secondary",
      accentBorder: "group-hover:border-accent-secondary/40",
      iconBg: "bg-accent-secondary/10 border-accent-secondary/20 text-accent-secondary",
      tagBg: "bg-accent-secondary/10 text-accent-secondary border-accent-secondary/20",
    },
    {
      id: "receipt",
      label: "Receipt Scanner",
      tag: "AI Vision",
      shortName: "Receipt",
      icon: Receipt,
      accentText: "text-accent-warning",
      accentBorder: "group-hover:border-accent-warning/40",
      iconBg: "bg-accent-warning/10 border-accent-warning/20 text-accent-warning",
      tagBg: "bg-accent-warning/10 text-accent-warning border-accent-warning/20",
    },
    {
      id: "settlement",
      label: "Settlement & Refunds",
      tag: "Fair split",
      shortName: "Split",
      icon: Scale,
      accentText: "text-accent-primary",
      accentBorder: "group-hover:border-accent-primary/40",
      iconBg: "bg-accent-primary/10 border-accent-primary/20 text-accent-primary",
      tagBg: "bg-accent-primary/10 text-accent-primary border-accent-primary/20",
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
            <div className="flex items-center justify-between p-2 rounded-xl bg-secondary/50 border border-border/70 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-brand" />
                <span className="font-medium text-foreground">Oat Milk Barista</span>
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-accent-brand/10 text-accent-brand border border-accent-brand/20">
                In Stock
              </span>
            </div>

            {/* Item 2: Espresso Beans */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-secondary/50 border border-border/70 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-warning animate-pulse" />
                <span className="font-medium text-foreground">Espresso Beans</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-accent-warning/10 text-accent-warning border border-accent-warning/20">
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
                      ? "bg-accent-brand/20 text-accent-brand border-accent-brand/30"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-border/70"
                  )}
                >
                  {espressoAdded ? (
                    <>
                      <Check className="w-3 h-3 text-accent-brand" />
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
            <div className="flex items-center justify-between p-2 rounded-xl bg-secondary/50 border border-border/70 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-brand" />
                <span className="font-medium text-foreground">Olive Oil</span>
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-accent-brand/10 text-accent-brand border border-accent-brand/20">
                In Stock
              </span>
            </div>
          </div>
        );

      case "cart":
        return (
          <div className="space-y-2 pt-2">
            {/* Item 1: Sourdough */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-secondary/50 border border-border/70 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-foreground truncate">Sourdough Loaf</span>
                <span className="text-[11px] text-muted-foreground">&middot; Sophie</span>
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-accent-secondary/10 text-accent-secondary border border-accent-secondary/20 shrink-0">
                Staged
              </span>
            </div>

            {/* Item 2: Feta */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-secondary/50 border border-border/70 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-foreground truncate">Feta Cheese</span>
                <span className="text-[11px] text-muted-foreground">&middot; Lisa</span>
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-accent-secondary/10 text-accent-secondary border border-accent-secondary/20 shrink-0">
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
                  "font-bold text-xs py-2 px-4 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer",
                  cartCheckedOut
                    ? "bg-accent-brand text-accent-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
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
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/50 border border-border/70 text-xs">
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
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 border border-border/70 text-secondary-foreground transition-colors cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-accent-warning" />
                <span>{receiptScanned ? "Parsing..." : "Rescan"}</span>
              </button>
            </div>

            {/* Clean Stat Chip */}
            <div className="flex items-center gap-2 p-2 rounded-xl bg-accent-warning/10 border border-accent-warning/20 text-xs text-accent-warning font-medium">
              <Check className="w-3.5 h-3.5 text-accent-warning" />
              <span>7 items parsed &amp; categorized automatically</span>
            </div>
          </div>
        );

      case "settlement":
        return (
          <div className="space-y-2.5 pt-2">
            {/* Sleek Balance Row */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/50 border border-border/70 text-xs">
              <span className="font-medium text-foreground">Colin +€28.20</span>
              <span className="text-muted-foreground/60">&middot;</span>
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
                "w-full font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                settled
                  ? "bg-accent-brand text-accent-foreground"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
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
        <div className="bg-card text-card-foreground border border-border/70 rounded-2xl p-4 sm:p-5 shadow-sm backdrop-blur-xl space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs tracking-tight text-foreground">
                Shared Kitchen OS
              </span>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-brand" />
                <span className="w-1.5 h-1.5 rounded-full bg-accent-secondary" />
                <span className="w-1.5 h-1.5 rounded-full bg-accent-warning" />
                <span className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
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
                      ? "bg-secondary text-secondary-foreground border-border shadow-xs"
                      : "bg-secondary/40 text-muted-foreground border-border/50 hover:text-foreground hover:bg-secondary/70"
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
          <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">
                {cards[activeCard].label}
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-secondary/80 text-secondary-foreground border border-border/70">
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
        {/* Ambient Accent Glow Blur Backdrop */}
        <div className="absolute inset-0 bg-accent-brand/10 blur-[90px] pointer-events-none -z-10 rounded-3xl" />

        {/* Stable Cards Container (Zero Container Reflow) */}
        <div className="relative w-full h-full">
          {cards.map((card, index) => {
            const isActive = index === activeCard;
            const Icon = card.icon;
            const topOffset = getCardTop(index);

            return (
              <div
                key={card.id}
                onClick={() => setActiveCard(index)}
                style={{
                  top: `${topOffset}px`,
                  zIndex: isActive ? 30 : index + 10,
                }}
                className={cn(
                  "group absolute left-0 right-0 w-full rounded-2xl p-4 border transition-all duration-300 ease-out will-change-transform",
                  "bg-card text-card-foreground backdrop-blur-xl",
                  card.accentBorder,
                  isActive
                    ? "z-30 scale-[1.01] border-border shadow-xl dark:shadow-2xl"
                    : "border-border/70 shadow-sm hover:border-border cursor-pointer"
                )}
              >
                {/* Header Trigger Zone: Clicking or hovering on top h-[52px] sets active card */}
                <div
                  className={cn(
                    "h-[52px] flex items-center justify-between cursor-pointer select-none -m-4 p-4 mb-0 transition-colors duration-200 hover:bg-secondary/40",
                    isActive ? "rounded-t-2xl" : "rounded-2xl"
                  )}
                  onMouseEnter={() => setActiveCard(index)}
                  onClick={() => setActiveCard(index)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-200",
                        card.iconBg,
                        isActive && "ring-1 ring-border shadow-xs"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-bold text-card-foreground tracking-tight truncate">
                        {card.label}
                      </span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-brand animate-pulse shrink-0" />
                      )}
                    </div>
                  </div>

                  <span
                    className={cn(
                      "text-[11px] font-medium px-2.5 py-0.5 rounded-full border shrink-0 transition-colors",
                      isActive
                        ? card.tagBg
                        : "bg-secondary/80 text-secondary-foreground border-border/70"
                    )}
                  >
                    {card.tag}
                  </span>
                </div>

                {/* Body Content: Fixed height h-[150px] when active, h-0 when inactive */}
                <div
                  className={cn(
                    isActive
                      ? "h-[150px] opacity-100 transition-opacity duration-200"
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
