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
  KitchenSpaceType,
} from "@/types";
import { getSpaceTerminology } from "@/lib/spaceTerminology";
import {
  addCustomShoppingItemAction,
  quickAddStapleToCartAction,
  moveAllNeededToCartAction,
} from "@/app/actions/pantry";
import { useTranslation } from "@/lib/i18n";
import { PantrySection } from "@/components/PantrySection";
import { ActiveCartSection } from "@/components/ActiveCartSection";
import { RoommatesView } from "@/components/kitchen/RoommatesView";
import { RoommatesModal } from "@/components/kitchen/RoommatesModal";
import { ExpenseLedgerModal } from "@/components/kitchen/ExpenseLedgerModal";
import { SpacePulseModal } from "@/components/kitchen/SpacePulseModal";
import { markTourCompletedAction } from "@/app/actions/user";
import { KitchenTourModal } from "@/components/kitchen/KitchenTourModal";
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
  CheckCircle2,
  ArrowLeft,
  Home,
  Heart,
  Briefcase,
  Layers,
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
  /** Kitchen-wide pending checkouts (not settled, not declined). */
  pendingKitchenCheckoutsCount?: number;
  /** Kitchen-wide checkout history size, excluding declined checkouts. */
  totalKitchenCheckoutsCount?: number;
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
  pendingKitchenCheckoutsCount = 0,
  totalKitchenCheckoutsCount = 0,
}: KitchenSpaceViewProps) {
  const { t, locale } = useTranslation();
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
  const [localPendingKitchenCount, setLocalPendingKitchenCount] = useState(
    pendingKitchenCheckoutsCount
  );
  const [localTotalKitchenCount, setLocalTotalKitchenCount] = useState(
    totalKitchenCheckoutsCount
  );

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

  useEffect(() => {
    setLocalPendingKitchenCount(pendingKitchenCheckoutsCount);
  }, [pendingKitchenCheckoutsCount]);

  useEffect(() => {
    setLocalTotalKitchenCount(totalKitchenCheckoutsCount);
  }, [totalKitchenCheckoutsCount]);

  // Universal Command Bar State

  // Overlays State
  const [isRoommatesOpen, setIsRoommatesOpen] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [isStatsFlyoutOpen, setIsStatsFlyoutOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  // Missing user prop => assume completed so we never nag by accident
  const [hasCompletedTour, setHasCompletedTour] = useState(user?.has_completed_tour ?? true);
  const [isCartBadgePulsing, setIsCartBadgePulsing] = useState(false);
  const [, startTransition] = useTransition();

  const terminology = getSpaceTerminology(initialKitchen.space_type);
  const activeMembers = localMembers.filter(
    (m) => m.user_id !== null && m.joined_at !== null && m.joined_at !== undefined
  );
  const roommatesCount = activeMembers.length;

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

  const isStaplesAdminOnlyNonAdmin =
    initialKitchen.staple_permission === "admin_only" && !isAdmin;

  // One-time (non-essential) items are added from the Shopping List in the Shopping tab.
  // Resolves true on success so the input there knows to clear itself.
  const handleAddOneOff = async (name: string): Promise<boolean> => {
    try {
      const newItem = await addCustomShoppingItemAction(initialKitchen.id, name);
      setLocalShoppingListItems((prev) => [newItem, ...prev]);
      router.refresh();
      toast.success(`Added "${name}" to the shopping list`);
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to add item.");
      return false;
    }
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
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6 flex-1">
        {/* 1. NATIVE HEADER & SPACE IDENTITY */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none pb-2 border-b border-border/60">
          {/* Left: Space title + household badge */}
          <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
              {initialKitchen.name}
            </h1>
            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 shrink-0">
              {getSpaceLabel(initialKitchen.space_type)}
            </span>
            {isAdmin && (
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-0.5 rounded-md border border-border/40 shrink-0">
                {t.kitchen.header.admin}
              </span>
            )}
          </div>

          {/* Right: Roommate avatar cluster + Stats button + Share button + Settings icon button */}
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            {/* Roommate Avatar Cluster */}
            <button
              type="button"
              onClick={() => setIsRoommatesOpen(true)}
              className="flex items-center h-8 px-2.5 rounded-lg hover:bg-secondary/80 border border-border/60 bg-secondary/40 transition-colors cursor-pointer group"
              title={t.kitchen.roommates.title}
              aria-label={t.kitchen.roommates.title}
            >
              <div className="flex items-center overflow-hidden py-0.5">
                {activeMembers.slice(0, 3).map((m) => (
                  <div
                    key={m.id}
                    className="inline-flex items-center justify-center h-5 w-5 rounded-full text-[9px] font-semibold ring-1 ring-border bg-secondary text-foreground -ml-1.5 first:ml-0 uppercase select-none"
                  >
                    {m.kitchen_display_name.slice(0, 2)}
                  </div>
                ))}
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground pl-1.5 tabular-nums">
                {roommatesCount} {roommatesCount === 1 ? t.kitchen.header.roommateSingular : t.kitchen.header.roommatesCount}
              </span>
            </button>

            {/* Tutorial / Tour Button */}
            <button
              type="button"
              onClick={() => setIsTourOpen(true)}
              className="h-8 w-8 rounded-lg border border-border/60 bg-secondary/30 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              title={t.tour.triggerTooltip}
              aria-label={t.tour.triggerTooltip}
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>

            {/* Pulse / Stats Flyout Button */}
            <button
              type="button"
              onClick={() => setIsStatsFlyoutOpen(true)}
              className="h-8 w-8 rounded-lg border border-border/60 bg-secondary/30 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              title={t.kitchen.pulse.title}
              aria-label={t.kitchen.pulse.title}
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>

            {/* Share icon button */}
            <button
              type="button"
              onClick={handleShare}
              className="h-8 w-8 rounded-lg border border-border/60 bg-secondary/30 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              title={t.dashboard.guestLink}
              aria-label={t.dashboard.guestLink}
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            {/* Settings icon button */}
            <Link
              href={`/kitchen/${initialKitchen.id}/settings`}
              className="h-8 w-8 rounded-lg border border-border/60 bg-secondary/30 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              title={t.dashboard.settings}
              aria-label={t.dashboard.settings}
            >
              <Settings className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* 2. SLEEK SEGMENTED SLIDER (KITCHEN BOARD VS SUPERMARKET RUN) */}
        <div className="h-10 w-full bg-secondary/50 p-1 rounded-xl border border-border/60 flex items-center">
          <button
            type="button"
            onClick={() => handleModeChange("board")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs sm:text-sm transition-all cursor-pointer select-none",
              mode === "board"
                ? "bg-card text-foreground shadow-xs border border-border/70 font-semibold"
                : "text-muted-foreground hover:text-foreground font-medium transition-colors"
            )}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>{t.kitchen.modes.kitchenBoard}</span>
            {neededItemsCount > 0 && (
              <span
                className={cn(
                  "text-[10px] font-mono font-medium px-1.5 py-0.5 rounded leading-none tabular-nums",
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
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs sm:text-sm transition-all cursor-pointer select-none",
              mode === "supermarket"
                ? "bg-card text-foreground shadow-xs border border-border/70 font-semibold"
                : "text-muted-foreground hover:text-foreground font-medium transition-colors"
            )}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>{t.kitchen.modes.supermarketRun}</span>
            {(activeCartCount > 0 || isCartBadgePulsing) && (
              <span
                className={cn(
                  "text-[10px] font-mono font-medium px-1.5 py-0.5 rounded leading-none transition-colors tabular-nums",
                  mode === "supermarket"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-secondary text-muted-foreground border border-border/70"
                )}
              >
                {activeCartCount}
              </span>
            )}
          </button>
        </div>

        {/* MODE 1: KITCHEN BOARD */}
        {mode === "board" && (
          <main className="space-y-6 animate-in fade-in-50 duration-150">
            {/* HOUSEHOLD STAPLES BENTO GRID */}
            <PantrySection
              kitchenId={initialKitchen.id}
              items={localPantryItems}
              shoppingListItems={localShoppingListItems}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              hideInput={true}
              canAdd={!isStaplesAdminOnlyNonAdmin}
              onItemAdded={(item) =>
                setLocalPantryItems((prev) =>
                  [...prev, item].sort((a, b) => a.name.localeCompare(b.name))
                )
              }
              onItemEmptied={handlePantryItemEmptied}
              onItemRestocked={handlePantryItemRestocked}
              onItemDeleted={(itemId) =>
                setLocalPantryItems((prev) => prev.filter((p) => p.id !== itemId))
              }
              onItemUpdated={(updated) =>
                setLocalPantryItems((prev) =>
                  prev.map((p) => (p.id === updated.id ? updated : p))
                )
              }
            />

            {/* ADMIN-ONLY SETTLEMENTS BANNER */}
            {isAdmin && (
              <footer>
                <div className="w-full rounded-xl border border-border/70 bg-card p-4 flex items-center justify-between gap-4 mt-6 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "h-8 w-8 rounded-lg border flex items-center justify-center shrink-0",
                        localPendingKitchenCount > 0
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                          : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                      )}
                    >
                      {localPendingKitchenCount > 0 ? (
                        <Receipt className="w-4 h-4" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-snug">
                        {localPendingKitchenCount > 0
                          ? `${localPendingKitchenCount} ${localPendingKitchenCount === 1 ? t.kitchen.ledger.pendingExpenseSingular : t.kitchen.ledger.pendingExpenses}`
                          : t.kitchen.ledger.balancesUpToDate}
                      </p>
                      <p className="text-xs text-muted-foreground font-normal leading-snug">
                        {localPendingKitchenCount > 0
                          ? `${localTotalKitchenCount} ${t.kitchen.ledger.loggedReceipts}`
                          : t.kitchen.ledger.balancesUpToDateDesc}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsLedgerOpen(true)}
                    className="h-8 px-3 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium border border-border/60 flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer whitespace-nowrap"
                  >
                    <span>{t.kitchen.ledger.settle}</span>
                  </button>
                </div>
              </footer>
            )}
          </main>
        )}

        {/* MODE 2: SUPERMARKET RUN (Active Cart Section) */}
        {mode === "supermarket" && (
          <main className="space-y-4 animate-in fade-in-50 duration-150">
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
              onQuickAddStaple={handleQuickAddStapleToCart}
              onAllItemsMovedToCart={handleAllItemsMovedToCart}
              onItemRemoved={handleItemRemoved}
              onAddOneOff={handleAddOneOff}
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
        creatorId={initialKitchen.creator_id}
        baseUrl={baseUrl}
        onMemberAdded={(m) => setLocalMembers((prev) => [m, ...prev])}
        onMemberRemoved={(id) => setLocalMembers((prev) => prev.filter((m) => m.id !== id))}
        onRoleChanged={(id, newRole) =>
          setLocalMembers((prev) =>
            prev.map((m) => (m.id === id ? { ...m, role: newRole } : m))
          )
        }
      />

      {/* OVERLAY 2: Admin-only Settlements Modal */}
      {isAdmin && (
        <ExpenseLedgerModal
          isOpen={isLedgerOpen}
          onOpenChange={setIsLedgerOpen}
          kitchenId={initialKitchen.id}
          spaceType={initialKitchen.space_type}
          members={localMembers}
          onCheckoutUpdated={(updated) => {
            // Keep the kitchen-wide banner optimistic until the refreshed
            // server counts arrive. Only pending checkouts can be settled or
            // declined, so either action removes one pending item.
            if (updated.is_refunded || updated.is_declined) {
              setLocalPendingKitchenCount((prev) => Math.max(0, prev - 1));
              if (updated.is_declined) {
                setLocalTotalKitchenCount((prev) => Math.max(0, prev - 1));
              }
            }
          }}
        />
      )}

      {/* OVERLAY 3: Space Pulse & Analytics Modal */}
      <SpacePulseModal
        isOpen={isStatsFlyoutOpen}
        onOpenChange={setIsStatsFlyoutOpen}
        kitchenId={initialKitchen.id}
        kitchenName={initialKitchen.name}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        initialStats={initialPulseStats}
        pantryItems={localPantryItems}
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
