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
} from "@/app/actions/pantry";
import { getPendingRefundsCountAction } from "@/app/actions/checkout";
import { PantrySection } from "@/components/PantrySection";
import { ShoppingListSection } from "@/components/ShoppingListSection";
import { ActiveCartSection } from "@/components/ActiveCartSection";
import { RoommatesView } from "@/components/kitchen/RoommatesView";
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
  ExternalLink,
  Plus,
  CheckCircle2,
  CreditCard,
  ArrowRight,
  Home,
  Heart,
  Briefcase,
  Layers,
  Loader2,
  Sparkles,
  Receipt,
  RotateCcw,
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
  isAdmin: propIsAdmin,
  baseUrl,
  defaultTab = "kitchen",
  initialTab,
  myCheckouts = [],
}: KitchenSpaceViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

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

  // Universal Command Bar State
  const [commandInput, setCommandInput] = useState("");
  const [commandType, setCommandType] = useState<"one-off" | "staple">("one-off");
  const [isSubmittingCommand, setIsSubmittingCommand] = useState(false);

  // Overlays State
  const [isRoommatesOpen, setIsRoommatesOpen] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [pendingRefundsCount, setPendingRefundsCount] = useState(0);
  const [, startTransition] = useTransition();

  const terminology = getSpaceTerminology(initialKitchen.space_type);
  const activeMembers = localMembers.filter((m) => m.joined_at !== null);

  const neededItemsCount = localShoppingListItems.filter(
    (i) => !i.is_purchased && !i.is_guest_staged
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
          toast.success(`Tracked "${name}" in household staples`);
        } else {
          const newItem = await addCustomShoppingItemAction(initialKitchen.id, name);
          setLocalShoppingListItems((prev) => [newItem, ...prev]);
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
        is_guest_staged: false,
        checkout_id: null,
        created_at: new Date(),
      };
      return [newItem, ...prev];
    });
  };

  const handlePantryItemRestocked = (itemId: string) => {
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
          ? { ...i, is_purchased: true, purchased_by: currentUserId, is_guest_staged: false }
          : i
      )
    );
    if (item.pantry_item_id) {
      setLocalPantryItems((prev) =>
        prev.map((p) => (p.id === item.pantry_item_id ? { ...p, is_out_of_stock: false } : p))
      );
    }
  };

  const handleItemReturnedToList = (item: ShoppingListItem) => {
    setLocalShoppingListItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, is_purchased: false, purchased_by: null, is_guest_staged: false }
          : i
      )
    );
    if (item.pantry_item_id) {
      setLocalPantryItems((prev) =>
        prev.map((p) => (p.id === item.pantry_item_id ? { ...p, is_out_of_stock: true } : p))
      );
    }
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
    <div className="min-h-[calc(100vh-4rem)] w-full flex flex-col bg-background text-foreground selection:bg-primary/20">
      <GuestCartHandoverListener kitchenId={initialKitchen.id} />

      {/* Main Grounded Hub Container */}
      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6 flex-1">
        {/* 1. Header Context: Space Name + Household Tag + Roommate Avatars Stack */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white truncate">
                {initialKitchen.name}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-secondary text-muted-foreground border border-border/80">
                {getSpaceIcon(initialKitchen.space_type)}
                <span>{getSpaceLabel(initialKitchen.space_type)}</span>
              </span>
              {isAdmin && (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Admin
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Shared household operating board · {activeMembers.length} active {activeMembers.length === 1 ? "roommate" : "roommates"}
            </p>
          </div>

          {/* Right Header Actions: Avatar Stack (Opens Drawer), Guest Link, Settings */}
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
            {/* Clickable Roommates Avatar Stack */}
            <button
              type="button"
              onClick={() => setIsRoommatesOpen(true)}
              className="flex items-center -space-x-2 py-1 px-2 rounded-2xl hover:bg-white/[0.05] border border-white/[0.08] transition-all cursor-pointer shadow-sm group"
              title="Click to view roommates & invites"
              aria-label="View roommates and household invites"
            >
              <div className="flex items-center -space-x-2 overflow-hidden py-0.5">
                {activeMembers.slice(0, 3).map((m) => (
                  <div
                    key={m.id}
                    className="w-7 h-7 rounded-full bg-secondary text-foreground border-2 border-background flex items-center justify-center text-[10px] font-bold uppercase shadow-2xs group-hover:scale-105 transition-transform select-none"
                  >
                    {m.kitchen_display_name.slice(0, 2)}
                  </div>
                ))}
              </div>
              <span className="text-xs font-mono font-semibold text-muted-foreground group-hover:text-white pl-3 pr-1">
                {activeMembers.length}
              </span>
            </button>

            {/* Live Share / Guest Supermarket Link */}
            <CopyButton
              text={publicGuestUrl}
              label="Share"
              size="sm"
              variant="outline"
              className="h-9 px-3 text-xs font-semibold rounded-xl border border-white/[0.08] bg-card hover:bg-white/[0.06] text-white transition-all cursor-pointer"
            />

            <Button
              asChild
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-xl border border-white/[0.08] bg-card hover:bg-white/[0.06] text-muted-foreground hover:text-white shrink-0 transition-all cursor-pointer"
              title="Open public guest view"
              aria-label="Open public guest view in new tab"
            >
              <Link href={publicGuestUrl} target="_blank">
                <ExternalLink className="w-4 h-4" />
              </Link>
            </Button>

            {/* Kitchen Settings Button */}
            <Button
              asChild
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-xl border border-white/[0.08] bg-card hover:bg-white/[0.06] text-muted-foreground hover:text-white shrink-0 transition-all cursor-pointer"
              title="Space Settings"
              aria-label="Space Settings"
            >
              <Link href={`/kitchen/${initialKitchen.id}/settings`}>
                <Settings className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </header>

        {/* 2. Mode Switcher (Centered, Prominent Pill Dock) */}
        <div className="flex justify-center w-full pt-1">
          <div className="bg-[#121215] border border-white/[0.08] backdrop-blur-xl rounded-2xl p-1.5 inline-flex items-center gap-1.5 shadow-xl">
            <button
              type="button"
              onClick={() => handleModeChange("board")}
              className={cn(
                "flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer select-none",
                mode === "board"
                  ? "bg-white text-black shadow-md font-extrabold scale-[1.02]"
                  : "text-muted-foreground hover:text-white hover:bg-white/[0.05]"
              )}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Kitchen Board</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange("supermarket")}
              className={cn(
                "flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer select-none relative",
                mode === "supermarket"
                  ? "bg-primary text-primary-foreground shadow-md font-extrabold scale-[1.02]"
                  : "text-muted-foreground hover:text-white hover:bg-white/[0.05]"
              )}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Supermarket Run</span>
              {neededItemsCount > 0 && (
                <span
                  className={cn(
                    "text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full leading-tight",
                    mode === "supermarket"
                      ? "bg-primary-foreground text-primary"
                      : "bg-amber-500 text-black"
                  )}
                >
                  {neededItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* MODE 1: KITCHEN BOARD */}
        {mode === "board" && (
          <main className="space-y-6 animate-in fade-in-50 duration-200">
            {/* A. Universal Command Bar */}
            <form onSubmit={handleCommandSubmit} className="relative w-full">
              <div className="relative flex items-center gap-2 rounded-2xl bg-[#121215] border border-white/[0.12] p-2 pl-4 shadow-xl focus-within:border-primary/60 transition-all">
                <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder="Need something? Type item (e.g. Oat Milk, Lemons, Coffee)..."
                  disabled={isSubmittingCommand}
                  className="flex-1 bg-transparent border-0 text-white placeholder:text-muted-foreground/70 text-sm focus:outline-none min-w-0"
                />

                {/* Tag Type Toggle inside Command Bar */}
                <div className="flex items-center gap-1 bg-black/40 border border-white/[0.08] p-1 rounded-xl shrink-0">
                  <button
                    type="button"
                    onClick={() => setCommandType("one-off")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer select-none",
                      commandType === "one-off"
                        ? "bg-white/[0.12] text-white shadow-xs"
                        : "text-muted-foreground hover:text-white"
                    )}
                  >
                    One-off
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommandType("staple")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer select-none",
                      commandType === "staple"
                        ? "bg-primary/20 text-primary border border-primary/30 shadow-xs"
                        : "text-muted-foreground hover:text-white"
                    )}
                  >
                    Staple
                  </button>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmittingCommand || !commandInput.trim()}
                  size="sm"
                  className="rounded-xl px-3.5 h-8 font-semibold shrink-0 cursor-pointer"
                >
                  {isSubmittingCommand ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Add ↵</span>
                  )}
                </Button>
              </div>
            </form>

            {/* B. The Restock Banner (Hero Alert) */}
            {neededItemsCount > 0 ? (
              <div className="relative overflow-hidden rounded-3xl bg-[#141418] border border-amber-500/30 p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
                    <ShoppingCart className="w-6 h-6" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                      </span>
                      <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                        {neededItemsCount} {neededItemsCount === 1 ? "item" : "items"} needed for next run
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      Active restock queue ready for the supermarket run.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => handleModeChange("supermarket")}
                  className="rounded-2xl px-5 py-2.5 bg-primary text-primary-foreground font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all text-sm shrink-0 flex items-center gap-2 cursor-pointer self-start sm:self-auto"
                >
                  <span>Start Shopping Run →</span>
                </Button>
              </div>
            ) : (
              <div className="rounded-3xl bg-emerald-500/[0.06] border border-emerald-500/20 p-5 sm:p-6 flex items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Everything in stock
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Pantry primed. Tap any staple card below when running low.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* C. The Active Shopping Queue */}
            <ShoppingListSection
              kitchenId={initialKitchen.id}
              items={localShoppingListItems}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              spaceType={initialKitchen.space_type}
              hideInput={true}
              onItemMovedToCart={handleItemMovedToCart}
              onItemReturnedToList={handleItemReturnedToList}
              onItemRemoved={handleItemRemoved}
              onViewCart={() => handleModeChange("supermarket")}
            />

            {/* D. The Household Staples Catalog (Interactive Bento Grid) */}
            <PantrySection
              kitchenId={initialKitchen.id}
              items={localPantryItems}
              hideInput={true}
              onItemEmptied={handlePantryItemEmptied}
              onItemRestocked={handlePantryItemRestocked}
              onItemDeleted={(itemId) =>
                setLocalPantryItems((prev) => prev.filter((p) => p.id !== itemId))
              }
            />

            {/* 3. Balances & Refunds Minimalist Docked Summary Bar */}
            <footer className="pt-2">
              <div className="bg-[#121215] border border-white/[0.08] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-muted-foreground shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-white truncate">
                      {pendingRefundsCount > 0
                        ? `${pendingRefundsCount} pending ${pendingRefundsCount === 1 ? "expense" : "expenses"} to settle`
                        : "Household balances up to date"}
                    </p>
                    <p className="text-[11px] font-mono text-muted-foreground">
                      {myCheckouts.length} logged receipts in space history
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLedgerOpen(true)}
                  className="h-8 px-3 rounded-xl text-xs font-semibold border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-white shrink-0 cursor-pointer"
                >
                  <span>Settle / Details →</span>
                </Button>
              </div>
            </footer>
          </main>
        )}

        {/* MODE 2: SUPERMARKET RUN (Active Cart Section) */}
        {mode === "supermarket" && (
          <main className="space-y-6 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleModeChange("board")}
                className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-white transition-colors cursor-pointer py-1"
              >
                <span>← Back to Kitchen Board</span>
              </button>
            </div>

            <ActiveCartSection
              kitchenId={initialKitchen.id}
              items={localShoppingListItems}
              currentUserId={currentUserId}
              spaceType={initialKitchen.space_type}
              onSwitchTab={(tab) => {
                if (tab === "kitchen") handleModeChange("board");
              }}
            />
          </main>
        )}
      </div>

      {/* OVERLAY 1: Roommates Slide-Over / Modal */}
      <Dialog open={isRoommatesOpen} onOpenChange={setIsRoommatesOpen}>
        <DialogContent className="max-w-md w-full bg-[#121215] border-white/[0.1] p-6 rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <span>{initialKitchen.name} Roommates</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Manage household members and active invite codes.
            </DialogDescription>
          </DialogHeader>

          <div className="pt-2">
            <RoommatesView
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
          </div>
        </DialogContent>
      </Dialog>

      {/* OVERLAY 2: Expense & Refunds Ledger Modal */}
      <Dialog open={isLedgerOpen} onOpenChange={setIsLedgerOpen}>
        <DialogContent className="max-w-2xl w-full bg-[#121215] border-white/[0.1] p-6 rounded-3xl shadow-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              <span>Expense &amp; Refund Ledger</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Shared household balances, receipt checkouts, and refund claims.
            </DialogDescription>
          </DialogHeader>

          <div className="pt-4 space-y-6">
            {isAdmin && (
              <AdminRefundsSection
                kitchenId={initialKitchen.id}
                spaceType={initialKitchen.space_type}
                members={localMembers}
              />
            )}

            <MyPurchasesSection
              kitchenId={initialKitchen.id}
              checkouts={myCheckouts}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default KitchenSpaceView;
