"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  Kitchen,
  KitchenMember,
  KitchenMemberWithUser,
  KitchenSpaceType,
  StaplePermission,
} from "@/types";
import { getSpaceTerminology } from "@/lib/spaceTerminology";
import {
  updateKitchenSettingsAction,
  regeneratePublicViewTokenAction,
  addMemberAction,
  cancelInviteAction,
  leaveKitchenAction,
  deleteKitchenAction,
} from "@/app/actions/kitchen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  Globe,
  MoreHorizontal,
  Loader2,
  Home,
  Heart,
  Briefcase,
  Layers,
  Plus,
  Trash2,
  LogOut,
  AlertTriangle,
  RotateCcw,
  Package,
} from "lucide-react";
import { capitalize, cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

interface KitchenSettingsViewProps {
  kitchen: Kitchen;
  membership: KitchenMember;
  members: KitchenMemberWithUser[];
  currentUserId: string;
  baseUrl: string;
}

export function KitchenSettingsView({
  kitchen: initialKitchen,
  membership,
  members: initialMembers,
  currentUserId,
  baseUrl,
}: KitchenSettingsViewProps) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const isAdmin = membership.role === "ADMIN";

  // General settings state
  const [kitchenName, setKitchenName] = useState(initialKitchen.name);
  const [spaceType, setSpaceType] = useState<KitchenSpaceType>(
    initialKitchen.space_type || "FLATSHARE"
  );
  const [staplePermission, setStaplePermission] = useState<StaplePermission>(
    initialKitchen.staple_permission || "open"
  );
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);

  // Invites & guest link state
  const [publicViewToken, setPublicViewToken] = useState(initialKitchen.public_view_token);
  const [isRegeneratingToken, setIsRegeneratingToken] = useState(false);
  const [members, setMembers] = useState<KitchenMemberWithUser[]>(initialMembers);
  const [newMemberName, setNewMemberName] = useState("");
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [isInviteDrawerOpen, setIsInviteDrawerOpen] = useState(false);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);

  // Copy states
  const [guestCopied, setGuestCopied] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  // Danger zone dialog states
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Computed state
  const terminology = getSpaceTerminology(spaceType);
  const isDirty =
    kitchenName.trim() !== initialKitchen.name ||
    spaceType !== (initialKitchen.space_type || "FLATSHARE") ||
    staplePermission !== (initialKitchen.staple_permission || "open");

  const publicGuestUrl = `${baseUrl}/kitchen/view/${publicViewToken}`;
  const displayGuestUrl = `${baseUrl.replace(/^https?:\/\//, "")}/view/${publicViewToken.slice(0, 8)}...`;

  const activeMembers = members.filter((m) => m.joined_at !== null);
  const pendingInvites = members.filter(
    (m) => m.joined_at === null && m.invite_token !== null
  );
  const primaryPendingInvite = pendingInvites[0];
  const primaryInviteUrl = primaryPendingInvite
    ? `${baseUrl}/invite/${primaryPendingInvite.invite_token}`
    : "";

  // Handle Save General Settings
  const handleSaveGeneral = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isAdmin) return;

    const trimmed = kitchenName.trim();
    if (!trimmed) {
      toast.error(
        locale === "de"
          ? "Der Name der Küche darf nicht leer sein."
          : "Kitchen name cannot be empty."
      );
      return;
    }

    setIsSavingGeneral(true);
    try {
      await updateKitchenSettingsAction({
        kitchenId: initialKitchen.id,
        name: trimmed,
        spaceType,
        staplePermission,
      });
      toast.success(
        locale === "de"
          ? "Änderungen erfolgreich gespeichert."
          : "Settings updated successfully."
      );
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update settings.");
    } finally {
      setIsSavingGeneral(false);
    }
  };

  // Reset form changes
  const handleResetForm = () => {
    setKitchenName(initialKitchen.name);
    setSpaceType(initialKitchen.space_type || "FLATSHARE");
    setStaplePermission(initialKitchen.staple_permission || "open");
  };

  // Copy guest URL
  const handleCopyGuestLink = async () => {
    try {
      await navigator.clipboard.writeText(publicGuestUrl);
      setGuestCopied(true);
      toast.success(locale === "de" ? "Link kopiert!" : "Link copied!");
      setTimeout(() => setGuestCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  // Copy invite URL
  const handleCopyInviteLink = async () => {
    if (!primaryInviteUrl) return;
    try {
      await navigator.clipboard.writeText(primaryInviteUrl);
      setInviteCopied(true);
      toast.success(locale === "de" ? "Einladung kopiert!" : "Invite link copied!");
      setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      toast.error("Failed to copy invite");
    }
  };

  // Handle Regenerate Guest Link
  const handleRegenerateGuestToken = async () => {
    if (!isAdmin || isRegeneratingToken) return;

    setIsRegeneratingToken(true);
    try {
      const result = await regeneratePublicViewTokenAction({
        kitchenId: initialKitchen.id,
      });
      setPublicViewToken(result.newToken);
      toast.success(
        locale === "de"
          ? "Öffentlicher Link neu generiert."
          : "Public guest link regenerated."
      );
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to regenerate guest link.");
    } finally {
      setIsRegeneratingToken(false);
    }
  };

  // Handle Create Member Invite
  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || isCreatingInvite) return;

    const trimmed = newMemberName.trim();
    if (!trimmed) {
      toast.error(
        locale === "de"
          ? "Bitte gib einen Namen ein."
          : "Please enter a member display name."
      );
      return;
    }

    setIsCreatingInvite(true);
    try {
      const result = await addMemberAction(initialKitchen.id, trimmed);
      const newMemberRecord: KitchenMemberWithUser = {
        ...result.member,
        username: null,
      };
      setMembers((prev) => [...prev, newMemberRecord]);
      setNewMemberName("");
      setIsInviteDrawerOpen(false);
      toast.success(
        locale === "de"
          ? `Einladungslink für ${trimmed} erstellt.`
          : `Invite generated for ${trimmed}`
      );
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate invite.");
    } finally {
      setIsCreatingInvite(false);
    }
  };

  // Handle Revoke Invite
  const handleRevokeInvite = async (memberId: string, name: string) => {
    if (!isAdmin || revokingInviteId) return;

    setRevokingInviteId(memberId);
    try {
      await cancelInviteAction(initialKitchen.id, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      toast.success(
        locale === "de"
          ? `Einladung für ${name} widerrufen.`
          : `Revoked invite for ${name}`
      );
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke invite.");
    } finally {
      setRevokingInviteId(null);
    }
  };

  // Handle Leave Kitchen (Regular member)
  const handleLeaveKitchen = async () => {
    setIsLeaving(true);
    try {
      await leaveKitchenAction(initialKitchen.id);
      toast.success(
        locale === "de"
          ? `Du hast ${kitchenName} verlassen.`
          : `You have left ${kitchenName}`
      );
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to leave kitchen.");
      setIsLeaving(false);
      setIsLeaveDialogOpen(false);
    }
  };

  // Handle Delete Kitchen (Admin only)
  const handleDeleteKitchen = async () => {
    setIsDeleting(true);
    try {
      await deleteKitchenAction(initialKitchen.id);
      toast.success(
        locale === "de"
          ? `${kitchenName} wurde dauerhaft gelöscht.`
          : `${kitchenName} was permanently deleted.`
      );
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete kitchen.");
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full flex flex-col bg-background text-foreground selection:bg-primary/20">
      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-6 flex-1">
        {/* ========================================================
            PAGE HEADER (Linear / Apple Style)
           ======================================================== */}
        <div className="space-y-4">
          <Link
            href={`/kitchen/${initialKitchen.id}`}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>{t.kitchenSettings.backToBoard}</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {t.kitchenSettings.title}
              </h1>
              <p className="text-xs text-muted-foreground">
                {locale === "de"
                  ? "Verwalte Konfiguration, Zugänge und Mitbewohner."
                  : "Manage configuration, access, and roommates."}
              </p>
            </div>

            {/* Desktop Docked Save Button */}
            {isAdmin && (
              <div className="hidden sm:flex items-center gap-2">
                {isDirty && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetForm}
                    disabled={isSavingGeneral}
                    className="rounded-xl text-xs h-9 px-3 text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    <span>{t.kitchenSettings.resetBtn}</span>
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={() => handleSaveGeneral()}
                  disabled={isSavingGeneral || !kitchenName.trim() || !isDirty}
                  size="sm"
                  className={cn(
                    "rounded-xl font-semibold text-xs h-9 px-4 transition-all duration-150 shadow-sm",
                    isDirty
                      ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 cursor-pointer"
                      : "opacity-40 pointer-events-none bg-secondary text-muted-foreground"
                  )}
                >
                  {isSavingGeneral ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      <span>{t.kitchenSettings.saving}</span>
                    </>
                  ) : (
                    <span>{t.kitchenSettings.saveChanges}</span>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================
            GROUP 1: KÜCHEN-PROFIL & RAUM-TYP (Linear/Apple List)
           ======================================================== */}
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
          {/* Row 1: Name der Küche */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <Label
                htmlFor="kitchen-name"
                className="text-sm font-semibold text-foreground cursor-pointer"
              >
                {t.kitchenSettings.nameRowLabel}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t.kitchenSettings.nameRowSubtext}
              </p>
            </div>
            <Input
              id="kitchen-name"
              value={kitchenName}
              onChange={(e) => setKitchenName(e.target.value)}
              disabled={!isAdmin || isSavingGeneral}
              required
              maxLength={255}
              placeholder="e.g. Baker Street WG"
              className="bg-secondary/40 border border-border/60 rounded-xl px-3 py-1.5 text-sm w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-primary text-foreground transition-all h-9"
            />
          </div>

          {/* Row 2: Divider */}
          <div className="border-t border-border/60" />

          {/* Row 3: Art der Gemeinschaft */}
          <div className="p-4 sm:p-5 space-y-3">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold text-foreground">
                {t.kitchenSettings.typeRowLabel}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t.kitchenSettings.typeRowSubtext}
              </p>
            </div>

            {/* 4-Segment Pill Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
              {/* Flatshare WG */}
              <button
                type="button"
                disabled={!isAdmin}
                onClick={() => setSpaceType("FLATSHARE")}
                className={cn(
                  "rounded-xl py-2 px-3 text-xs flex items-center justify-center gap-1.5 transition-all select-none min-h-[36px]",
                  isAdmin ? "cursor-pointer active:scale-95" : "cursor-default opacity-85",
                  spaceType === "FLATSHARE"
                    ? "bg-primary/10 text-primary border border-primary/30 font-semibold shadow-xs"
                    : "bg-secondary/30 text-muted-foreground hover:bg-secondary/60 hover:text-foreground border border-transparent"
                )}
              >
                <Home className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t.kitchenSettings.types.flatshare}</span>
              </button>

              {/* Familie */}
              <button
                type="button"
                disabled={!isAdmin}
                onClick={() => setSpaceType("FAMILY")}
                className={cn(
                  "rounded-xl py-2 px-3 text-xs flex items-center justify-center gap-1.5 transition-all select-none min-h-[36px]",
                  isAdmin ? "cursor-pointer active:scale-95" : "cursor-default opacity-85",
                  spaceType === "FAMILY"
                    ? "bg-primary/10 text-primary border border-primary/30 font-semibold shadow-xs"
                    : "bg-secondary/30 text-muted-foreground hover:bg-secondary/60 hover:text-foreground border border-transparent"
                )}
              >
                <Heart className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t.kitchenSettings.types.family}</span>
              </button>

              {/* Büro */}
              <button
                type="button"
                disabled={!isAdmin}
                onClick={() => setSpaceType("OFFICE")}
                className={cn(
                  "rounded-xl py-2 px-3 text-xs flex items-center justify-center gap-1.5 transition-all select-none min-h-[36px]",
                  isAdmin ? "cursor-pointer active:scale-95" : "cursor-default opacity-85",
                  spaceType === "OFFICE"
                    ? "bg-primary/10 text-primary border border-primary/30 font-semibold shadow-xs"
                    : "bg-secondary/30 text-muted-foreground hover:bg-secondary/60 hover:text-foreground border border-transparent"
                )}
              >
                <Briefcase className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t.kitchenSettings.types.office}</span>
              </button>

              {/* Neutral */}
              <button
                type="button"
                disabled={!isAdmin}
                onClick={() => setSpaceType("NEUTRAL")}
                className={cn(
                  "rounded-xl py-2 px-3 text-xs flex items-center justify-center gap-1.5 transition-all select-none min-h-[36px]",
                  isAdmin ? "cursor-pointer active:scale-95" : "cursor-default opacity-85",
                  spaceType === "NEUTRAL"
                    ? "bg-primary/10 text-primary border border-primary/30 font-semibold shadow-xs"
                    : "bg-secondary/30 text-muted-foreground hover:bg-secondary/60 hover:text-foreground border border-transparent"
                )}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t.kitchenSettings.types.neutral}</span>
              </button>
            </div>
          </div>

          {/* Row 4: Divider */}
          <div className="border-t border-border/60" />

          {/* Row 5: Berechtigungen für WG-Basics */}
          <div className="p-4 sm:p-5 space-y-3">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold text-foreground">
                {t.kitchenSettings.staplePermissions.title}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t.kitchenSettings.staplePermissions.subtitle}
              </p>
            </div>

            {/* 3-Way Segmented Policy Selector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
              {/* Option 1: open */}
              <button
                type="button"
                disabled={!isAdmin}
                onClick={() => setStaplePermission("open")}
                className={cn(
                  "rounded-xl p-3.5 text-left flex flex-col justify-between transition-all select-none border min-h-[88px]",
                  isAdmin ? "cursor-pointer active:scale-[0.98]" : "cursor-default opacity-85",
                  staplePermission === "open"
                    ? "bg-primary/10 border-primary/40 shadow-xs"
                    : "bg-secondary/30 border-border/50 hover:bg-secondary/60 hover:border-border/80"
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5 w-full">
                  <span className={cn("text-xs font-semibold", staplePermission === "open" ? "text-primary" : "text-foreground")}>
                    {t.kitchenSettings.staplePermissions.openTitle}
                  </span>
                  {staplePermission === "open" && (
                    <div className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {t.kitchenSettings.staplePermissions.openDesc}
                </p>
              </button>

              {/* Option 2: approval */}
              <button
                type="button"
                disabled={!isAdmin}
                onClick={() => setStaplePermission("approval")}
                className={cn(
                  "rounded-xl p-3.5 text-left flex flex-col justify-between transition-all select-none border min-h-[88px]",
                  isAdmin ? "cursor-pointer active:scale-[0.98]" : "cursor-default opacity-85",
                  staplePermission === "approval"
                    ? "bg-primary/10 border-primary/40 shadow-xs"
                    : "bg-secondary/30 border-border/50 hover:bg-secondary/60 hover:border-border/80"
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5 w-full">
                  <span className={cn("text-xs font-semibold", staplePermission === "approval" ? "text-primary" : "text-foreground")}>
                    {t.kitchenSettings.staplePermissions.approvalTitle}
                  </span>
                  {staplePermission === "approval" && (
                    <div className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {t.kitchenSettings.staplePermissions.approvalDesc}
                </p>
              </button>

              {/* Option 3: admin_only */}
              <button
                type="button"
                disabled={!isAdmin}
                onClick={() => setStaplePermission("admin_only")}
                className={cn(
                  "rounded-xl p-3.5 text-left flex flex-col justify-between transition-all select-none border min-h-[88px]",
                  isAdmin ? "cursor-pointer active:scale-[0.98]" : "cursor-default opacity-85",
                  staplePermission === "admin_only"
                    ? "bg-primary/10 border-primary/40 shadow-xs"
                    : "bg-secondary/30 border-border/50 hover:bg-secondary/60 hover:border-border/80"
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5 w-full">
                  <span className={cn("text-xs font-semibold", staplePermission === "admin_only" ? "text-primary" : "text-foreground")}>
                    {t.kitchenSettings.staplePermissions.adminOnlyTitle}
                  </span>
                  {staplePermission === "admin_only" && (
                    <div className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {t.kitchenSettings.staplePermissions.adminOnlyDesc}
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================
            GROUP 2: GASTZUGANG & SUPERMARKT-LINK
           ======================================================== */}
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left Info */}
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0 mt-0.5 sm:mt-0">
                <Globe className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {t.kitchenSettings.publicSupermarketLink}
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{t.kitchenSettings.activeStatus}</span>
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {t.kitchenSettings.guestLinkSubtext}
                </p>
              </div>
            </div>

            {/* Right Horizontal Action Cluster */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
              {/* Truncated URL pill */}
              <div
                title={publicGuestUrl}
                className="font-mono text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-lg border border-border/50 max-w-[180px] sm:max-w-[200px] truncate select-all"
              >
                {displayGuestUrl}
              </div>

              {/* Copy Link Button */}
              <button
                type="button"
                onClick={handleCopyGuestLink}
                className="h-8 px-3 rounded-lg bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
              >
                {guestCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{t.kitchenSettings.linkCopied}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t.kitchenSettings.copyLinkBtn}</span>
                  </>
                )}
              </button>

              {/* Regenerate Token Button */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleRegenerateGuestToken}
                  disabled={isRegeneratingToken}
                  title={t.kitchenSettings.regenerateBtn}
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw
                    className={cn("w-3.5 h-3.5", isRegeneratingToken && "animate-spin")}
                  />
                </button>
              )}

              {/* Open Link Button */}
              <Link
                href={publicGuestUrl}
                target="_blank"
                title={t.kitchenSettings.openLink}
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors flex items-center justify-center shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ========================================================
            GROUP 3: MITBEWOHNER & EINLADUNGEN
           ======================================================== */}
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
          {/* Subheader Row */}
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-border/60">
            <span className="text-sm font-semibold text-foreground">
              {t.kitchenSettings.membersCount.replace("{count}", String(activeMembers.length))}
            </span>

            {isAdmin && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsInviteDrawerOpen(!isInviteDrawerOpen)}
                className="rounded-xl h-8 px-3 text-xs font-medium border-border/80 text-foreground hover:bg-secondary/60 gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.kitchenSettings.createInvitePrompt}</span>
              </Button>
            )}
          </div>

          {/* Inline Invite Creation Drawer */}
          {isAdmin && isInviteDrawerOpen && (
            <form
              onSubmit={handleCreateInvite}
              className="p-4 bg-secondary/20 border-b border-border/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <Input
                placeholder={t.kitchenSettings.generateInvitePlaceholder}
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                disabled={isCreatingInvite}
                autoFocus
                className="bg-card border-border/70 rounded-xl px-3 text-xs h-9 flex-1"
              />
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isCreatingInvite || !newMemberName.trim()}
                  className="rounded-xl h-9 px-4 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isCreatingInvite ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : null}
                  <span>
                    {isCreatingInvite
                      ? t.kitchenSettings.creatingInvite
                      : t.kitchenSettings.createInviteBtn}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsInviteDrawerOpen(false);
                    setNewMemberName("");
                  }}
                  className="rounded-xl h-9 px-3 text-xs text-muted-foreground hover:text-foreground"
                >
                  {t.kitchenSettings.cancelInvite}
                </Button>
              </div>
            </form>
          )}

          {/* Pending Invite Slot Row */}
          {primaryPendingInvite && (
            <div className="p-3.5 px-4 bg-amber-500/[0.04] border-b border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <span className="text-xs text-foreground truncate">
                  {t.kitchenSettings.reservedFor.split("{name}")[0]}
                  <strong>{primaryPendingInvite.kitchen_display_name}</strong>
                  {t.kitchenSettings.reservedFor.split("{name}")[1] || ""}
                </span>
                <span className="text-[10px] font-mono text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20">
                  {t.kitchenSettings.pendingBadge}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleCopyInviteLink}
                  className="h-7 px-2.5 rounded-lg bg-card border border-border/80 text-foreground hover:bg-secondary/60 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {inviteCopied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span>{t.kitchenSettings.linkCopied}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-muted-foreground" />
                      <span>{t.kitchenSettings.copyInvite}</span>
                    </>
                  )}
                </button>

                <Link
                  href={primaryInviteUrl}
                  target="_blank"
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 flex items-center justify-center transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                </Link>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() =>
                      handleRevokeInvite(
                        primaryPendingInvite.id,
                        primaryPendingInvite.kitchen_display_name
                      )
                    }
                    disabled={revokingInviteId === primaryPendingInvite.id}
                    className="text-xs text-destructive hover:underline px-1 cursor-pointer"
                  >
                    {t.kitchenSettings.revokeInvite}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Roster Rows with Subtle Dividers */}
          <div className="divide-y divide-border/60">
            {activeMembers.map((member) => {
              const isSelf = member.user_id === currentUserId;
              const initial = (member.kitchen_display_name || "?")
                .charAt(0)
                .toUpperCase();

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-3.5 px-4 hover:bg-secondary/20 transition-colors"
                >
                  {/* Left: Avatar + Name + @handle + You Badge */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-8 w-8 rounded-full border border-border/80 shrink-0">
                      <AvatarFallback className="bg-secondary text-xs font-semibold text-foreground">
                        {initial}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-medium text-foreground truncate">
                        {capitalize(member.kitchen_display_name)}
                      </span>
                      {member.username && (
                        <span className="text-xs text-muted-foreground font-mono truncate">
                          @{member.username}
                        </span>
                      )}
                      {isSelf && (
                        <span className="text-[10px] font-mono bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.2 rounded-md">
                          {t.kitchenSettings.youBadge}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Role Badge + Three-dot Context Menu */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={cn(
                        "text-[10px] font-mono uppercase tracking-wider rounded-md px-2 py-0.5",
                        member.role === "ADMIN"
                          ? "bg-primary/10 text-primary border border-primary/20 font-semibold"
                          : "bg-secondary/50 text-muted-foreground border border-border/50"
                      )}
                    >
                      {member.role === "ADMIN"
                        ? t.kitchenSettings.roleAdmin
                        : t.kitchenSettings.roleMember}
                    </span>

                    {/* Three-Dot Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl">
                        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                          {capitalize(member.kitchen_display_name)} (
                          {member.role === "ADMIN"
                            ? t.kitchenSettings.roleAdmin
                            : t.kitchenSettings.roleMember}
                          )
                        </DropdownMenuLabel>
                        {member.joined_at && (
                          <div className="px-2 py-1 text-[11px] text-muted-foreground font-mono">
                            {t.kitchenSettings.joinedDate.replace(
                              "{date}",
                              new Date(member.joined_at).toLocaleDateString(
                                locale === "de" ? "de-DE" : "en-US",
                                { month: "short", day: "numeric", year: "numeric" }
                              )
                            )}
                          </div>
                        )}
                        {isAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={isSelf}
                              onClick={() => {
                                if (isSelf) return;
                                toast.info(
                                  locale === "de"
                                    ? "Rollenwechsel wird in Kürze freigeschaltet."
                                    : "Role transfer feature coming soon."
                                );
                              }}
                              className="text-xs cursor-pointer"
                            >
                              {t.kitchenSettings.changeRole}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={isSelf}
                              onClick={() => {
                                if (isSelf) {
                                  toast.error(t.kitchenSettings.cannotRemoveSelf);
                                  return;
                                }
                                toast.info(
                                  locale === "de"
                                    ? "Mitgliedsentfernung erfolgt über Support oder Selbst-Austritt."
                                    : "Member removal is managed via admin leave actions."
                                );
                              }}
                              className="text-xs text-destructive focus:text-destructive cursor-pointer"
                            >
                              {t.kitchenSettings.removeMember}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================
            GROUP 4: GEFAHRENBEREICH (Danger Zone - Apple Minimalist)
           ======================================================== */}
        <div className="rounded-2xl border border-destructive/20 bg-destructive/[0.02] p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-destructive">
                {t.kitchenSettings.dangerZoneTitle}
              </span>
              <p className="text-xs text-muted-foreground">
                {isAdmin
                  ? t.kitchenSettings.deleteKitchenDesc
                  : t.kitchenSettings.leaveKitchenDesc}
              </p>
            </div>

            {isAdmin ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border border-destructive/20 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shrink-0 min-h-[36px]"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                <span>{t.kitchenSettings.deleteKitchenBtn}</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsLeaveDialogOpen(true)}
                className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border border-destructive/20 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shrink-0 min-h-[36px]"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                <span>{t.kitchenSettings.leaveKitchenBtn}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Subtle Footer Link to GitHub */}
        <div className="pt-2 text-center">
          <a
            href="https://github.com/randakamal/kartli"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
          >
            <span>{t.kitchenSettings.openSourceTitle}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* ========================================================
            MOBILE PERSISTENT SAVE AFFORDANCE (Sticky Bottom Bar)
           ======================================================== */}
        {isAdmin && isDirty && (
          <div className="sm:hidden fixed bottom-6 inset-x-0 z-50 flex justify-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-200 pointer-events-none">
            <div className="pointer-events-auto flex items-center justify-between gap-3 p-3 rounded-2xl bg-card/95 border border-primary/40 backdrop-blur-xl shadow-xl w-full max-w-sm">
              <span className="text-xs font-medium text-foreground truncate flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
                <span>{t.kitchenSettings.unsavedChanges}</span>
              </span>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetForm}
                  disabled={isSavingGeneral}
                  className="rounded-xl text-xs h-9 px-3 text-muted-foreground"
                >
                  {t.common.cancel}
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSaveGeneral()}
                  disabled={isSavingGeneral || !kitchenName.trim()}
                  size="sm"
                  className="rounded-xl font-semibold text-xs h-9 px-4 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  {isSavingGeneral ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>{t.kitchenSettings.saveChanges}</span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Dialog: Leave Kitchen */}
        <AlertDialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
          <AlertDialogContent className="rounded-2xl max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-bold flex items-center gap-2">
                <LogOut className="w-4 h-4 text-destructive" />
                <span>
                  {t.kitchenSettings.leaveConfirmTitle.replace("{name}", kitchenName)}
                </span>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                {t.kitchenSettings.leaveConfirmDesc}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl text-xs">
                {t.common.cancel}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLeaveKitchen}
                disabled={isLeaving}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-xs font-semibold px-4"
              >
                {isLeaving
                  ? t.kitchenSettings.leavingBtn
                  : t.kitchenSettings.leaveConfirmBtn}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirmation Dialog: Delete Kitchen */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="rounded-2xl max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-4 h-4" />
                <span>{t.kitchenSettings.deleteConfirmTitle}</span>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground space-y-2">
                <span>
                  {t.kitchenSettings.deleteConfirmDesc.replace("{name}", kitchenName)}
                </span>
                <span className="block font-semibold text-destructive pt-1">
                  {t.kitchenSettings.deleteConfirmWarning}
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl text-xs">
                {t.common.cancel}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteKitchen}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-xs font-semibold px-4"
              >
                {isDeleting
                  ? t.kitchenSettings.deletingBtn
                  : t.kitchenSettings.deleteConfirmBtn}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
