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
import { updateKitchenSettings, regeneratePublicViewToken, addMemberAction, leaveKitchenAction } from "@/app/actions/kitchen";
import { PantrySection } from "@/components/PantrySection";
import { ShoppingListSection } from "@/components/ShoppingListSection";
import { ShoppingCart } from "@/components/ShoppingCart";
import { CopyButton } from "@/components/CopyButton";
import { AdminActiveMembersList } from "@/components/AdminActiveMembersList";
import { AdminPendingInvitesList } from "@/components/AdminPendingInvitesList";
import { MyPurchasesSection } from "@/components/MyPurchasesSection";
import { GuestCartHandoverListener } from "@/components/GuestCartHandoverListener";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  ShoppingBag,
  ExternalLink,
  Users,
  Mail,
  UserPlus,
  Shield,
  Settings,
  Home,
  Heart,
  Building2,
  RefreshCw,
  Loader2,
  AlertTriangle,
  LogOut,
} from "lucide-react";
import { capitalize } from "@/lib/utils";
import { toast } from "sonner";

interface KitchenSpaceViewProps {
  kitchen: Kitchen;
  membership: KitchenMember;
  members: KitchenMemberWithUser[];
  pantryItems: PantryItem[];
  shoppingListItems: ShoppingListItem[];
  myCheckouts: CheckoutWithDetails[];
  currentUserId: string;
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
  currentUserId,
  baseUrl,
  initialTab = "kitchen",
}: KitchenSpaceViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [kitchenName, setKitchenName] = useState(initialKitchen.name);
  const [spaceType, setSpaceType] = useState<KitchenSpaceType>(initialKitchen.space_type || "FLATSHARE");
  const [publicViewToken, setPublicViewToken] = useState(initialKitchen.public_view_token);

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

  // Tab state syncing
  const urlTab = searchParams.get("tab");
  const defaultTab = urlTab && ["kitchen", "members", "settings"].includes(urlTab) ? urlTab : initialTab;
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    if (urlTab && ["kitchen", "members", "settings"].includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  useEffect(() => {
    setKitchenName(initialKitchen.name);
    setDraftName(initialKitchen.name);
    setSpaceType(initialKitchen.space_type || "FLATSHARE");
    setDraftSpaceType(initialKitchen.space_type || "FLATSHARE");
    setPublicViewToken(initialKitchen.public_view_token);
  }, [initialKitchen.name, initialKitchen.space_type, initialKitchen.public_view_token]);

  const terminology = getSpaceTerminology(spaceType);
  const isAdmin = membership.role === "ADMIN";

  const activeMembers = initialMembers.filter((m) => m.joined_at !== null);
  const pendingInvites = initialMembers.filter((m) => m.joined_at === null && m.invite_token !== null);

  const publicGuestUrl = `${baseUrl}/kitchen/view/${publicViewToken}`;

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

    if (trimmed === kitchenName && draftSpaceType === spaceType) {
      toast.info("No changes to save.");
      return;
    }

    setIsSavingSettings(true);
    startTransition(async () => {
      try {
        await updateKitchenSettings({
          kitchenId: initialKitchen.id,
          name: trimmed,
          spaceType: draftSpaceType,
        });
        setKitchenName(trimmed);
        setSpaceType(draftSpaceType);
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
        if (res.success && res.newToken) {
          setPublicViewToken(res.newToken);
          toast.success("Guest supermarket link regenerated!");
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to regenerate guest link.");
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
        toast.success(`Generated invite for ${res.member.kitchen_display_name}`);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to create invite.");
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
        toast.success(`You have left ${kitchenName}`);
        router.push("/");
      } catch (err: any) {
        toast.error(err.message || "Failed to leave kitchen.");
        setIsLeaving(false);
      }
    });
  };

  return (
    <div className="space-y-6">
      <GuestCartHandoverListener kitchenId={initialKitchen.id} />

      {/* Top Breadcrumb & Header */}
      <div className="space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition px-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Kitchens</span>
        </Link>

        {/* Compact Header Card */}
        <Card className="border border-border/80 bg-card dark:bg-zinc-900/60 dark:border-zinc-800 backdrop-blur-sm rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant={isAdmin ? "accent" : "secondary"}
                className="font-semibold text-[10px] tracking-wider uppercase"
              >
                {isAdmin ? "ADMIN" : "MEMBER"}
              </Badge>
              <Badge variant="secondary" className="font-semibold text-[10px] uppercase">
                {terminology.spaceLabel} SPACE
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                Created {new Date(initialKitchen.created_at).toLocaleDateString()}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight truncate">
              {kitchenName}
            </h1>

            <p className="text-xs text-muted-foreground">
              Display Name: <strong className="text-foreground">{capitalize(membership.kitchen_display_name)}</strong>
              {isAdmin ? " (Admin)" : ""}
            </p>
          </div>

          {/* Right Header Toolbar Actions */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {/* Compact Supermarket Link Action */}
            <div className="flex items-center gap-1.5 bg-muted/60 dark:bg-zinc-800/60 border border-border/70 dark:border-zinc-700/80 rounded-xl px-2.5 py-1 text-xs">
              <ShoppingBag className="w-3.5 h-3.5 text-accent-brand shrink-0" />
              <span className="text-[11px] font-medium text-muted-foreground hidden sm:inline">Guest Link:</span>
              <Input
                type="text"
                readOnly
                value={publicGuestUrl}
                className="h-6 px-1 text-[11px] text-foreground font-mono w-24 sm:w-32 select-all border-none bg-transparent shadow-none focus-visible:ring-0"
              />
              <CopyButton text={publicGuestUrl} label="Copy" size="sm" />
              <Button asChild variant="ghost" size="icon-sm" className="h-7 w-7 rounded-lg" title="Open guest view in new tab">
                <Link href={publicGuestUrl} target="_blank">
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                </Link>
              </Button>
            </div>

            <ShoppingCart
              kitchenId={initialKitchen.id}
              items={shoppingListItems}
              currentUserId={currentUserId}
              spaceType={spaceType}
            />

            {isAdmin && (
              <Button asChild variant="outline" size="sm" className="rounded-xl font-medium text-xs h-9">
                <Link href={`/kitchen/${initialKitchen.id}/admin/purchases`}>Purchases</Link>
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Pill-Based Tab Navigation Control */}
      <Tabs defaultValue={defaultTab} value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto mb-6 bg-muted/70 dark:bg-zinc-900/80 border border-border/80 dark:border-zinc-800 p-1 rounded-2xl">
          <TabsTrigger value="kitchen" className="rounded-xl text-xs font-semibold data-[state=active]:bg-card dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground data-[state=active]:shadow-xs">
            Kitchen
          </TabsTrigger>
          <TabsTrigger value="members" className="rounded-xl text-xs font-semibold data-[state=active]:bg-card dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground data-[state=active]:shadow-xs">
            {terminology.memberLabelPlural}
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-xl text-xs font-semibold data-[state=active]:bg-card dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground data-[state=active]:shadow-xs">
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Kitchen (Daily Core) */}
        <TabsContent value="kitchen" className="space-y-6 animate-in fade-in-50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PantrySection kitchenId={initialKitchen.id} items={pantryItems} />
            <ShoppingListSection
              kitchenId={initialKitchen.id}
              items={shoppingListItems}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
            />
          </div>

          {myCheckouts && myCheckouts.length > 0 && (
            <MyPurchasesSection checkouts={myCheckouts} />
          )}
        </TabsContent>

        {/* Tab 2: Members (Dynamic Label based on space_type) */}
        <TabsContent value="members" className="space-y-6 animate-in fade-in-50">
          {isAdmin ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Active members & Pending invites */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="border border-border/80 bg-card dark:bg-zinc-900/60 dark:border-zinc-800 backdrop-blur-sm rounded-3xl p-6 shadow-sm space-y-4">
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

                <Card className="border border-border/80 bg-card dark:bg-zinc-900/60 dark:border-zinc-800 backdrop-blur-sm rounded-3xl p-6 shadow-sm space-y-4">
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
                <Card className="border border-border/80 bg-card dark:bg-zinc-900/60 dark:border-zinc-800 backdrop-blur-sm rounded-3xl p-6 shadow-sm space-y-4">
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
              <Card className="border border-border/80 bg-card dark:bg-zinc-900/60 dark:border-zinc-800 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
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
                          variant={member.role === "ADMIN" ? "accent" : "secondary"}
                          className="text-[11px]"
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
          )}
        </TabsContent>

        {/* Tab 3: Settings */}
        <TabsContent value="settings" className="space-y-6 animate-in fade-in-50">
          {isAdmin ? (
            <div className="max-w-2xl mx-auto space-y-6">
              <Card className="border border-border/80 bg-card dark:bg-zinc-900/60 dark:border-zinc-800 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
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

                    <div className="grid grid-cols-3 gap-3 pt-1">
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
                      <ShoppingBag className="w-4 h-4 text-accent-brand" />
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
                  <Button asChild variant="secondary" size="sm" className="rounded-xl font-semibold shrink-0">
                    <Link href={`/kitchen/${initialKitchen.id}/admin/purchases`}>View Purchases</Link>
                  </Button>
                </div>
              </Card>
            </div>
          ) : (
            /* Member Settings View */
            <div className="max-w-2xl mx-auto space-y-6">
              <Card className="border border-border/80 bg-card dark:bg-zinc-900/60 dark:border-zinc-800 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
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
                      className="border-destructive/40 text-red-400 hover:text-red-300 hover:bg-destructive/10 rounded-xl font-medium"
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
    </div>
  );
}
