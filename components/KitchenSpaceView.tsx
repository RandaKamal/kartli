"use client";

import { useState, useTransition, useEffect, Suspense } from "react";
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
import { updateKitchenSettings, regeneratePublicViewToken, addMemberAction, leaveKitchenAction, getKitchenMembersAction } from "@/app/actions/kitchen";
import { getPendingRefundsCountAction } from "@/app/actions/checkout";
import { PantrySection } from "@/components/PantrySection";
import { ShoppingListSection } from "@/components/ShoppingListSection";
import { ShoppingCart } from "@/components/ShoppingCart";
import { CopyButton } from "@/components/CopyButton";
import { AdminActiveMembersList } from "@/components/AdminActiveMembersList";
import { AdminPendingInvitesList } from "@/components/AdminPendingInvitesList";
import { MyPurchasesSection, MyPurchasesSkeleton } from "@/components/MyPurchasesSection";
import { AdminRefundsSection, AdminRefundsSkeleton } from "@/components/AdminRefundsSection";
import { ActiveCartSection } from "@/components/ActiveCartSection";
import { GuestCartHandoverListener } from "@/components/GuestCartHandoverListener";
import { KitchenPulse } from "@/components/kitchen/KitchenPulse";
import type { KitchenPulseStats } from "@/lib/actions/stats";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
  ShoppingCart as CartIcon,
  ExternalLink,
  Share2,
  Users,
  Mail,
  UserPlus,
  Shield,
  Settings,
  Home,
  Heart,
  Briefcase,
  Building2,
  RefreshCw,
  Loader2,
  AlertTriangle,
  LogOut,
  UtensilsCrossed,
  Receipt,
  Activity,
} from "lucide-react";
import { capitalize } from "@/lib/utils";
import { toast } from "sonner";

export function MembersSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
      <div className="lg:col-span-2 space-y-6">
        <Card className="border border-border bg-card rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-36 rounded-md" />
            <Skeleton className="h-5 w-6 rounded-full" />
          </div>
          <div className="space-y-3 pt-2">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </Card>
        <Card className="border border-border bg-card rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-36 rounded-md" />
            <Skeleton className="h-5 w-6 rounded-full" />
          </div>
          <div className="space-y-3 pt-2">
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </Card>
      </div>
      <div>
        <Card className="border border-border bg-card rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
          <Skeleton className="h-6 w-32 rounded-md" />
          <Skeleton className="h-4 w-48 rounded-md" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </Card>
      </div>
    </div>
  );
}

interface KitchenSpaceViewProps {
  kitchen: Kitchen;
  membership: KitchenMember;
  members?: KitchenMemberWithUser[];
  pantryItems: PantryItem[];
  shoppingListItems: ShoppingListItem[];
  myCheckouts?: CheckoutWithDetails[];
  adminCheckouts?: CheckoutWithDetails[];
  initialPulseStats?: KitchenPulseStats;
  currentUserId: string;
  preferredCurrency?: string;
  userPreferredCurrency?: string;
  baseUrl: string;
  initialTab?: string;
}

export function KitchenSpaceView({
  kitchen: initialKitchen,
  membership,
  members: initialMembers,
  pantryItems,
  shoppingListItems,
  myCheckouts,
  adminCheckouts,
  initialPulseStats,
  currentUserId,
  preferredCurrency,
  userPreferredCurrency = "EUR",
  baseUrl,
  initialTab = "kitchen",
}: KitchenSpaceViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [kitchenName, setKitchenName] = useState(initialKitchen.name);
  const [spaceType, setSpaceType] = useState<KitchenSpaceType>(initialKitchen.space_type || "FLATSHARE");
  const [publicViewToken, setPublicViewToken] = useState(initialKitchen.public_view_token);

  // Synchronized optimistic state for pantry and shopping list items
  const [localPantryItems, setLocalPantryItems] = useState<PantryItem[]>(pantryItems);
  const [localShoppingListItems, setLocalShoppingListItems] = useState<ShoppingListItem[]>(shoppingListItems);

  // Lazy tab state for members and checkouts
  const [members, setMembers] = useState<KitchenMemberWithUser[]>(initialMembers || []);
  const [isMembersLoading, setIsMembersLoading] = useState(initialMembers === undefined);
  const [pendingRefundsCount, setPendingRefundsCount] = useState<number>(() => {
    if (adminCheckouts) {
      return adminCheckouts.filter((c) => !c.is_refunded).length;
    }
    return 0;
  });

  // Settings form drafts
  const [draftName, setDraftName] = useState(initialKitchen.name);
  const [draftSpaceType, setDraftSpaceType] = useState<KitchenSpaceType>(initialKitchen.space_type || "FLATSHARE");

  // Invite state
  const [inviteMemberName, setInviteMemberName] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  // Async transitions
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [, startTransition] = useTransition();

  const terminology = getSpaceTerminology(spaceType);
  const isAdmin = membership.role === "ADMIN";
  const validTabs = isAdmin
    ? ["kitchen", "pulse", "cart", "members", "refunds", "settings"]
    : ["kitchen", "pulse", "cart", "members", "settings"];

  // Tab state syncing
  const urlTab = searchParams.get("tab");
  const defaultTab = urlTab && validTabs.includes(urlTab)
    ? urlTab
    : (validTabs.includes(initialTab) ? initialTab : "kitchen");
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    if (urlTab && validTabs.includes(urlTab)) {
      setActiveTab(urlTab);
    } else if (urlTab && !validTabs.includes(urlTab)) {
      setActiveTab("kitchen");
    }
  }, [urlTab, validTabs]);

  useEffect(() => {
    setKitchenName(initialKitchen.name);
    setDraftName(initialKitchen.name);
    setSpaceType(initialKitchen.space_type || "FLATSHARE");
    setDraftSpaceType(initialKitchen.space_type || "FLATSHARE");
    setPublicViewToken(initialKitchen.public_view_token);
  }, [initialKitchen.name, initialKitchen.space_type, initialKitchen.public_view_token]);

  useEffect(() => {
    setLocalPantryItems(pantryItems);
  }, [pantryItems]);

  useEffect(() => {
    setLocalShoppingListItems(shoppingListItems);
  }, [shoppingListItems]);

  useEffect(() => {
    if (initialMembers !== undefined) {
      setMembers(initialMembers);
      setIsMembersLoading(false);
      return;
    }

    if (activeTab === "members" || activeTab === "refunds") {
      let isMounted = true;
      setIsMembersLoading(true);
      getKitchenMembersAction(initialKitchen.id)
        .then((data) => {
          if (isMounted) {
            setMembers(data);
            setIsMembersLoading(false);
          }
        })
        .catch((err) => {
          console.error("Failed to load members:", err);
          if (isMounted) setIsMembersLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [activeTab, initialKitchen.id, initialMembers]);

  useEffect(() => {
    if (isAdmin && !adminCheckouts) {
      getPendingRefundsCountAction(initialKitchen.id)
        .then((count) => setPendingRefundsCount(count))
        .catch(() => {});
    }
  }, [isAdmin, initialKitchen.id, adminCheckouts]);

  // Optimistic event handlers
  const handlePantryItemEmptied = (item: PantryItem) => {
    setLocalPantryItems((prev) =>
      prev.map((p) => (p.id === item.id ? { ...p, is_out_of_stock: true } : p))
    );
    setLocalShoppingListItems((prev) => {
      const exists = prev.some((i) => i.pantry_item_id === item.id && !i.is_purchased);
      if (exists) return prev;
      const newItem: ShoppingListItem = {
        id: `temp-${item.id}-${Date.now()}`,
        kitchen_id: initialKitchen.id,
        pantry_item_id: item.id,
        name: item.name,
        item_price: null,
        currency: "EUR",
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

  const activeMembers = members.filter((m) => m.joined_at !== null);
  const pendingInvites = members.filter((m) => m.joined_at === null && m.invite_token !== null);

  const myCartItems = localShoppingListItems.filter(
    (i) => i.is_purchased && !i.is_guest_staged && !i.checkout_id && i.purchased_by === currentUserId
  );
  const myCartCount = myCartItems.length;

  const origin = typeof window !== "undefined" ? window.location.origin : baseUrl;
  const publicGuestUrl = origin ? `${origin}/kitchen/view/${publicViewToken}` : `/kitchen/view/${publicViewToken}`;

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draftName.trim();
    if (!trimmed) {
      toast.error("Kitchen name cannot be empty.");
      return;
    }

    setIsSavingSettings(true);
    startTransition(async () => {
      try {
        const updated = await updateKitchenSettings({
          kitchenId: initialKitchen.id,
          name: trimmed,
          spaceType: draftSpaceType,
        });
        setKitchenName(updated.name);
        setSpaceType(updated.space_type);
        setDraftName(updated.name);
        setDraftSpaceType(updated.space_type);
        toast.success("Kitchen settings saved successfully!");
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to update kitchen settings.");
      } finally {
        setIsSavingSettings(false);
      }
    });
  };

  const handleRegenerateGuestLink = () => {
    setIsRegenerating(true);
    startTransition(async () => {
      try {
        const res = await regeneratePublicViewToken(initialKitchen.id);
        if (res.newToken) {
          setPublicViewToken(res.newToken);
          toast.success("Guest supermarket link regenerated! Previous link revoked.");
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to regenerate link.");
      } finally {
        setIsRegenerating(false);
      }
    });
  };

  const handleAdminInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const name = inviteMemberName.trim();
    if (!name) return;

    setIsInviting(true);
    startTransition(async () => {
      try {
        const res = await addMemberAction(initialKitchen.id, name);
        setInviteMemberName("");
        setMembers((prev) => [...prev, { ...res.member, username: null }]);
        toast.success(`Invite generated for ${res.member.kitchen_display_name}!`);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to generate invite.");
      } finally {
        setIsInviting(false);
      }
    });
  };

  const handleLeaveKitchen = () => {
    setIsLeaving(true);
    startTransition(async () => {
      try {
        await leaveKitchenAction(initialKitchen.id);
        toast.success(`You left ${kitchenName}`);
        router.push("/");
      } catch (err: any) {
        toast.error(err.message || "Failed to leave kitchen.");
        setIsLeaving(false);
        setIsLeaveModalOpen(false);
      }
    });
  };

  return (
    <div className="space-y-6 pb-28 sm:pb-8">
      <GuestCartHandoverListener kitchenId={initialKitchen.id} />

      {/* Sleek Single-Row Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
        {/* Left Side: Back Navigation & Kitchen Title */}
        <div className="flex items-center gap-3 min-w-0">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl border border-border/60 sm:border-white/10 bg-muted/40 sm:bg-zinc-900/60 hover:bg-muted sm:hover:bg-zinc-800 text-muted-foreground hover:text-foreground shrink-0 transition-colors"
            title="Back to Kitchens"
            aria-label="Back to Kitchens"
          >
            <Link href="/dashboard">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>

          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-white truncate">
              {kitchenName}
            </h1>
            {isAdmin && (
              <Badge
                variant="secondary"
                className="bg-zinc-800 text-zinc-300 border border-white/10 font-medium text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-md shrink-0"
              >
                Admin
              </Badge>
            )}
          </div>
        </div>

        {/* Right Side: Share Actions */}
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
          <CopyButton
            text={publicGuestUrl}
            label="Guest Link"
            size="sm"
            variant="outline"
            className="h-9 px-3 text-xs font-medium rounded-xl border-border/60 sm:border-white/10 bg-muted/40 sm:bg-zinc-900/60 hover:bg-muted sm:hover:bg-zinc-800 text-foreground sm:text-zinc-200 transition-colors"
          />
          <Button
            asChild
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-xl border border-border/60 sm:border-white/10 bg-muted/40 sm:bg-zinc-900/60 hover:bg-muted sm:hover:bg-zinc-800 text-muted-foreground hover:text-foreground shrink-0 transition-colors"
            title="Open guest view in new tab"
            aria-label="Open guest view in new tab"
          >
            <Link href={publicGuestUrl} target="_blank">
              <ExternalLink className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Responsive Navigation System */}
      <Tabs defaultValue={defaultTab} value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
        {/* Desktop Experience: Surface Pill Segmented Bar */}
        <div className="hidden sm:flex justify-center w-full">
          <TabsList className="bg-zinc-900/60 border border-white/5 rounded-2xl p-1.5 inline-flex items-center gap-1 h-auto shadow-sm">
            {/* Tab 1: Pantry / Kitchen */}
            <TabsTrigger
              value="kitchen"
              aria-label="Pantry"
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-xl transition-all cursor-pointer text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 data-[state=active]:bg-zinc-800 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-white/5"
            >
              <UtensilsCrossed className="w-4 h-4 shrink-0" />
              <span>Pantry</span>
            </TabsTrigger>

            {/* Tab 2: Pulse */}
            <TabsTrigger
              value="pulse"
              aria-label="Pulse"
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-xl transition-all cursor-pointer text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 data-[state=active]:bg-zinc-800 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-white/5"
            >
              <Activity className="w-4 h-4 shrink-0" />
              <span>Pulse</span>
            </TabsTrigger>

            {/* Tab 3: Cart */}
            <TabsTrigger
              value="cart"
              aria-label="Cart"
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-xl transition-all cursor-pointer text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 data-[state=active]:bg-zinc-800 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-white/5 relative"
            >
              <div className="relative flex items-center shrink-0">
                <CartIcon className="w-4 h-4" />
                {myCartCount > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute -top-0.5 -right-0.5 shadow-xs" />
                )}
              </div>
              <span>Cart</span>
              {myCartCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-full bg-zinc-700/80 text-zinc-200 border border-white/10">
                  {myCartCount}
                </span>
              )}
            </TabsTrigger>

            {/* Tab 4: Roommates / Flat */}
            <TabsTrigger
              value="members"
              aria-label={spaceType === "FLATSHARE" ? "Roommates" : terminology.memberLabelPlural}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-xl transition-all cursor-pointer text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 data-[state=active]:bg-zinc-800 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-white/5"
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>{spaceType === "FLATSHARE" ? "Roommates" : terminology.memberLabelPlural}</span>
            </TabsTrigger>

            {/* Tab 5: Refunds (Admin Only) */}
            {isAdmin && (
              <TabsTrigger
                value="refunds"
                aria-label="Refunds"
                className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-xl transition-all cursor-pointer text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 data-[state=active]:bg-zinc-800 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-white/5 relative"
              >
                <div className="relative flex items-center shrink-0">
                  <Receipt className="w-4 h-4" />
                  {pendingRefundsCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute -top-0.5 -right-0.5 shadow-xs animate-pulse" />
                  )}
                </div>
                <span>Refunds</span>
                {pendingRefundsCount > 0 && (
                  <span className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.2 text-[10px] font-mono font-medium rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span>{pendingRefundsCount}</span>
                  </span>
                )}
              </TabsTrigger>
            )}

            {/* Tab 6: Settings */}
            <TabsTrigger
              value="settings"
              aria-label="Settings"
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-xl transition-all cursor-pointer text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 data-[state=active]:bg-zinc-800 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-white/5"
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Mobile Experience: iOS-Style Fixed Bottom Dock */}
        <nav
          aria-label="Mobile Bottom Navigation"
          className="block sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom,0.75rem)] pt-1.5 px-1 shadow-[0_-8px_20px_rgba(0,0,0,0.4)]"
        >
          <div className={`grid ${isAdmin ? "grid-cols-6" : "grid-cols-5"} items-center max-w-md mx-auto`}>
            {/* Tab 1: Pantry */}
            <button
              type="button"
              onClick={() => handleTabChange("kitchen")}
              className="flex flex-col items-center justify-center gap-0.5 py-1 select-none active:scale-95 transition-transform cursor-pointer"
              aria-label="Pantry"
              aria-pressed={activeTab === "kitchen"}
            >
              <div className="relative flex items-center justify-center">
                <UtensilsCrossed
                  className={`w-5 h-5 stroke-[1.75] transition-colors ${
                    activeTab === "kitchen" ? "text-white" : "text-zinc-500 hover:text-zinc-400"
                  }`}
                />
              </div>
              <span
                className={`text-[10px] tracking-tight font-medium leading-tight truncate max-w-full transition-colors ${
                  activeTab === "kitchen" ? "text-white font-semibold" : "text-zinc-500 hover:text-zinc-400"
                }`}
              >
                Pantry
              </span>
              <span
                className={`w-1 h-1 rounded-full transition-all duration-200 ${
                  activeTab === "kitchen" ? "bg-emerald-400 mt-0.5 opacity-100 scale-100" : "bg-transparent mt-0.5 opacity-0 scale-50"
                }`}
              />
            </button>

            {/* Tab 2: Pulse */}
            <button
              type="button"
              onClick={() => handleTabChange("pulse")}
              className="flex flex-col items-center justify-center gap-0.5 py-1 select-none active:scale-95 transition-transform cursor-pointer"
              aria-label="Pulse"
              aria-pressed={activeTab === "pulse"}
            >
              <div className="relative flex items-center justify-center">
                <Activity
                  className={`w-5 h-5 stroke-[1.75] transition-colors ${
                    activeTab === "pulse" ? "text-white" : "text-zinc-500 hover:text-zinc-400"
                  }`}
                />
              </div>
              <span
                className={`text-[10px] tracking-tight font-medium leading-tight truncate max-w-full transition-colors ${
                  activeTab === "pulse" ? "text-white font-semibold" : "text-zinc-500 hover:text-zinc-400"
                }`}
              >
                Pulse
              </span>
              <span
                className={`w-1 h-1 rounded-full transition-all duration-200 ${
                  activeTab === "pulse" ? "bg-emerald-400 mt-0.5 opacity-100 scale-100" : "bg-transparent mt-0.5 opacity-0 scale-50"
                }`}
              />
            </button>

            {/* Tab 3: Cart */}
            <button
              type="button"
              onClick={() => handleTabChange("cart")}
              className="flex flex-col items-center justify-center gap-0.5 py-1 select-none active:scale-95 transition-transform cursor-pointer"
              aria-label="Cart"
              aria-pressed={activeTab === "cart"}
            >
              <div className="relative flex items-center justify-center">
                <CartIcon
                  className={`w-5 h-5 stroke-[1.75] transition-colors ${
                    activeTab === "cart" ? "text-white" : "text-zinc-500 hover:text-zinc-400"
                  }`}
                />
                {myCartCount > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[14px] h-3.5 px-1 rounded-full bg-emerald-500 text-[9px] font-bold text-black flex items-center justify-center leading-none">
                    {myCartCount > 9 ? "9+" : myCartCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] tracking-tight font-medium leading-tight truncate max-w-full transition-colors ${
                  activeTab === "cart" ? "text-white font-semibold" : "text-zinc-500 hover:text-zinc-400"
                }`}
              >
                Cart
              </span>
              <span
                className={`w-1 h-1 rounded-full transition-all duration-200 ${
                  activeTab === "cart" ? "bg-emerald-400 mt-0.5 opacity-100 scale-100" : "bg-transparent mt-0.5 opacity-0 scale-50"
                }`}
              />
            </button>

            {/* Tab 4: Roommates (Flat micro-label on mobile) */}
            <button
              type="button"
              onClick={() => handleTabChange("members")}
              className="flex flex-col items-center justify-center gap-0.5 py-1 select-none active:scale-95 transition-transform cursor-pointer"
              aria-label={spaceType === "FLATSHARE" ? "Flat" : terminology.memberLabelPlural}
              aria-pressed={activeTab === "members"}
            >
              <div className="relative flex items-center justify-center">
                <Users
                  className={`w-5 h-5 stroke-[1.75] transition-colors ${
                    activeTab === "members" ? "text-white" : "text-zinc-500 hover:text-zinc-400"
                  }`}
                />
              </div>
              <span
                className={`text-[10px] tracking-tight font-medium leading-tight truncate max-w-full transition-colors ${
                  activeTab === "members" ? "text-white font-semibold" : "text-zinc-500 hover:text-zinc-400"
                }`}
              >
                {spaceType === "FLATSHARE" ? "Flat" : terminology.memberLabel}
              </span>
              <span
                className={`w-1 h-1 rounded-full transition-all duration-200 ${
                  activeTab === "members" ? "bg-emerald-400 mt-0.5 opacity-100 scale-100" : "bg-transparent mt-0.5 opacity-0 scale-50"
                }`}
              />
            </button>

            {/* Tab 5: Refunds (Admin Only) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleTabChange("refunds")}
                className="flex flex-col items-center justify-center gap-0.5 py-1 select-none active:scale-95 transition-transform cursor-pointer"
                aria-label="Refunds"
                aria-pressed={activeTab === "refunds"}
              >
                <div className="relative flex items-center justify-center">
                  <Receipt
                    className={`w-5 h-5 stroke-[1.75] transition-colors ${
                      activeTab === "refunds" ? "text-white" : "text-zinc-500 hover:text-zinc-400"
                    }`}
                  />
                  {pendingRefundsCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 absolute -top-0.5 -right-1 shadow-[0_0_6px_rgba(251,191,36,0.8)] animate-pulse" />
                  )}
                </div>
                <span
                  className={`text-[10px] tracking-tight font-medium leading-tight truncate max-w-full transition-colors ${
                    activeTab === "refunds" ? "text-white font-semibold" : "text-zinc-500 hover:text-zinc-400"
                  }`}
                >
                  Refunds
                </span>
                <span
                  className={`w-1 h-1 rounded-full transition-all duration-200 ${
                    activeTab === "refunds" ? "bg-emerald-400 mt-0.5 opacity-100 scale-100" : "bg-transparent mt-0.5 opacity-0 scale-50"
                  }`}
                />
              </button>
            )}

            {/* Tab 6: Settings */}
            <button
              type="button"
              onClick={() => handleTabChange("settings")}
              className="flex flex-col items-center justify-center gap-0.5 py-1 select-none active:scale-95 transition-transform cursor-pointer"
              aria-label="Settings"
              aria-pressed={activeTab === "settings"}
            >
              <div className="relative flex items-center justify-center">
                <Settings
                  className={`w-5 h-5 stroke-[1.75] transition-colors ${
                    activeTab === "settings" ? "text-white" : "text-zinc-500 hover:text-zinc-400"
                  }`}
                />
              </div>
              <span
                className={`text-[10px] tracking-tight font-medium leading-tight truncate max-w-full transition-colors ${
                  activeTab === "settings" ? "text-white font-semibold" : "text-zinc-500 hover:text-zinc-400"
                }`}
              >
                Settings
              </span>
              <span
                className={`w-1 h-1 rounded-full transition-all duration-200 ${
                  activeTab === "settings" ? "bg-emerald-400 mt-0.5 opacity-100 scale-100" : "bg-transparent mt-0.5 opacity-0 scale-50"
                }`}
              />
            </button>
          </div>
        </nav>

        {/* Tab 1: Kitchen (Daily Core) */}
        <TabsContent value="kitchen" className="space-y-6 animate-in fade-in-50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <PantrySection
              kitchenId={initialKitchen.id}
              items={localPantryItems}
              onItemEmptied={handlePantryItemEmptied}
              onItemRestocked={handlePantryItemRestocked}
              onItemAdded={(item) =>
                setLocalPantryItems((prev) =>
                  [...prev, item].sort((a, b) => a.name.localeCompare(b.name))
                )
              }
              onItemDeleted={(itemId) =>
                setLocalPantryItems((prev) => prev.filter((p) => p.id !== itemId))
              }
            />
            <ShoppingListSection
              kitchenId={initialKitchen.id}
              items={localShoppingListItems}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              spaceType={spaceType}
              onViewCart={() => handleTabChange("cart")}
              onItemMovedToCart={handleItemMovedToCart}
              onItemReturnedToList={handleItemReturnedToList}
              onItemRemoved={handleItemRemoved}
              onItemAdded={(item) =>
                setLocalShoppingListItems((prev) => [item, ...prev])
              }
            />
          </div>

          <Suspense fallback={<MyPurchasesSkeleton />}>
            <MyPurchasesSection kitchenId={initialKitchen.id} checkouts={myCheckouts} />
          </Suspense>
        </TabsContent>

        {/* Tab: Pulse (Kitchen Stats & Analytics) */}
        <TabsContent value="pulse" className="space-y-6 animate-in fade-in-50">
          <KitchenPulse
            kitchenId={initialKitchen.id}
            kitchenName={kitchenName}
            currentUserId={currentUserId}
            initialStats={initialPulseStats}
          />
        </TabsContent>

        {/* Tab 3: Cart (Full Workspace) */}
        <TabsContent value="cart" className="space-y-6 animate-in fade-in-50">
          <ActiveCartSection
            kitchenId={initialKitchen.id}
            items={localShoppingListItems}
            currentUserId={currentUserId}
            spaceType={spaceType}
            onSwitchTab={handleTabChange}
          />
        </TabsContent>

        {/* Tab 3: Members (Dynamic Label based on space_type) */}
        <TabsContent value="members" className="space-y-6 animate-in fade-in-50">
          {activeTab === "members" && (
            isMembersLoading ? (
              <MembersSkeleton />
            ) : isAdmin ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Active members & Pending invites */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="border border-border bg-card rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{terminology.activeMembersTitle}</span>
                      <Badge variant="secondary" className="text-xs font-mono">
                        {activeMembers.length}
                      </Badge>
                    </h2>
                  </div>

                  <AdminActiveMembersList
                    kitchenId={initialKitchen.id}
                    members={activeMembers}
                    currentUserId={currentUserId}
                    spaceType={spaceType}
                  />
                </Card>

                <Card className="border border-border bg-card rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>Pending Invites</span>
                      <Badge variant="secondary" className="text-xs font-mono">
                        {pendingInvites.length}
                      </Badge>
                    </h2>
                  </div>

                  <AdminPendingInvitesList
                    kitchenId={initialKitchen.id}
                    invites={pendingInvites}
                    baseUrl={baseUrl}
                    spaceType={spaceType}
                  />
                </Card>
              </div>

              {/* Right Col: Add Member Form */}
              <div className="space-y-6">
                <Card className="border border-border bg-card rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
                  <CardHeader className="p-0 space-y-1">
                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-muted-foreground" />
                      <span>{terminology.inviteCardTitle}</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      {terminology.inviteCardDescription}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-0">
                    <form onSubmit={handleAdminInvite} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="admin-member-name">
                          {terminology.memberLabel} Display Name
                        </Label>
                        <Input
                          id="admin-member-name"
                          type="text"
                          value={inviteMemberName}
                          onChange={(e) => setInviteMemberName(e.target.value)}
                          required
                          placeholder={terminology.namePlaceholder}
                          className="rounded-xl"
                          disabled={isInviting}
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={isInviting || !inviteMemberName.trim()}
                        className="w-full h-10 rounded-xl font-semibold shadow-sm text-xs sm:text-sm gap-2"
                      >
                        {isInviting && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span>Invite {terminology.memberLabel} &amp; Generate Link</span>
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            /* Member Read-Only View */
            <div className="max-w-2xl mx-auto space-y-6">
              <Card className="border border-border bg-card rounded-3xl p-4 sm:p-6 md:p-8 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>{terminology.kitchenMembersTitle}</span>
                    <Badge variant="secondary" className="text-xs font-mono">
                      {activeMembers.length}
                    </Badge>
                  </h2>
                </div>

                <div className="divide-y divide-border">
                  {activeMembers.map((member) => (
                    <div
                      key={member.id}
                      className="py-3 flex items-center justify-between text-sm hover:bg-muted/40 px-2 rounded-xl transition"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
                            {member.kitchen_display_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-foreground">
                            {capitalize(member.kitchen_display_name)}
                            {member.user_id === currentUserId && (
                              <span className="ml-2 text-xs text-muted-foreground font-normal">(You)</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            @{member.username || "guest"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground font-mono hidden sm:inline">
                          {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : ""}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[11px] font-medium"
                        >
                          {member.role}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/70 text-xs text-muted-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>Only admins can manage invitations.</span>
                </div>
              </Card>
            </div>
          )
        )}
        </TabsContent>

        {/* Tab 4: Admin Refunds (Visible only to Admin) */}
        {isAdmin && (
          <TabsContent value="refunds" className="space-y-6 animate-in fade-in-50">
            {activeTab === "refunds" && (
              <Suspense fallback={<AdminRefundsSkeleton />}>
                <AdminRefundsSection
                  kitchenId={initialKitchen.id}
                  checkouts={adminCheckouts}
                  members={members}
                  spaceType={spaceType}
                  onCheckoutsLoaded={(loaded) => {
                    setPendingRefundsCount(loaded.filter((c) => !c.is_refunded).length);
                  }}
                />
              </Suspense>
            )}
          </TabsContent>
        )}

        {/* Tab 5: Settings */}
        <TabsContent value="settings" className="space-y-6 animate-in fade-in-50">
          {isAdmin ? (
            <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
              <Card className="border border-border bg-card rounded-3xl p-4 sm:p-6 md:p-8 shadow-sm space-y-6">
                <CardHeader className="p-0 space-y-1">
                  <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Settings className="w-5 h-5 text-muted-foreground" />
                    <span>Kitchen Settings</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Manage your household space, terminology presets, and guest supermarket access.
                  </CardDescription>
                </CardHeader>

                <form onSubmit={handleSaveSettings} className="space-y-6">
                  {/* Section 1: Kitchen Name */}
                  <div className="space-y-2">
                    <Label htmlFor="admin-settings-kitchen-name">Kitchen Name</Label>
                    <Input
                      id="admin-settings-kitchen-name"
                      type="text"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      required
                      maxLength={255}
                      placeholder="e.g. Baker Street Kitchen"
                      className="rounded-xl h-10 bg-muted/40"
                      disabled={isSavingSettings}
                    />
                    <span className="text-[11px] text-muted-foreground block">
                      The public display name for this shared kitchen space.
                    </span>
                  </div>

                  <Separator className="bg-border/60" />

                  {/* Section 2: Space Context / Wording Presets */}
                  <div className="space-y-2.5">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Space Context &amp; Wording
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Choose how household members are addressed throughout the app.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setDraftSpaceType("FLATSHARE")}
                        className={`h-16 rounded-2xl flex flex-col items-center justify-center gap-1 font-semibold text-xs border transition-all cursor-pointer ${
                          draftSpaceType === "FLATSHARE"
                            ? "bg-secondary text-foreground border-foreground/30 shadow-xs"
                            : "bg-card text-muted-foreground border-border/80 hover:text-foreground hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Home className="w-3.5 h-3.5" />
                          <span>Flatshare</span>
                        </div>
                        <span className="text-[10px] font-normal text-muted-foreground">
                          Term: Roommates
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDraftSpaceType("FAMILY")}
                        className={`h-16 rounded-2xl flex flex-col items-center justify-center gap-1 font-semibold text-xs border transition-all cursor-pointer ${
                          draftSpaceType === "FAMILY"
                            ? "bg-secondary text-foreground border-foreground/30 shadow-xs"
                            : "bg-card text-muted-foreground border-border/80 hover:text-foreground hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Heart className="w-3.5 h-3.5" />
                          <span>Family</span>
                        </div>
                        <span className="text-[10px] font-normal text-muted-foreground">
                          Term: Family
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDraftSpaceType("OFFICE")}
                        className={`h-16 rounded-2xl flex flex-col items-center justify-center gap-1 font-semibold text-xs border transition-all cursor-pointer ${
                          draftSpaceType === "OFFICE"
                            ? "bg-secondary text-foreground border-foreground/30 shadow-xs"
                            : "bg-card text-muted-foreground border-border/80 hover:text-foreground hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5" />
                          <span>Office</span>
                        </div>
                        <span className="text-[10px] font-normal text-muted-foreground">
                          Term: Team
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDraftSpaceType("NEUTRAL")}
                        className={`h-16 rounded-2xl flex flex-col items-center justify-center gap-1 font-semibold text-xs border transition-all cursor-pointer ${
                          draftSpaceType === "NEUTRAL"
                            ? "bg-secondary text-foreground border-foreground/30 shadow-xs"
                            : "bg-card text-muted-foreground border-border/80 hover:text-foreground hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>Neutral</span>
                        </div>
                        <span className="text-[10px] font-normal text-muted-foreground">
                          Term: Members
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      disabled={isSavingSettings || !draftName.trim()}
                      className="rounded-xl font-semibold px-5"
                    >
                      {isSavingSettings && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                      <span>Save Changes</span>
                    </Button>
                  </div>
                </form>

                <Separator className="bg-border/60" />

                {/* Section 3: Guest Supermarket Link */}
                <div className="space-y-3 rounded-2xl p-5 bg-muted/30 border border-border/70">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-muted-foreground" />
                      <span>Guest Supermarket Link</span>
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Disposable read-only link for supermarket visitors. Regenerating creates a new token and immediately invalidates the previous link.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      type="text"
                      readOnly
                      value={publicGuestUrl}
                      className="h-9 px-3 text-xs text-foreground font-mono select-all rounded-xl bg-card border-border/80"
                    />
                    <CopyButton text={publicGuestUrl} label="Copy Link" size="sm" />
                    <Button asChild variant="ghost" size="icon-sm" className="h-9 w-9 rounded-xl shrink-0" title="Open guest view">
                      <Link href={publicGuestUrl} target="_blank">
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </Link>
                    </Button>
                  </div>

                  <div className="pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRegenerateGuestLink}
                      disabled={isRegenerating}
                      className="rounded-xl text-xs font-medium gap-1.5 h-8.5 border-border hover:bg-muted"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
                      <span>{isRegenerating ? "Regenerating..." : "Regenerate Guest Link"}</span>
                    </Button>
                  </div>
                </div>

                <Separator className="bg-border/60" />

                {/* Purchases Audit Log Shortcut */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-muted/20 border border-border/60">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-foreground">Purchase History &amp; Refunds</span>
                    <p className="text-[11px] text-muted-foreground">
                      Review checkout receipts and audit member grocery expenditures.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleTabChange("refunds")}
                    className="rounded-xl font-semibold shrink-0"
                  >
                    View Refunds
                  </Button>
                </div>
              </Card>
            </div>
          ) : (
            /* Member Settings View */
            <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
              <Card className="border border-border bg-card rounded-3xl p-4 sm:p-6 md:p-8 shadow-sm space-y-6">
                <CardHeader className="p-0 space-y-1">
                  <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Settings className="w-5 h-5 text-muted-foreground" />
                    <span>Kitchen Information</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    General details about your membership in this kitchen space.
                  </CardDescription>
                </CardHeader>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-1">
                    <span className="text-xs text-muted-foreground">Kitchen Name</span>
                    <p className="text-sm font-semibold text-foreground">{kitchenName}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-1">
                    <span className="text-xs text-muted-foreground">Space Context</span>
                    <p className="text-sm font-semibold text-foreground">{terminology.spaceLabel} Space</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-1">
                    <span className="text-xs text-muted-foreground">Your Display Name</span>
                    <p className="text-sm font-semibold text-foreground">
                      {capitalize(membership.kitchen_display_name)}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-1">
                    <span className="text-xs text-muted-foreground">Joined Date</span>
                    <p className="text-sm font-semibold text-foreground">
                      {membership.joined_at ? new Date(membership.joined_at).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </div>

                <Separator className="bg-border/60" />

                {/* Danger Zone: Leave Kitchen */}
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Leave Kitchen</h4>
                      <p className="text-xs text-muted-foreground">
                        Remove yourself from this kitchen space and revoke shared grocery access.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-foreground">Leave this household</span>
                      <p className="text-[11px] text-muted-foreground">
                        You will need a new invite link from an admin to rejoin in the future.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsLeaveModalOpen(true)}
                      className="border-destructive/40 text-destructive hover:bg-destructive/10 rounded-xl font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5 mr-1.5" />
                      <span>Leave Kitchen</span>
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Leave Kitchen Confirmation Dialog */}
              <AlertDialog open={isLeaveModalOpen} onOpenChange={setIsLeaveModalOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <AlertDialogTitle>Leave {kitchenName}?</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription>
                      Are you sure you want to leave <strong className="text-foreground font-semibold">{kitchenName}</strong>? You will lose access to the shared grocery list and pantry inventory. You will need an invite link from an admin to regain access.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLeaving}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={isLeaving}
                      onClick={(e) => {
                        e.preventDefault();
                        handleLeaveKitchen();
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
                    >
                      {isLeaving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                      <span>{isLeaving ? "Leaving..." : "Yes, Leave Kitchen"}</span>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Floating Cart Bottom Bar (Sticky UX when user has items in cart) */}
      {myCartCount > 0 && activeTab === "kitchen" && (
        <div className="fixed bottom-20 sm:bottom-5 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-lg animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-card/95 backdrop-blur-md border border-border text-card-foreground rounded-2xl p-3 sm:px-5 sm:py-3.5 shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              </span>
              <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                You have <strong className="text-foreground font-bold">{myCartCount}</strong> item{myCartCount === 1 ? "" : "s"} staged in your cart
              </p>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={() => handleTabChange("cart")}
              className="rounded-xl text-xs font-semibold shrink-0 gap-1.5 h-8.5 px-3.5 shadow-sm cursor-pointer"
            >
              <span>View Cart &amp; Checkout</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
