"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type {
  Kitchen,
  KitchenMember,
  KitchenMemberWithUser,
  PantryItem,
  ShoppingListItem,
  CheckoutWithDetails,
  KitchenSpaceType,
} from "@/types";
import { getSpaceTerminology } from "@/lib/spaceTerminology";
import {
  addPantryItemAction,
  addCustomShoppingItemAction,
  quickAddStapleToCartAction,
  moveAllNeededToCartAction,
} from "@/app/actions/pantry";
import { getPendingRefundsCountAction } from "@/app/actions/checkout";
import { useTranslation } from "@/lib/i18n";
import { PantrySection } from "@/components/PantrySection";
import { ShoppingListSection } from "@/components/ShoppingListSection";
import { ActiveCartSection } from "@/components/ActiveCartSection";
import { RoommatesView } from "@/components/kitchen/RoommatesView";
import { RoommatesModal } from "@/components/kitchen/RoommatesModal";
import { ExpenseLedgerModal } from "@/components/kitchen/ExpenseLedgerModal";
import { SpacePulseModal } from "@/components/kitchen/SpacePulseModal";
import { markTourCompletedAction } from "@/app/actions/user";
import { KitchenTourModal } from "@/components/kitchen/KitchenTourModal";
import { AdminRefundsSection } from "@/components/AdminRefundsSection";
import { MyPurchasesSection } from "@/components/MyPurchasesSection";
import { CopyButton } from "@/components/CopyButton";
import { GuestCartHandoverListener } from "@/components/GuestCartHandoverListener";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  UtensilsCrossed,
  ShoppingCart,
  Users,
  Settings,
  BarChart3,
  ExternalLink,
  Plus,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Home,
  Heart,
  Briefcase,
  Layers,
  Loader2,
  HelpCircle,
  Receipt,
  RotateCcw,
  Share2,
  Check,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

export interface KitchenSpaceViewProps {
  kitchen?: Kitchen;
  initialKitchen?: Kitchen;
  membership?: KitchenMember;
  members?: KitchenMemberWithUser[];
  pantryItems: PantryItem[];
  shoppingListItems: ShoppingListItem[];
  currentUserId: string;
  /** Account-level state; `has_completed_tour` drives the first-visit auto-open. */
  user?: { id: string; has_completed_tour: boolean };
  isAdmin?: boolean;
  baseUrl: string;
  defaultTab?: string;
  initialTab?: string;
  initialPulseStats?: any;
  preferredCurrency?: string;
  userPreferredCurrency?: string;
  myCheckouts?: CheckoutWithDetails[];
}

function getSpaceIcon(spaceType?: string) {
  switch (spaceType) {
    case "FAMILY":
      return <Heart className="w-3.5 h-3.5 text-rose-400" />;
    case "OFFICE":
      return <Briefcase className="w-3.5 h-3.5 text-teal-400" />;
    case "NEUTRAL":
      return <Layers className="w-3.5 h-3.5 text-indigo-400" />;
    default:
      return <Home className="w-3.5 h-3.5 text-amber-400" />;
  }
}

function getSpaceLabel(spaceType?: string) {
  switch (spaceType) {
    case "FAMILY":
      return "Family Home";
    case "OFFICE":
      return "Studio & Office";
    case "NEUTRAL":
      return "Neutral Space";
    default:
      return "Flatshare (WG)";
  }
}

export function KitchenSpaceView({
  kitchen,
  initialKitchen: propInitialKitchen,
  membership,
  members: propMembers = [],
  pantryItems: initialPantryItems,
  shoppingListItems: initialShoppingListItems,
  currentUserId,
  user,
  isAdmin: propIsAdmin,
  baseUrl,
  defaultTab = "kitchen",
  initialTab,
  initialPulseStats,
  myCheckouts = [],
}: KitchenSpaceViewProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  const getSpaceLabel = (spaceType?: string) => {
    switch (spaceType) {
      case "FAMILY":
        return t.kitchen.header.family;
      case "OFFICE":
        return t.kitchen.header.office;
      case "NEUTRAL":
        return t.kitchen.header.neutral;
      default:
        return t.kitchen.header.flatshare;
    }
  };

  const initialKitchen = kitchen || propInitialKitchen!;
  const isAdmin = propIsAdmin !== undefined ? propIsAdmin : membership?.role === "ADMIN";
  const initialMembers = propMembers;

  const effectiveTab = initialTab || defaultTab;
  // 2-Mode Kitchen Workspace: "board" (Kitchen Board) vs "supermarket" (Supermarket Run)
  const initialMode =
    effectiveTab === "cart" || searchParams?.get("tab") === "cart" || searchParams?.get("mode") === "supermarket"
      ? "supermarket"
      : "board";

  const [mode, setMode] = useState<"board" | "supermarket">(initialMode);
  const [localPantryItems, setLocalPantryItems] = useState<PantryItem[]>(initialPantryItems);
  const [localShoppingListItems, setLocalShoppingListItems] = useState<ShoppingListItem[]>(initialShoppingListItems);
  const [localMembers, setLocalMembers] = useState<KitchenMemberWithUser[]>(initialMembers);

  // Keep local state in sync when server props refresh
  useEffect(() => {
    setLocalPantryItems(initialPantryItems);
  }, [initialPantryItems]);

  useEffect(() => {
    setLocalShoppingListItems(initialShoppingListItems);
  }, [initialShoppingListItems]);

  useEffect(() => {
    setLocalMembers(initialMembers);
  }, [initialMembers]);

  // Universal Command Bar State
  const [commandInput, setCommandInput] = useState("");
  const [commandType, setCommandType] = useState<"one-off" | "staple">("one-off");
  const [isSubmittingCommand, setIsSubmittingCommand] = useState(false);

  // Overlays State
  const [isRoommatesOpen, setIsRoommatesOpen] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [isStatsFlyoutOpen, setIsStatsFlyoutOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  // Missing user prop => assume completed so we never nag by accident
  const [hasCompletedTour, setHasCompletedTour] = useState(user?.has_completed_tour ?? true);
  const [isCartBadgePulsing, setIsCartBadgePulsing] = useState(false);
  const [pendingRefundsCount, setPendingRefundsCount] = useState(0);
  const [, startTransition] = useTransition();

  const terminology = getSpaceTerminology(initialKitchen.space_type);
  const activeMembers = localMembers.filter((m) => m.joined_at !== null && m.joined_at !== undefined);
  const displayMembers = activeMembers.length > 0 ? activeMembers : localMembers;
  const roommatesCount = Math.max(displayMembers.length, 1);

  const neededItemsCount = localShoppingListItems.filter(
    (i) => !i.is_in_cart && !i.is_purchased && !i.is_guest_staged
  ).length;

  const activeCartCount = localShoppingListItems.filter(
    (i) => (i.is_in_cart || i.is_purchased || i.is_guest_staged) && !i.checkout_id
  ).length;

  const origin = typeof window !== "undefined" ? window.location.origin : baseUrl;
  const publicGuestUrl = origin
    ? `${origin}/kitchen/view/${initialKitchen.public_view_token}`
    : `/kitchen/view/${initialKitchen.public_view_token}`;

  // Fetch pending refunds count on mount
  useEffect(() => {
    let isMounted = true;
    getPendingRefundsCountAction(initialKitchen.id)
      .then((count) => {
        if (isMounted) setPendingRefundsCount(count);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [initialKitchen.id]);

  // First-time visit (per account, stored in DB): subtly open the onboarding tour once
  useEffect(() => {
    if (hasCompletedTour) return;
    const timer = setTimeout(() => setIsTourOpen(true), 800);
    return () => clearTimeout(timer);
    // Mount-only: later completion must not re-trigger or cancel anything
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Finish / skip / any dismissal: update locally right away, persist in background
  const handleTourComplete = () => {
    if (hasCompletedTour) return; // manual replay of an already-completed tour
    setHasCompletedTour(true);
    markTourCompletedAction().catch((err) => {
      console.error("Failed to persist tour completion", err);
      setHasCompletedTour(false);
    });
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${initialKitchen.name} - kartli`,
          url: publicGuestUrl,
        });
        return;
      } catch (err: any) {
        if (err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(publicGuestUrl);
      toast.success("Guest link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleModeChange = (newMode: "board" | "supermarket") => {
    setMode(newMode);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (newMode === "supermarket") {
        url.searchParams.set("tab", "cart");
      } else {
        url.searchParams.delete("tab");
      }
      window.history.replaceState({}, "", url.toString());
    }
  };

  // Universal Command Bar Add Handler
  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = commandInput.trim();
    if (!name || isSubmittingCommand) return;

    setIsSubmittingCommand(true);
    startTransition(async () => {
      try {
        if (commandType === "staple") {
          const item = await addPantryItemAction(initialKitchen.id, name);
          setLocalPantryItems((prev) =>
            [...prev, item].sort((a, b) => a.name.localeCompare(b.name))
          );
          router.refresh();
          toast.success(`Tracked "${name}" in household staples`);
        } else {
          const newItem = await addCustomShoppingItemAction(initialKitchen.id, name);
          setLocalShoppingListItems((prev) => [newItem, ...prev]);
          router.refresh();
          toast.success(`Added "${name}" to shopping queue`);
        }
        setCommandInput("");
      } catch (err: any) {
        toast.error(err.message || "Failed to stage item.");
      } finally {
        setIsSubmittingCommand(false);
      }
    });
  };

  // State sync handlers between Pantry & Shopping List
  const handlePantryItemEmptied = (item: PantryItem) => {
    setLocalPantryItems((prev) =>
      prev.map((p) => (p.id === item.id ? { ...p, is_out_of_stock: true } : p))
    );
    setLocalShoppingListItems((prev) => {
      if (prev.some((i) => i.pantry_item_id === item.id && !i.is_purchased)) {
        return prev;
      }
      const newItem: ShoppingListItem = {
        id: `temp-${Date.now()}`,
        kitchen_id: initialKitchen.id,
        pantry_item_id: item.id,
        name: item.name,
        item_price: null,
        is_purchased: false,
        purchased_by: null,
        is_in_cart: false,
        is_guest_staged: false,
        checkout_id: null,
        created_at: new Date(),
      };
      return [newItem, ...prev];
    });
  };

  const handlePantryItemRestocked = (itemOrId: string | PantryItem) => {
    const itemId = typeof itemOrId === "string" ? itemOrId : itemOrId.id;
    setLocalPantryItems((prev) =>
      prev.map((p) => (p.id === itemId ? { ...p, is_out_of_stock: false } : p))
    );
    setLocalShoppingListItems((prev) =>
      prev.filter((i) => !(i.pantry_item_id === itemId && !i.is_purchased))
    );
  };

  const handleItemMovedToCart = (item: ShoppingListItem) => {
    setLocalShoppingListItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, is_in_cart: true, is_purchased: false, purchased_by: currentUserId, is_guest_staged: false }
          : i
      )
    );
    // Trigger temporary scale and color pulse on the "Supermarket Run" tab badge
    setIsCartBadgePulsing(true);
    setTimeout(() => {
      setIsCartBadgePulsing(false);
    }, 900);
  };

  const handleItemReturnedToList = (item: ShoppingListItem) => {
    setLocalShoppingListItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, is_in_cart: false, is_purchased: false, purchased_by: null, is_guest_staged: false }
          : i
      )
    );
    if (item.pantry_item_id) {
      setLocalPantryItems((prev) =>
        prev.map((p) => (p.id === item.pantry_item_id ? { ...p, is_out_of_stock: true } : p))
      );
    }
  };

  const handleItemPurchasedToggle = (item: ShoppingListItem, isPurchased: boolean) => {
    setLocalShoppingListItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_purchased: isPurchased } : i))
    );
  };

  const handleQuickAddStapleToCart = (staple: PantryItem) => {
    const existing = localShoppingListItems.find(
      (i) => i.pantry_item_id === staple.id && !i.is_purchased
    );

    const tempId = existing?.id || `temp-${Date.now()}`;
    const targetItem: ShoppingListItem = existing || {
      id: tempId,
      kitchen_id: initialKitchen.id,
      pantry_item_id: staple.id,
      name: staple.name,
      item_price: null,
      is_purchased: false,
      purchased_by: currentUserId,
      is_in_cart: true,
      is_guest_staged: false,
      checkout_id: null,
      created_at: new Date(),
    };

    setLocalPantryItems((prev) =>
      prev.map((p) => (p.id === staple.id ? { ...p, is_out_of_stock: true } : p))
    );

    setLocalShoppingListItems((prev) => {
      if (prev.some((i) => i.id === targetItem.id)) {
        return prev.map((i) =>
          i.id === targetItem.id
            ? { ...i, is_in_cart: true, is_purchased: false, purchased_by: currentUserId }
            : i
        );
      }
      return [{ ...targetItem, is_in_cart: true, is_purchased: false, purchased_by: currentUserId }, ...prev];
    });

    setIsCartBadgePulsing(true);
    setTimeout(() => setIsCartBadgePulsing(false), 900);
    toast.success(`Added "${staple.name}" directly to your basket`);

    startTransition(async () => {
      try {
        await quickAddStapleToCartAction(initialKitchen.id, staple.id);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to add staple to basket.");
        router.refresh();
      }
    });
  };

  const handleAllItemsMovedToCart = () => {
    setLocalShoppingListItems((prev) =>
      prev.map((i) =>
        !i.is_in_cart && !i.is_purchased && !i.is_guest_staged
          ? { ...i, is_in_cart: true, is_purchased: false, purchased_by: currentUserId }
          : i
      )
    );
    setIsCartBadgePulsing(true);
    setTimeout(() => setIsCartBadgePulsing(false), 900);
    toast.success("Moved all needed items into your basket");

    startTransition(async () => {
      try {
        await moveAllNeededToCartAction(initialKitchen.id);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to move items to basket.");
        router.refresh();
      }
    });
  };

  const handleItemRemoved = (item: ShoppingListItem) => {
    setLocalShoppingListItems((prev) => prev.filter((i) => i.id !== item.id));
    if (item.pantry_item_id) {
      setLocalPantryItems((prev) =>
        prev.map((p) => (p.id === item.pantry_item_id ? { ...p, is_out_of_stock: false } : p))
      );
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full flex flex-col bg-background text-foreground selection:bg-primary/20 pb-28 md:pb-16">
      <GuestCartHandoverListener kitchenId={initialKitchen.id} />

      {/* Main Grounded Hub Container */}
      <div className="w-full max-w-lg md:max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col gap-6 sm:gap-8 flex-1">
        {/* 1. NATIVE HEADER & SPACE IDENTITY */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none pb-2 border-b border-border/60">
          {/* Left: Space title + household badge */}
          <div className="flex items-center gap-3 min-w-0 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground truncate">
              {initialKitchen.name}
            </h1>
            <span className="text-[10px] sm:text-xs tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
              {getSpaceLabel(initialKitchen.space_type)}
            </span>
            {isAdmin && (
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30 shrink-0">
                {t.kitchen.header.admin}
              </span>
            )}
          </div>

          {/* Right: Roommate avatar cluster + Stats button + Share button + Settings icon button */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 self-start sm:self-auto">
            {/* Roommate Avatar Cluster */}
            <button
              type="button"
              onClick={() => setIsRoommatesOpen(true)}
              className="flex items-center py-1 px-2.5 rounded-full hover:bg-secondary/60 border border-border/70 bg-card/60 transition-all cursor-pointer group"
              title={t.kitchen.roommates.title}
              aria-label={t.kitchen.roommates.title}
            >
              <div className="flex items-center overflow-hidden py-0.5">
                {displayMembers.slice(0, 3).map((m) => (
                  <div
                    key={m.id}
                    className="inline-flex items-center justify-center h-7 w-7 rounded-full text-[11px] font-bold ring-2 ring-card bg-secondary text-foreground -ml-2 first:ml-0 shadow-sm uppercase group-hover:scale-105 transition-transform select-none"
                  >
                    {m.kitchen_display_name.slice(0, 2)}
                  </div>
                ))}
              </div>
              <span className="text-[11px] sm:text-xs text-muted-foreground group-hover:text-foreground pl-2">
                {roommatesCount} {roommatesCount === 1 ? t.kitchen.header.roommateSingular : t.kitchen.header.roommatesCount}
              </span>
            </button>

            {/* Tutorial / Tour Button */}
            <button
              type="button"
              onClick={() => setIsTourOpen(true)}
              className="h-8 w-8 rounded-xl border border-border/80 bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-all shadow-sm cursor-pointer"
              title={t.tour.triggerTooltip}
              aria-label={t.tour.triggerTooltip}
            >
              <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Pulse / Stats Flyout Button */}
            <button
              type="button"
              onClick={() => setIsStatsFlyoutOpen(true)}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-border bg-secondary/30 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              title={t.kitchen.pulse.title}
              aria-label={t.kitchen.pulse.title}
            >
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Share icon button */}
            <button
              type="button"
              onClick={handleShare}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-border bg-secondary/30 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              title={t.dashboard.guestLink}
              aria-label={t.dashboard.guestLink}
            >
              <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Settings icon button */}
            <Link
              href={`/kitchen/${initialKitchen.id}/settings`}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-border bg-secondary/30 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              title={t.dashboard.settings}
              aria-label={t.dashboard.settings}
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Link>
          </div>
        </header>

        {/* 2. SLEEK SEGMENTED SLIDER (KITCHEN BOARD VS SUPERMARKET RUN) */}
        <div className="h-11 sm:h-12 w-full bg-secondary/40 p-1 rounded-2xl border border-border/70 backdrop-blur-xl flex items-center mb-1">
          <button
            type="button"
            onClick={() => handleModeChange("board")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm transition-all cursor-pointer select-none",
              mode === "board"
                ? "bg-card text-foreground shadow-sm border border-border/70 font-semibold duration-200"
                : "text-muted-foreground hover:text-foreground font-medium transition-colors"
            )}
          >
            <UtensilsCrossed className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{t.kitchen.modes.kitchenBoard}</span>
            <span className="hidden sm:inline text-[11px] opacity-70 font-normal">
              {t.kitchen.modes.inventoryPrep}
            </span>
            {neededItemsCount > 0 && (
              <span
                className={cn(
                  "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full leading-none transition-colors",
                  mode === "board"
                    ? "bg-secondary text-secondary-foreground border border-border"
                    : "bg-muted text-muted-foreground border border-border/70"
                )}
              >
                {neededItemsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleModeChange("supermarket")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm transition-all cursor-pointer select-none",
              mode === "supermarket"
                ? "bg-card text-foreground shadow-sm border border-border/70 font-semibold duration-200"
                : "text-muted-foreground hover:text-foreground font-medium transition-colors"
            )}
          >
            <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{t.kitchen.modes.supermarketRun}</span>
            <span className="hidden sm:inline text-[11px] opacity-70 font-normal">
              {t.kitchen.modes.storeChecklist}
            </span>
            {(activeCartCount > 0 || isCartBadgePulsing) && (
              <span
                className={cn(
                  "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full leading-none transition-all duration-300 transform",
                  isCartBadgePulsing
                    ? "scale-125 bg-primary text-primary-foreground shadow-md ring-2 ring-primary/40 animate-pulse duration-150"
                    : mode === "supermarket"
                      ? "bg-primary text-primary-foreground font-extrabold"
                      : "bg-primary/15 text-primary border border-primary/20"
                )}
              >
                {activeCartCount}
              </span>
            )}
          </button>
        </div>

        {/* MODE 1: KITCHEN BOARD */}
        {mode === "board" && (
          <main className="space-y-6 sm:space-y-8 animate-in fade-in-50 duration-200">
            {/* HIGH-END INPUT AFFORDANCE (THE COMMAND BAR) */}
            <form onSubmit={handleCommandSubmit} className="relative w-full">
              <div className="relative w-full h-12 sm:h-13 bg-card border border-border/70 rounded-2xl flex items-center px-3.5 sm:px-4 focus-within:border-accent-brand/40 focus-within:ring-2 focus-within:ring-accent-brand/10 shadow-sm transition-all">
                <Plus className="w-4 h-4 text-muted-foreground/50 shrink-0 mr-2.5 sm:mr-3" />
                <input
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder={t.kitchen.commandBar.placeholder}
                  disabled={isSubmittingCommand}
                  className="w-full bg-transparent border-none text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0 min-w-0 pr-2 sm:pr-3"
                />

                {/* Right Actions: Micro segmented pill for [ One-off | Staple ] + Minimalist circular Enter button */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <div className="flex items-center gap-0.5 bg-secondary/60 border border-border/70 p-0.5 rounded-lg shrink-0">
                    <button
                      type="button"
                      onClick={() => setCommandType("one-off")}
                      className={cn(
                        "px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-semibold transition-all cursor-pointer select-none",
                        commandType === "one-off"
                          ? "bg-background text-foreground shadow-2xs border border-border/60"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t.kitchen.commandBar.oneOff}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommandType("staple")}
                      className={cn(
                        "px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-semibold transition-all cursor-pointer select-none",
                        commandType === "staple"
                          ? "bg-accent-brand/15 text-accent-brand border border-accent-brand/25 shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t.kitchen.commandBar.staple}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingCommand || !commandInput.trim()}
                    className={cn(
                      "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer",
                      commandInput.trim()
                        ? "bg-accent-brand text-accent-foreground shadow-md shadow-accent-brand/20 active:scale-95"
                        : "bg-muted text-muted-foreground/30 cursor-not-allowed border border-border/50"
                    )}
                    title={t.kitchen.commandBar.add}
                    aria-label={t.kitchen.commandBar.add}
                  >
                    {isSubmittingCommand ? (
                      <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* RESTING STATE OR URGENT RESTOCK BANNER */}
            {neededItemsCount > 0 ? (
              <div className="rounded-2xl bg-amber-500/[0.08] border border-amber-500/25 p-4 sm:py-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-500/20 border border-amber-500/35 flex items-center justify-center text-amber-500 shrink-0">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight truncate">
                        {neededItemsCount} {neededItemsCount === 1 ? t.kitchen.status.itemsReadyRestockSingular : t.kitchen.status.itemsReadyRestock}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {t.kitchen.status.inventoryUpdated}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="default"
                  onClick={() => handleModeChange("supermarket")}
                  className="rounded-xl h-10 px-5 bg-accent-brand text-accent-foreground font-bold text-xs sm:text-sm shrink-0 flex items-center gap-2 cursor-pointer shadow-md hover:bg-accent-brand/90 hover:shadow-lg transition-all"
                >
                  <span>{t.kitchen.status.readyToBuy}</span>
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/15 py-6 px-8 text-center flex flex-col items-center justify-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                    {t.kitchen.status.fullyStocked}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                    {t.kitchen.status.allStockedDesc}
                  </p>
                </div>
              </div>
            )}

            {/* ACTIVE SHOPPING QUEUE (Auto-hidden when empty) */}
            <ShoppingListSection
              kitchenId={initialKitchen.id}
              items={localShoppingListItems}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              spaceType={initialKitchen.space_type}
              hideInput={true}
              onAddToCart={handleItemMovedToCart}
              onItemMovedToCart={handleItemMovedToCart}
              onItemReturnedToList={handleItemReturnedToList}
              onItemRemoved={handleItemRemoved}
              onItemAdded={(item) => setLocalShoppingListItems((prev) => [item, ...prev])}
              onViewCart={() => handleModeChange("supermarket")}
            />

            {/* HOUSEHOLD STAPLES BENTO GRID */}
            <PantrySection
              kitchenId={initialKitchen.id}
              items={localPantryItems}
              shoppingListItems={localShoppingListItems}
              currentUserId={currentUserId}
              hideInput={true}
              onItemEmptied={handlePantryItemEmptied}
              onItemRestocked={handlePantryItemRestocked}
              onItemDeleted={(itemId) =>
                setLocalPantryItems((prev) => prev.filter((p) => p.id !== itemId))
              }
            />

            {/* BALANCES & REFUNDS GLASS BANNER */}
            <footer>
              <div className="w-full rounded-2xl border border-border/70 bg-card/60 backdrop-blur-xl p-4 flex items-center justify-between gap-4 mt-6 hover:border-border transition-all shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "h-9 w-9 rounded-xl border flex items-center justify-center shrink-0",
                      pendingRefundsCount > 0
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                        : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    )}
                  >
                    {pendingRefundsCount > 0 ? (
                      <Receipt className="w-4 h-4" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-snug">
                      {pendingRefundsCount > 0
                        ? `${pendingRefundsCount} ${pendingRefundsCount === 1 ? t.kitchen.ledger.pendingExpenseSingular : t.kitchen.ledger.pendingExpenses}`
                        : t.kitchen.ledger.balancesUpToDate}
                    </p>
                    <p className="text-xs text-muted-foreground font-normal leading-snug">
                      {pendingRefundsCount > 0
                        ? `${myCheckouts.length} ${t.kitchen.ledger.loggedReceipts}`
                        : t.kitchen.ledger.balancesUpToDateDesc}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsLedgerOpen(true)}
                  className="h-8 px-3.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium border border-border/60 flex items-center gap-1.5 transition-all active:scale-95 shrink-0 cursor-pointer whitespace-nowrap"
                >
                  <span>{t.kitchen.ledger.settle}</span>
                </button>
              </div>
            </footer>
          </main>
        )}

        {/* MODE 2: SUPERMARKET RUN (Active Cart Section) */}
        {mode === "supermarket" && (
          <main className="space-y-4 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleModeChange("board")}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer py-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t.kitchen.modes.backToBoard}</span>
              </button>
            </div>

            <ActiveCartSection
              kitchenId={initialKitchen.id}
              items={localShoppingListItems}
              pantryItems={localPantryItems}
              currentUserId={currentUserId}
              spaceType={initialKitchen.space_type}
              onSwitchTab={(tab) => {
                if (tab === "kitchen") handleModeChange("board");
              }}
              onItemReturnedToList={handleItemReturnedToList}
              onItemMovedToCart={handleItemMovedToCart}
              onItemPurchasedToggle={handleItemPurchasedToggle}
              onQuickAddStaple={handleQuickAddStapleToCart}
              onAllItemsMovedToCart={handleAllItemsMovedToCart}
            />
          </main>
        )}
      </div>

      {/* OVERLAY 1: Roommates Slide-Over / Modal */}
      <RoommatesModal
        isOpen={isRoommatesOpen}
        onOpenChange={setIsRoommatesOpen}
        kitchenId={initialKitchen.id}
        kitchenName={initialKitchen.name}
        members={localMembers}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        spaceType={initialKitchen.space_type}
        baseUrl={baseUrl}
        onMemberAdded={(m) => setLocalMembers((prev) => [m, ...prev])}
        onMemberRemoved={(id) => setLocalMembers((prev) => prev.filter((m) => m.id !== id))}
      />

      {/* OVERLAY 2: Expense & Refunds Ledger Modal */}
      <ExpenseLedgerModal
        isOpen={isLedgerOpen}
        onOpenChange={setIsLedgerOpen}
        kitchenId={initialKitchen.id}
        isAdmin={isAdmin}
        spaceType={initialKitchen.space_type}
        members={localMembers}
        checkouts={myCheckouts}
      />

      {/* OVERLAY 3: Space Pulse & Analytics Modal */}
      <SpacePulseModal
        isOpen={isStatsFlyoutOpen}
        onOpenChange={setIsStatsFlyoutOpen}
        kitchenId={initialKitchen.id}
        kitchenName={initialKitchen.name}
        currentUserId={currentUserId}
        initialStats={initialPulseStats}
        pantryItems={localPantryItems}
        myCheckouts={myCheckouts}
        onStartShoppingRun={() => {
          setIsStatsFlyoutOpen(false);
          handleModeChange("supermarket");
        }}
      />

      {/* OVERLAY 4: Onboarding Tour */}
      <KitchenTourModal isOpen={isTourOpen} onOpenChange={setIsTourOpen} onComplete={handleTourComplete} />
    </div>
  );
}

export default KitchenSpaceView;
