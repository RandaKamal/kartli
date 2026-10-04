"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  Kitchen,
  KitchenMember,
  KitchenMemberWithUser,
  KitchenSpaceType,
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
import { CopyButton } from "@/components/CopyButton";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Settings,
  Share2,
  Users,
  ExternalLink,
  RefreshCw,
  Trash2,
  LogOut,
  AlertTriangle,
  Loader2,
  Home,
  Heart,
  Briefcase,
  Building2,
  UserPlus,
  Shield,
  Check,
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
  const { t } = useTranslation();
  const isAdmin = membership.role === "ADMIN";

  // General settings state
  const [kitchenName, setKitchenName] = useState(initialKitchen.name);
  const [spaceType, setSpaceType] = useState<KitchenSpaceType>(initialKitchen.space_type || "FLATSHARE");
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);

  // Invites & guest link state
  const [publicViewToken, setPublicViewToken] = useState(initialKitchen.public_view_token);
  const [isRegeneratingToken, setIsRegeneratingToken] = useState(false);
  const [members, setMembers] = useState<KitchenMemberWithUser[]>(initialMembers);
  const [newMemberName, setNewMemberName] = useState("");
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);

  // Danger zone dialog states
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const terminology = getSpaceTerminology(spaceType);

  const publicGuestUrl = `${baseUrl}/kitchen/view/${publicViewToken}`;
  const activeMembers = members.filter((m) => m.joined_at !== null);
  const pendingInvites = members.filter((m) => m.joined_at === null && m.invite_token !== null);
  const primaryPendingInvite = pendingInvites[0];
  const primaryInviteUrl = primaryPendingInvite
    ? `${baseUrl}/invite/${primaryPendingInvite.invite_token}`
    : "";

  // Handle Save General Settings
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const trimmed = kitchenName.trim();
    if (!trimmed) {
      toast.error("Kitchen name cannot be empty.");
      return;
    }

    setIsSavingGeneral(true);
    try {
      await updateKitchenSettingsAction({
        kitchenId: initialKitchen.id,
        name: trimmed,
        spaceType,
      });
      toast.success("Space details updated successfully.");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update space details.");
    } finally {
      setIsSavingGeneral(false);
    }
  };

  // Handle Regenerate Guest Link
  const handleRegenerateGuestToken = async () => {
    if (!isAdmin || isRegeneratingToken) return;

    setIsRegeneratingToken(true);
    try {
      const result = await regeneratePublicViewTokenAction({ kitchenId: initialKitchen.id });
      setPublicViewToken(result.newToken);
      toast.success("Public guest link regenerated.");
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
      toast.error("Please enter a member display name.");
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
      toast.success(`Invite generated for ${trimmed}`);
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
      toast.success(`Revoked invite for ${name}`);
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
      toast.success(`You have left ${kitchenName}`);
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
      toast.success(`${kitchenName} was permanently deleted.`);
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete kitchen.");
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full flex flex-col bg-background text-foreground selection:bg-primary/20">
      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 pt-8 sm:pt-12 pb-24 space-y-6 sm:space-y-8 flex-1">
        {/* Dedicated back-navigation row with mb-8 */}
        <div className="mb-6 sm:mb-8">
          <Link
            href={`/kitchen/${initialKitchen.id}`}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to {kitchenName}</span>
          </Link>
        </div>

      {/* Header with Kitchen Settings title & description */}
      <div className="space-y-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {t.kitchenSettings.title}
          </h1>
          <Badge
            variant={isAdmin ? "default" : "secondary"}
            className="text-[11px] font-mono uppercase tracking-wider"
          >
            {isAdmin ? t.kitchenSettings.adminViewBadge : t.kitchen.header.member}
          </Badge>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {t.kitchenSettings.subtitle.replace("{name}", kitchenName)}
        </p>
      </div>

      {/* Distinct Card 1: General Space Details */}
      <Card className="p-4 sm:p-6 rounded-2xl border border-border/80 bg-card shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">
                {t.kitchenSettings.generalSectionTitle}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t.kitchenSettings.generalSectionSub}
              </p>
            </div>
          </div>

          {isAdmin && (
            <Button
              type="submit"
              form="general-space-form"
              disabled={isSavingGeneral || !kitchenName.trim()}
              size="sm"
              className="rounded-xl font-semibold text-xs h-8.5 px-3.5 w-full sm:w-auto"
            >
              {isSavingGeneral ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  <span>{t.kitchenSettings.saving}</span>
                </>
              ) : (
                t.kitchenSettings.saveChanges
              )}
            </Button>
          )}
        </div>

        <form id="general-space-form" onSubmit={handleSaveGeneral} className="space-y-5">
          {/* Field: Kitchen Name */}
          <div className="space-y-1.5">
            <Label htmlFor="kitchen-name-input" className="text-xs font-semibold text-foreground">
              {t.kitchenSettings.kitchenNameLabel}
            </Label>
            <Input
              id="kitchen-name-input"
              value={kitchenName}
              onChange={(e) => setKitchenName(e.target.value)}
              disabled={!isAdmin || isSavingGeneral}
              required
              maxLength={255}
              placeholder="e.g. Baker Street Kitchen"
              className="rounded-xl bg-secondary/30 border-input text-foreground text-xs sm:text-sm h-10"
            />
            <span className="text-[11px] text-muted-foreground block">
              {isAdmin
                ? t.kitchenSettings.kitchenNameHelper
                : "The shared kitchen display name (managed by space admins)."}
            </span>
          </div>

          {/* Field: Space Type Preset */}
          <div className="space-y-2 pt-1">
            <div className="space-y-0.5">
              <Label className="text-xs font-semibold text-foreground">
                {t.kitchenSettings.spaceTypeTitle}
              </Label>
              <p className="text-[11px] text-muted-foreground">
                {t.kitchenSettings.spaceTypeHelper}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              {/* Option 1: Flatshare WG */}
              <button
                type="button"
                disabled={!isAdmin}
                onClick={() => setSpaceType("FLATSHARE")}
                className={`p-3 rounded-xl flex flex-col gap-1 border transition-all text-left select-none ${
                  isAdmin ? "cursor-pointer active:scale-[0.98]" : "cursor-default opacity-85"
                } ${
                  spaceType === "FLATSHARE"
                    ? "border-primary/50 bg-primary/[0.06] ring-1 ring-primary/30 shadow-xs"
                    : "border-border/60 bg-secondary/30 hover:bg-secondary/50"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Home
                    className={`w-3.5 h-3.5 transition-colors ${
                      spaceType === "FLATSHARE" ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <span className="text-xs text-foreground font-semibold leading-none">
                    {t.kitchenSettings.types.flatshare}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground font-normal leading-tight">
                  {t.kitchenSettings.types.flatshareSub}
                </span>
              </button>

              {/* Option 2: Family */}
              <button
                type="button"
                disabled={!isAdmin}
                onClick={() => setSpaceType("FAMILY")}
                className={`p-3 rounded-xl flex flex-col gap-1 border transition-all text-left select-none ${
                  isAdmin ? "cursor-pointer active:scale-[0.98]" : "cursor-default opacity-85"
                } ${
                  spaceType === "FAMILY"
                    ? "border-primary/50 bg-primary/[0.06] ring-1 ring-primary/30 shadow-xs"
                    : "border-border/60 bg-secondary/30 hover:bg-secondary/50"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Heart
                    className={`w-3.5 h-3.5 transition-colors ${
                      spaceType === "FAMILY" ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <span className="text-xs text-foreground font-semibold leading-none">
                    {t.kitchenSettings.types.family}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground font-normal leading-tight">
                  {t.kitchenSettings.types.familySub}
                </span>
              </button>

              {/* Option 3: Office */}
              <button
                type="button"
                disabled={!isAdmin}
                onClick={() => setSpaceType("OFFICE")}
                className={`p-3 rounded-xl flex flex-col gap-1 border transition-all text-left select-none ${
                  isAdmin ? "cursor-pointer active:scale-[0.98]" : "cursor-default opacity-85"
                } ${
                  spaceType === "OFFICE"
                    ? "border-primary/50 bg-primary/[0.06] ring-1 ring-primary/30 shadow-xs"
                    : "border-border/60 bg-secondary/30 hover:bg-secondary/50"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Briefcase
                    className={`w-3.5 h-3.5 transition-colors ${
                      spaceType === "OFFICE" ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <span className="text-xs text-foreground font-semibold leading-none">
                    {t.kitchenSettings.types.office}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground font-normal leading-tight">
                  {t.kitchenSettings.types.officeSub}
                </span>
              </button>

              {/* Option 4: Neutral */}
              <button
                type="button"
                disabled={!isAdmin}
                onClick={() => setSpaceType("NEUTRAL")}
                className={`p-3 rounded-xl flex flex-col gap-1 border transition-all text-left select-none ${
                  isAdmin ? "cursor-pointer active:scale-[0.98]" : "cursor-default opacity-85"
                } ${
                  spaceType === "NEUTRAL"
                    ? "border-primary/50 bg-primary/[0.06] ring-1 ring-primary/30 shadow-xs"
                    : "border-border/60 bg-secondary/30 hover:bg-secondary/50"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Building2
                    className={`w-3.5 h-3.5 transition-colors ${
                      spaceType === "NEUTRAL" ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <span className="text-xs text-foreground font-semibold leading-none">
                    {t.kitchenSettings.types.neutral}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground font-normal leading-tight">
                  {t.kitchenSettings.types.neutralSub}
                </span>
              </button>
            </div>
          </div>
        </form>
      </Card>

      {/* Distinct Card 2: Invites & Access */}
      <Card className="p-4 sm:p-6 rounded-2xl border border-border/80 bg-card shadow-sm space-y-6">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border/60">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground tracking-tight">
              {t.kitchenSettings.guestAccessTitle}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t.kitchenSettings.guestAccessSub}
            </p>
          </div>
        </div>

        {/* Section A: Public Guest / Supermarket link */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <span>{t.kitchenSettings.guestLinkTitle}</span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {t.kitchenSettings.readOnlyBadge}
                </Badge>
              </Label>
              <p className="text-[11px] text-muted-foreground">
                {t.kitchenSettings.guestLinkHelper}
              </p>
            </div>

            {isAdmin && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRegenerateGuestToken}
                disabled={isRegeneratingToken}
                className="rounded-xl text-xs h-8 border-border text-muted-foreground hover:text-foreground hover:bg-muted self-start sm:self-auto"
                title="Invalidates previous guest links"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 mr-1.5 ${isRegeneratingToken ? "animate-spin" : ""}`}
                />
                <span>{isRegeneratingToken ? "Regenerating..." : t.kitchenSettings.regenerateBtn}</span>
              </Button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Input
              type="text"
              readOnly
              value={publicGuestUrl}
              className="h-10 px-3 text-xs font-mono select-all rounded-xl bg-secondary/30 border-input text-foreground truncate min-w-0"
            />
            <div className="flex items-center gap-2 shrink-0">
              <CopyButton
                text={publicGuestUrl}
                label={t.kitchenSettings.copyLinkBtn}
                size="sm"
                variant="secondary"
                className="flex-1 sm:flex-none h-10 px-3 rounded-xl font-medium text-xs"
              />
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                title="Open guest view in new tab"
              >
                <Link href={publicGuestUrl} target="_blank">
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <Separator className="bg-border/60" />

        {/* Section B: Member Invite Links */}
        <div className="space-y-4">
          <div className="space-y-0.5">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span>{t.kitchenSettings.memberInviteTitle}</span>
              <Badge variant="secondary" className="text-[10px]">
                {pendingInvites.length} {t.kitchenSettings.pendingBadge}
              </Badge>
            </Label>
            <p className="text-[11px] text-muted-foreground">
              {t.kitchenSettings.memberInviteHelper}
            </p>
          </div>

          {primaryPendingInvite ? (
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Input
                  type="text"
                  readOnly
                  value={primaryInviteUrl}
                  className="h-10 px-3 text-xs font-mono select-all rounded-xl bg-secondary/30 border-input text-foreground truncate min-w-0"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <CopyButton
                    text={primaryInviteUrl}
                    label="Copy Invite"
                    size="sm"
                    variant="default"
                    className="flex-1 sm:flex-none h-10 px-3 rounded-xl font-semibold text-xs"
                  />
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                    title="Open invite link"
                  >
                    <Link href={primaryInviteUrl} target="_blank">
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                <span>
                  Reserved for: <strong className="text-foreground">{primaryPendingInvite.kitchen_display_name}</strong>
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleRevokeInvite(primaryPendingInvite.id, primaryPendingInvite.kitchen_display_name)}
                    disabled={revokingInviteId === primaryPendingInvite.id}
                    className="text-destructive hover:underline text-[11px] cursor-pointer"
                  >
                    Revoke Link
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 text-xs text-muted-foreground">
              {t.kitchenSettings.noPendingInvites}
            </div>
          )}

          {/* Admin Invite Generator */}
          {isAdmin && (
            <form onSubmit={handleCreateInvite} className="pt-2">
              <Label htmlFor="new-invite-name" className="text-xs font-medium text-foreground block mb-1.5">
                Generate New Invitation Link
              </Label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Input
                  id="new-invite-name"
                  placeholder="e.g. Alex (or Roommate Nickname)"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  disabled={isCreatingInvite}
                  className="h-10 rounded-xl bg-secondary/30 text-xs text-foreground"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isCreatingInvite || !newMemberName.trim()}
                  className="rounded-xl h-10 px-3.5 font-semibold text-xs shrink-0 w-full sm:w-auto"
                >
                  {isCreatingInvite ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : (
                    <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  <span>Create Link</span>
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>

      {/* Distinct Card 3: Space Members List Summary */}
      <Card className="p-4 sm:p-6 rounded-2xl border border-border/80 bg-card shadow-sm space-y-5">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">
                Space Members
              </h2>
              <p className="text-xs text-muted-foreground">
                Active member roster registered in this kitchen space.
              </p>
            </div>
          </div>

          <Badge variant="secondary" className="font-mono text-xs">
            {activeMembers.length} {activeMembers.length === 1 ? "Member" : "Members"}
          </Badge>
        </div>

        <div className="space-y-2.5">
          {activeMembers.map((member) => {
            const isSelf = member.user_id === currentUserId;
            const initial = (member.kitchen_display_name || "?").charAt(0).toUpperCase();

            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/60 hover:bg-secondary/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9 border border-border/80 shrink-0">
                    <AvatarFallback className="bg-secondary text-xs font-bold text-foreground">
                      {initial}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {capitalize(member.kitchen_display_name)}
                      </span>
                      {isSelf && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
                          You
                        </Badge>
                      )}
                    </div>
                    {member.username && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        @{member.username}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant={member.role === "ADMIN" ? "default" : "secondary"}
                    className="text-[10px] font-mono uppercase tracking-wider"
                  >
                    {member.role === "ADMIN" ? "Admin" : "Member"}
                  </Badge>

                  {member.joined_at && (
                    <span className="text-[11px] text-muted-foreground hidden sm:inline-block">
                      Joined {new Date(member.joined_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Distinct Card 4: Danger Zone */}
      <Card className="p-4 sm:p-6 rounded-2xl border border-destructive/30 bg-destructive/5 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Danger Zone</h2>
            <p className="text-xs text-muted-foreground">
              Irreversible actions related to your kitchen membership and data.
            </p>
          </div>
        </div>

        <Separator className="bg-destructive/20" />

        {/* Action: Leave Kitchen (For regular members) */}
        {!isAdmin && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-foreground">Leave Kitchen</span>
              <p className="text-[11px] text-muted-foreground">
                Remove your membership from this kitchen space and forfeit grocery list access.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsLeaveDialogOpen(true)}
              className="border-destructive/40 text-destructive hover:bg-destructive/10 rounded-xl font-medium text-xs shrink-0"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              <span>Leave Kitchen</span>
            </Button>
          </div>
        )}

        {/* Action: Delete Kitchen (For admins) */}
        {isAdmin && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-destructive">Delete Entire Kitchen</span>
              <p className="text-[11px] text-muted-foreground">
                Permanently delete this kitchen and wipe all pantry inventory, shopping lists, receipts, and memberships.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="rounded-xl font-semibold text-xs shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              <span>Delete Kitchen</span>
            </Button>
          </div>
        )}
      </Card>

      {/* Bottom Anchor: GitHub Repository Link (Requirement 5) */}
      <a
        href="https://github.com/randakamal/kartli"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center justify-between p-4 rounded-2xl border border-border/80 bg-card hover:bg-muted/40 hover:border-border transition-all duration-200 shadow-2xs cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-muted/60 border border-border/60 text-muted-foreground group-hover:text-foreground transition-colors">
            <svg
              className="w-4 h-4 fill-current"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
          </div>
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5 font-mono">
              Open Source culinary operating system
            </span>
            <p className="text-[11px] text-muted-foreground">
              kartli is free, transparent, and community-driven on GitHub.
            </p>
          </div>
        </div>

        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
      </a>

      {/* Confirmation Dialog: Leave Kitchen */}
      <AlertDialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold flex items-center gap-2">
              <LogOut className="w-4 h-4 text-destructive" />
              <span>Leave {kitchenName}?</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to leave this kitchen? You will immediately lose access to shared grocery lists and pantry inventories. You will need a new invite link from an admin to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveKitchen}
              disabled={isLeaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-xs font-semibold"
            >
              {isLeaving ? "Leaving..." : "Yes, Leave Kitchen"}
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
              <span>Permanently Delete Kitchen?</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground space-y-2">
              <span>
                This will irreversibly delete <strong className="text-foreground">{kitchenName}</strong> along with all associated inventory items, shopping records, purchase receipts, and member memberships.
              </span>
              <span className="block font-semibold text-destructive pt-1">
                This action cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteKitchen}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-xs font-semibold"
            >
              {isDeleting ? "Deleting..." : "Permanently Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
