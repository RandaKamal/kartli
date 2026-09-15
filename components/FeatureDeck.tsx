"use client";

import React, { useState } from "react";
import {
  Package,
  ShoppingCart,
  Receipt,
  Scale,
  CheckCircle2,
  Check,
  Plus,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Desktop Stack Constants (Apple Wallet layered depth)
const DESKTOP_TAB_HEIGHT = 52;
const DESKTOP_CARD_HEIGHT = 226;
const DESKTOP_TOTAL_HEIGHT = 3 * DESKTOP_TAB_HEIGHT + DESKTOP_CARD_HEIGHT; // 156 + 226 = 382px

export function FeatureDeck() {
  const [pinnedIndex, setPinnedIndex] = useState<number>(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const activeIndex = hoveredIndex !== null ? hoveredIndex : pinnedIndex;

  // --- Interactive State: Card 1 (Pantry) ---
  const [espressoAdded, setEspressoAdded] = useState(false);

  // --- Interactive State: Card 2 (Shared Cart) ---
  const [cartCheckedOut, setCartCheckedOut] = useState(false);

  // --- Interactive State: Card 3 (Receipt Scanner) ---
  const [receiptScanned, setReceiptScanned] = useState(false);

  // --- Interactive State: Card 4 (Settlement & Refunds) ---
  const [settled, setSettled] = useState(false);

  const cards = [
    {
      id: "pantry",
      label: "Pantry Staples",
      tag: "Always stocked",
      shortName: "Pantry",
      icon: Package,
    },
    {
      id: "cart",
      label: "Shared Cart",
      tag: "Live sync",
      shortName: "Cart",
      icon: ShoppingCart,
    },
    {
      id: "receipt",
      label: "Receipt Scanner",
      tag: "AI Vision",
      shortName: "Receipt",
      icon: Receipt,
    },
    {
      id: "settlement",
      label: "Settlement & Refunds",
      tag: "Fair split",
      shortName: "Split",
      icon: Scale,
    },
  ];

  // Compute absolute Y offset and 3D depth for each card in the desktop deck
  const getDesktopCardTransform = (index: number) => {
    let translateY = 0;
    if (index <= activeIndex) {
      translateY = index * DESKTOP_TAB_HEIGHT;
    } else {
      translateY =
        activeIndex * DESKTOP_TAB_HEIGHT +
        DESKTOP_CARD_HEIGHT +
        (index - activeIndex - 1) * DESKTOP_TAB_HEIGHT;
    }

    const isActive = index === activeIndex;
    const distanceFromActive = Math.abs(index - activeIndex);
    const scale = isActive ? 1.02 : Math.max(0.97, 1 - distanceFromActive * 0.015);
    const zIndex = isActive ? 30 : 10 + index;

    return { translateY, scale, zIndex, isActive };
  };

  // Render the inner feature preview content
  const renderCardContent = (cardId: string) => {
    switch (cardId) {
      case "pantry":
        return (
          <div className="flex flex-col justify-between h-full space-y-2.5">
            <div className="space-y-1.5">
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

            <p className="text-[11px] text-muted-foreground pt-1 border-t border-white/[0.05]">
              Always know what&apos;s in the kitchen before heading to the store.
            </p>
          </div>
        );

      case "cart":
        return (
          <div className="flex flex-col justify-between h-full space-y-2.5">
            <div className="space-y-1.5">
              {/* Item 1: Sourdough */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] text-muted-foreground">Sophie:</span>
                  <span className="font-medium text-foreground truncate">Sourdough Loaf</span>
                </div>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 shrink-0">
                  Staged
                </span>
              </div>

              {/* Item 2: Feta */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] text-muted-foreground">Lisa:</span>
                  <span className="font-medium text-foreground truncate">Greek Feta Cheese</span>
                </div>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 shrink-0">
                  Staged
                </span>
              </div>
            </div>

            {/* CTA Pill */}
            <div className="pt-1 border-t border-white/[0.05] flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground truncate">
                2 items ready for purchase
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCartCheckedOut((prev) => !prev);
                }}
                className={cn(
                  "text-xs font-semibold px-3 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0",
                  cartCheckedOut
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 text-black shadow-md hover:opacity-90"
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
          <div className="flex flex-col justify-between h-full space-y-2.5">
            <div className="space-y-1.5">
              {/* Receipt Snapshot */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-xs">
                <div>
                  <div className="font-semibold text-foreground">Rewe Supermarkt</div>
                  <div className="text-[11px] text-muted-foreground">May 14 &middot; €18.40</div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setReceiptScanned(true);
                    setTimeout(() => setReceiptScanned(false), 1200);
                  }}
                  className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-foreground transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>{receiptScanned ? "Scanning..." : "Rescan"}</span>
                </button>
              </div>

              {/* Categorization Summary */}
              <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>7 items detected & categorized automatically</span>
                </div>
                <div className="text-[11px] text-muted-foreground flex justify-between">
                  <span>5 shared groceries</span>
                  <span className="text-zinc-400 font-medium">2 personal snacks</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground pt-1 border-t border-white/[0.05]">
              Zero image retention. Receipts auto-purge after settlement.
            </p>
          </div>
        );

      case "settlement":
        return (
          <div className="flex flex-col justify-between h-full space-y-2.5">
            <div className="space-y-2">
              {/* Balance Overview */}
              <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-xs space-y-1">
                <div className="text-muted-foreground text-[11px]">Current Expense Balance</div>
                <div className="font-semibold text-sm text-foreground">
                  Colin paid €28.20 &middot; Lisa owes €14.10
                </div>
              </div>
            </div>

            {/* Clean Primary Action Button */}
            <div className="pt-1 border-t border-white/[0.05]">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSettled((prev) => !prev);
                }}
                className={cn(
                  "w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                  settled
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 text-black shadow-md hover:opacity-90 font-bold"
                )}
              >
                {settled ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>All Balances Settled &middot; Tap to Reset</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark as Settled</span>
                  </>
                )}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto select-none">
      {/* ========================================================================= */}
      {/* 1. MOBILE RESPONSIVE SWITCHER (VISIBLE ON `< md`)                         */}
      {/* Touch-friendly tabs, zero overflow, no negative margins, no clipping     */}
      {/* ========================================================================= */}
      <div className="block md:hidden w-full max-w-md mx-auto">
        <div className="bg-[#121215] border border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl space-y-4">
          {/* Deck Header */}
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs tracking-tight text-foreground">
                Shared Kitchen OS
              </span>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400/80" />
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
              const isSelected = activeIndex === idx;

              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setPinnedIndex(idx)}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer gap-1 text-[11px] font-medium border",
                    isSelected
                      ? "bg-gradient-to-br from-emerald-400/15 via-teal-300/10 to-cyan-400/10 text-foreground border-emerald-400/30 shadow-xs"
                      : "bg-white/[0.03] text-muted-foreground border-white/[0.05] hover:text-foreground hover:bg-white/[0.06]"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-3.5 h-3.5 transition-colors",
                      isSelected ? "text-emerald-400" : "text-muted-foreground"
                    )}
                  />
                  <span className="truncate">{card.shortName}</span>
                </button>
              );
            })}
          </div>

          {/* Active Mobile Feature Card */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 space-y-3">
            {/* Card Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">
                  {cards[activeIndex].label}
                </span>
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/[0.06] text-muted-foreground border border-white/10">
                {cards[activeIndex].tag}
              </span>
            </div>

            {/* Active Content Preview */}
            <div className="min-h-[170px]">
              {renderCardContent(cards[activeIndex].id)}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DESKTOP LAYERED CARD DECK (VISIBLE ON `md:`)                           */}
      {/* Apple-Wallet vertical layered stack with crisp hover expansion           */}
      {/* ========================================================================= */}
      <div className="hidden md:block relative w-full">
        {/* Subtle Ambient Glow Backdrop */}
        <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-500/15 via-teal-500/10 to-cyan-500/15 rounded-3xl blur-2xl pointer-events-none -z-10" />

        {/* Outer Shell */}
        <div className="relative border border-white/[0.08] bg-[#121215] rounded-2xl p-5 shadow-2xl backdrop-blur-xl space-y-3.5">
          {/* Deck Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs tracking-tight text-foreground">
                Shared Kitchen OS
              </span>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              </div>
            </div>

            {/* Subtle Switcher Dots */}
            <div className="flex items-center gap-1.5">
              {cards.map((card, idx) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setPinnedIndex(idx)}
                  title={card.label}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                    activeIndex === idx
                      ? "w-6 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400"
                      : "w-3 bg-white/20 hover:bg-white/40"
                  )}
                  aria-label={`Show ${card.label}`}
                />
              ))}
            </div>
          </div>

          {/* Layered Stacked Cards Container */}
          <div
            className="relative w-full overflow-visible"
            style={{ height: `${DESKTOP_TOTAL_HEIGHT}px` }}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {cards.map((card, index) => {
              const { translateY, scale, zIndex, isActive } = getDesktopCardTransform(index);
              const Icon = card.icon;

              return (
                <div
                  key={card.id}
                  onClick={() => setPinnedIndex(index)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  style={{
                    transform: `translate3d(0, ${translateY}px, 0) scale(${scale})`,
                    zIndex,
                    height: `${DESKTOP_CARD_HEIGHT}px`,
                  }}
                  className={cn(
                    "absolute top-0 left-0 right-0 rounded-2xl p-4 sm:p-4.5 cursor-pointer",
                    "bg-[#121215] border transition-all duration-300 ease-out backdrop-blur-xl",
                    isActive
                      ? "border-white/20 shadow-2xl shadow-black/80 ring-1 ring-white/10"
                      : "border-white/[0.08] hover:border-white/20 shadow-lg shadow-black/40"
                  )}
                >
                  {/* Micro-border top highlight */}
                  <div
                    className={cn(
                      "absolute top-0 left-4 right-4 h-[1px] transition-opacity duration-300",
                      isActive
                        ? "bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 opacity-90"
                        : "bg-white/10 opacity-30"
                    )}
                  />

                  {/* Top Tab Header (Height ~ 42px) */}
                  <div className="flex items-center justify-between pb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors duration-200",
                          isActive
                            ? "bg-gradient-to-br from-emerald-400/20 via-teal-300/15 to-cyan-400/10 border-emerald-400/30 text-emerald-300"
                            : "bg-white/[0.04] border-white/10 text-muted-foreground"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-foreground truncate">
                          {card.label}
                        </span>
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        )}
                      </div>
                    </div>

                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/[0.05] text-muted-foreground border border-white/[0.08] shrink-0">
                      {card.tag}
                    </span>
                  </div>

                  {/* Expanded Content View */}
                  <div
                    className={cn(
                      "transition-all duration-300 pt-1 flex flex-col justify-between",
                      isActive
                        ? "opacity-100 pointer-events-auto"
                        : "opacity-0 pointer-events-none select-none"
                    )}
                    style={{ height: `${DESKTOP_CARD_HEIGHT - DESKTOP_TAB_HEIGHT - 18}px` }}
                  >
                    {renderCardContent(card.id)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
