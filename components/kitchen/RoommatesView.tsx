"use client";

import { useState, useTransition } from "react";
import type { KitchenMemberWithUser, KitchenSpaceType } from "@/types";
import { getSpaceTerminology } from "@/lib/spaceTerminology";
import { addMemberAction, cancelInviteAction, removeKitchenMemberAction } from "@/app/actions/kitchen";
import { CopyButton } from "@/components/CopyButton";
import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  Loader2,
  Mail,
  UserCheck,
  Check,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
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

export interface RoommatesViewProps {
  kitchenId: string;
  kitchenName: string;
  members: KitchenMemberWithUser[];
  currentUserId: string;
  isAdmin: boolean;
  spaceType?: KitchenSpaceType;
  baseUrl: string;
  onMemberAdded?: (member: KitchenMemberWithUser) => void;
  onMemberRemoved?: (memberId: string) => void;
}

export function RoommatesView({
  kitchenId,
  kitchenName,
  members,
  currentUserId,
  isAdmin,
  spaceType = "FLATSHARE",
  baseUrl,
  onMemberAdded,
  onMemberRemoved,
}: RoommatesViewProps) {
  const { t } = useTranslation();
  const [newMemberName, setNewMemberName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<KitchenMemberWithUser | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [, startTransition] = useTransition();

  const terminology = getSpaceTerminology(spaceType);
  const activeMembers = members.filter((m) => m.joined_at !== null);
  const pendingInvites = members.filter((m) => m.joined_at === null && m.invite_token !== null);

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newMemberName.trim();
    if (!name) return;

    setIsAdding(true);
    startTransition(async () => {
      try {
        const result = await addMemberAction(kitchenId, name);
        const newMemberWithUser: KitchenMemberWithUser = {
          ...result.member,
          username: null,
        };
        onMemberAdded?.(newMemberWithUser);
        setNewMemberName("");
        toast.success(`Invite created for "${name}"`);
      } catch (err: any) {
        toast.error(err.message || "Failed to create invite.");
      } finally {
        setIsAdding(false);
      }
    });
  };

  const handleConfirmRemove = () => {
    if (!memberToRemove) return;
    const member = memberToRemove;
    setIsRemoving(true);

    startTransition(async () => {
      try {
        if (member.joined_at === null && member.invite_token) {
          await cancelInviteAction(kitchenId, member.id);
          toast.success(`Revoked invite for ${member.kitchen_display_name}`);
        } else {
          await removeKitchenMemberAction(kitchenId, member.id);
          toast.success(`Removed ${member.kitchen_display_name} from kitchen`);
        }
        onMemberRemoved?.(member.id);
        setMemberToRemove(null);
      } catch (err: any) {
        toast.error(err.message || "Failed to remove member.");
      } finally {
        setIsRemoving(false);
      }
    });
  };

  return (
    <div className="space-y-6 max-w-full">
      {/* Active Members Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 font-sans">
              {t.kitchen.roommates.activeMembers} ({activeMembers.length})
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {activeMembers.map((member) => {
            const isMe = member.user_id === currentUserId;
            const isMemberAdmin = member.role === "ADMIN";

            return (
              <div
                key={member.id}
                className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border/70 hover:border-border transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="w-9 h-9 border border-border/80 shadow-2xs">
                    <AvatarFallback className="text-xs font-bold uppercase bg-secondary text-foreground">
                      {member.kitchen_display_name.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground truncate">
                        {member.kitchen_display_name}
                      </span>
                      {isMe && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-primary/10 text-primary">
                          {t.kitchen.roommates.youBadge}
                        </span>
                      )}
                    </div>
                    {member.username && (
                      <p className="text-xs text-muted-foreground truncate">
                        @{member.username}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                      isMemberAdmin
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        : "bg-secondary text-muted-foreground border-border/60"
                    }`}
                  >
                    {member.role}
                  </span>

                  {isAdmin && !isMe && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setMemberToRemove(member)}
                      className="text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer h-8 w-8"
                      title={t.kitchen.roommates.removeMember}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending Invites Section */}
      {pendingInvites.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-border/60">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 font-sans">
              {t.kitchen.roommates.pendingInvites} ({pendingInvites.length})
            </span>
          </div>

          <div className="space-y-2">
            {pendingInvites.map((invite) => {
              const inviteUrl = `${baseUrl}/invite/${invite.invite_token}`;
              return (
                <div
                  key={invite.id}
                  className="rounded-2xl border border-dashed border-border/80 bg-secondary/20 p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 shrink-0 rounded-full border border-border bg-secondary/60 flex items-center justify-center text-xs text-muted-foreground">
                      <UserPlus className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-foreground truncate block">
                        {invite.kitchen_display_name}
                      </span>
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-medium inline-block mt-0.5 whitespace-nowrap">
                        {t.kitchen.roommates.inviteStatusOpen}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <CopyButton
                      text={inviteUrl}
                      label={t.kitchen.roommates.copyLink}
                      size="sm"
                      variant="ghost"
                      className="h-8 px-3 rounded-xl bg-secondary hover:bg-secondary/80 text-xs font-medium border border-border/60 flex items-center gap-1.5 transition-all"
                    />

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setMemberToRemove(invite)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive flex items-center justify-center rounded-lg transition-colors cursor-pointer"
                        title={t.kitchen.roommates.revokeInvite}
                        aria-label={t.kitchen.roommates.revokeInvite}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Admin Quick Invite Creator */}
      {isAdmin && (
        <div className="pt-2 border-t border-border/60 space-y-2.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 font-sans">
            {t.kitchen.roommates.title}
          </label>
          <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-2">
            <Input
              type="text"
              placeholder={t.kitchen.roommates.inviteInput}
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              disabled={isAdding}
              className="rounded-xl h-10 bg-background border-border text-sm"
            />
            <Button
              type="submit"
              disabled={isAdding || !newMemberName.trim()}
              className="rounded-xl h-10 px-4 font-semibold shrink-0 cursor-pointer w-full sm:w-auto"
            >
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4 mr-1.5" />}
              <span>{t.kitchen.roommates.generateLink}</span>
            </Button>
          </form>
        </div>
      )}

      {/* Removal Confirmation Dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {memberToRemove?.joined_at ? "Remove Roommate" : "Revoke Invitation"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong className="text-foreground font-semibold">
                {memberToRemove?.kitchen_display_name}
              </strong>{" "}
              from {kitchenName}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isRemoving}
              onClick={(e) => {
                e.preventDefault();
                handleConfirmRemove();
              }}
            >
              {isRemoving ? "Processing..." : "Confirm Removal"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default RoommatesView;
