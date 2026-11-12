"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  Kitchen,
  KitchenMember,
  KitchenSpaceType,
  StaplePermission,
} from "@/types";
import { getSpaceTerminology } from "@/lib/spaceTerminology";
import {
  updateKitchenSettingsAction,
  regeneratePublicViewTokenAction,
  leaveKitchenAction,
  deleteKitchenAction,
} from "@/app/actions/kitchen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  CheckCircle2,
  Copy,
  ExternalLink,
  RefreshCw,
  Globe,
  Loader2,
  Home,
  Heart,
  Briefcase,
  Layers,
  Trash2,
  LogOut,
  AlertTriangle,
  RotateCcw,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

interface KitchenSettingsViewProps {
  kitchen: Kitchen;
  membership: KitchenMember;
  baseUrl: string;
}

export function KitchenSettingsView({
  kitchen: initialKitchen,
  membership,
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

  // Copy states
  const [guestCopied, setGuestCopied] = useState(false);

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
        <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs">
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
              className="bg-background border border-border/70 rounded-lg px-3 py-1.5 text-sm w-full sm:w-64 text-foreground h-9"
            />
          </div>

          {/* Row 2: Divider */}
          <div className="border-t border-border/60" />

          {/* Row 3: Art der Gemeinschaft */}
          <div className="p-4 sm:p-5 space-y-2.5">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold text-foreground">
                {t.kitchenSettings.typeRowLabel}
              </Label>
            </div>

            {/* 4-Segment Card Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
              {/* Flatshare WG */}
              <button
                type="button"
                disabled={!isAdmin}
                onClick={() => setSpaceType("FLATSHARE")}
                className={cn(
                  "rounded-lg py-2 px-2 flex flex-col items-center justify-center gap-1.5 text-center transition-colors select-none border min-h-[58px]",
                  isAdmin ? "cursor-pointer" : "cursor-default opacity-85",
                  spaceType === "FLATSHARE"
                    ? "border-foreground/50 bg-secondary text-foreground font-semibold shadow-2xs"
                    : "border-border/60 bg-secondary/30 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                <Home className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs font-medium leading-tight text-center">
                  {t.kitchenSettings.types.flatshare}
                </span>
              </button>

              {/* Familie */}
              <button
                type="button"
                disabled={!isAdmin}
                onClick={() => setSpaceType("FAMILY")}
                className={cn(
                  "rounded-lg py-2 px-2 flex flex-col items-center justify-center gap-1.5 text-center transition-colors select-none border min-h-[58px]",
                  isAdmin ? "cursor-pointer" : "cursor-default opacity-85",
                  spaceType === "FAMILY"
                    ? "border-foreground/50 bg-secondary text-foreground font-semibold shadow-2xs"
                    : "border-border/60 bg-secondary/30 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                <Heart className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs font-medium leading-tight text-center">
                  {t.kitchenSettings.types.family}
                </span>
              </button>

              {/* Büro */}
              <button
                type="button"
                disabled={!isAdmin}
                onClick={() => setSpaceType("OFFICE")}
                className={cn(
                  "rounded-lg py-2 px-2 flex flex-col items-center justify-center gap-1.5 text-center transition-colors select-none border min-h-[58px]",
                  isAdmin ? "cursor-pointer" : "cursor-default opacity-85",
                  spaceType === "OFFICE"
                    ? "border-foreground/50 bg-secondary text-foreground font-semibold shadow-2xs"
                    : "border-border/60 bg-secondary/30 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                <Briefcase className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs font-medium leading-tight text-center">
                  {t.kitchenSettings.types.office}
                </span>
              </button>

              {/* Neutral */}
              <button
                type="button"
                disabled={!isAdmin}
                onClick={() => setSpaceType("NEUTRAL")}
                className={cn(
                  "rounded-lg py-2 px-2 flex flex-col items-center justify-center gap-1.5 text-center transition-colors select-none border min-h-[58px]",
                  isAdmin ? "cursor-pointer" : "cursor-default opacity-85",
                  spaceType === "NEUTRAL"
                    ? "border-foreground/50 bg-secondary text-foreground font-semibold shadow-2xs"
                    : "border-border/60 bg-secondary/30 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs font-medium leading-tight text-center">
                  {t.kitchenSettings.types.neutral}
                </span>
              </button>
            </div>
          </div>

          {/* Row 4: Divider */}
          <div className="border-t border-border/60" />

          {/* Row 5: Berechtigungen für WG-Basics */}
          <div className="p-4 sm:p-5 space-y-2.5">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold text-foreground">
                {t.kitchenSettings.staplePermissions.title}
              </Label>
            </div>

            {/* 3-Way Segmented Policy Selector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-0.5">
              {/* Option 1: open */}
              <button
                type="button"
                disabled={!isAdmin}
                onClick={() => setStaplePermission("open")}
                className={cn(
                  "rounded-lg p-3 text-left flex flex-col justify-between transition-colors select-none border min-h-[72px]",
                  isAdmin ? "cursor-pointer" : "cursor-default opacity-85",
                  staplePermission === "open"
                    ? "border-foreground/50 bg-secondary shadow-2xs"
                    : "border-border/60 bg-secondary/30 hover:bg-secondary/60"
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1 w-full">
                  <span className="text-xs font-semibold text-foreground">
                    {t.kitchenSettings.staplePermissions.openTitle}
                  </span>
                  {staplePermission === "open" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-border shrink-0" />
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
                  "rounded-lg p-3 text-left flex flex-col justify-between transition-colors select-none border min-h-[72px]",
                  isAdmin ? "cursor-pointer" : "cursor-default opacity-85",
                  staplePermission === "approval"
                    ? "border-foreground/50 bg-secondary shadow-2xs"
                    : "border-border/60 bg-secondary/30 hover:bg-secondary/60"
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1 w-full">
                  <span className="text-xs font-semibold text-foreground">
                    {t.kitchenSettings.staplePermissions.approvalTitle}
                  </span>
                  {staplePermission === "approval" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-border shrink-0" />
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
                  "rounded-lg p-3 text-left flex flex-col justify-between transition-colors select-none border min-h-[72px]",
                  isAdmin ? "cursor-pointer" : "cursor-default opacity-85",
                  staplePermission === "admin_only"
                    ? "border-foreground/50 bg-secondary shadow-2xs"
                    : "border-border/60 bg-secondary/30 hover:bg-secondary/60"
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1 w-full">
                  <span className="text-xs font-semibold text-foreground">
                    {t.kitchenSettings.staplePermissions.adminOnlyTitle}
                  </span>
                  {staplePermission === "admin_only" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-border shrink-0" />
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
        <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left Info */}
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-secondary text-foreground border border-border/70 shrink-0 mt-0.5 sm:mt-0">
                <Globe className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {t.kitchenSettings.publicSupermarketLink}
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-secondary text-muted-foreground border border-border/60 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
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
                className="font-mono text-xs text-muted-foreground bg-secondary/50 px-2.5 py-1.5 rounded-lg border border-border/60 max-w-[180px] sm:max-w-[200px] truncate select-all"
              >
                {displayGuestUrl}
              </div>

              {/* Copy Link Button */}
              <button
                type="button"
                onClick={handleCopyGuestLink}
                className="h-8 px-2.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border/70 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
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
                  className="h-8 w-8 rounded-lg border border-border/70 bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50"
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
                className="h-8 w-8 rounded-lg border border-border/70 bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center justify-center shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ========================================================
            GROUP 4: GEFAHRENBEREICH (Danger Zone)
           ======================================================== */}
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.03] p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-rose-500 dark:text-rose-400">
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
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="rounded-lg h-8 px-3 text-xs font-medium shrink-0 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                <span>{t.kitchenSettings.deleteKitchenBtn}</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setIsLeaveDialogOpen(true)}
                className="rounded-lg h-8 px-3 text-xs font-medium shrink-0 cursor-pointer"
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
            <div className="pointer-events-auto flex items-center justify-between gap-3 p-3 rounded-2xl bg-card/90 border border-white/[0.1] backdrop-blur-2xl shadow-xl w-full max-w-sm">
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
          <AlertDialogContent className="rounded-xl max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-semibold">
                {t.kitchenSettings.leaveConfirmTitle.replace("{name}", kitchenName)}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                {t.kitchenSettings.leaveConfirmDesc}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-lg text-xs">
                {t.common.cancel}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLeaveKitchen}
                disabled={isLeaving}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg text-xs font-semibold px-4"
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
          <AlertDialogContent className="rounded-xl max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-semibold text-destructive">
                {t.kitchenSettings.deleteConfirmTitle}
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
              <AlertDialogCancel className="rounded-lg text-xs">
                {t.common.cancel}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteKitchen}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg text-xs font-semibold px-4"
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
