"use client";

import { useState, useTransition } from "react";
import { removeKitchenMemberAction } from "@/app/actions/kitchen";
import type { KitchenMemberWithUser, KitchenSpaceType } from "@/types";
import { getSpaceTerminology } from "@/lib/spaceTerminology";
import { UserMinus, AlertTriangle, Loader2 } from "lucide-react";
import { capitalize } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";

export function AdminActiveMembersList({
  kitchenId,
  members,
  currentUserId,
  spaceType = "FLATSHARE",
}: {
  kitchenId: string;
  members: KitchenMemberWithUser[];
  currentUserId: string;
  spaceType?: KitchenSpaceType;
}) {
  const [selectedMember, setSelectedMember] = useState<KitchenMemberWithUser | null>(null);
  const [isPending, startTransition] = useTransition();

  const terminology = getSpaceTerminology(spaceType);

  const handleConfirmRemove = () => {
    if (!selectedMember) return;

    startTransition(async () => {
      try {
        await removeKitchenMemberAction(kitchenId, selectedMember.id);
        toast.success(`Removed ${selectedMember.kitchen_display_name} from kitchen`);
        setSelectedMember(null);
      } catch (err: any) {
        toast.error(err.message || "Failed to remove member.");
      }
    });
  };

  if (members.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2 text-center sm:text-left">
        No active {terminology.memberLabelPlural.toLowerCase()} found.
      </p>
    );
  }

  return (
    <>
      {/* Mobile Card List View (< md): Do not render table on small screens */}
      <div className="space-y-2 md:hidden">
        {members.map((member) => {
          const isSelf = member.user_id === currentUserId;
          const isOtherAdmin = member.role === "ADMIN" && !isSelf;
          const canRemove = !isSelf && !isOtherAdmin;
          const initial = (member.kitchen_display_name || "?").charAt(0).toUpperCase();

          return (
            <div
              key={member.id}
              className="p-3 rounded-2xl bg-secondary/20 border border-border/60 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback
                    className={
                      isSelf
                        ? "bg-primary/15 text-primary border border-primary/25 font-semibold text-xs"
                        : "bg-secondary border border-border text-foreground font-medium text-xs"
                    }
                  >
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-foreground text-sm truncate">
                      {capitalize(member.kitchen_display_name)}
                    </span>
                    {isSelf && (
                      <span className="text-[11px] text-primary/80 font-medium shrink-0">
                        (You)
                      </span>
                    )}
                    {member.role === "ADMIN" ? (
                      <span className="bg-primary/15 text-primary border border-primary/30 text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0">
                        ADMIN
                      </span>
                    ) : (
                      <span className="bg-secondary text-muted-foreground border border-border text-[10px] font-medium px-1.5 py-0.5 rounded-md shrink-0">
                        {member.role}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    @{member.username || "—"}
                  </p>
                </div>
              </div>

              {canRemove ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedMember(member)}
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 rounded-lg transition-colors border-border/70"
                  title={`Remove ${member.kitchen_display_name}`}
                  aria-label={`Remove ${member.kitchen_display_name}`}
                >
                  <UserMinus className="w-4 h-4" />
                </Button>
              ) : isSelf ? (
                <span className="text-[11px] text-muted-foreground font-mono italic shrink-0 px-1">
                  Primary
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Desktop Table View (>= md) */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-border/50">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/30 border-b border-border/60">
              <TableHead className="font-semibold text-foreground py-3">{terminology.memberLabel}</TableHead>
              <TableHead className="font-semibold text-foreground py-3">Username</TableHead>
              <TableHead className="font-semibold text-foreground py-3">Role</TableHead>
              <TableHead className="font-semibold text-foreground py-3">Joined Date</TableHead>
              <TableHead className="text-right font-semibold text-foreground py-3">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const isSelf = member.user_id === currentUserId;
              const isOtherAdmin = member.role === "ADMIN" && !isSelf;
              const canRemove = !isSelf && !isOtherAdmin;
              const initial = (member.kitchen_display_name || "?").charAt(0).toUpperCase();

              return (
                <TableRow
                  key={member.id}
                  className="hover:bg-muted/40 transition-colors border-b border-border/40 last:border-0"
                >
                  <TableCell className="font-medium text-foreground py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback
                          className={
                            isSelf
                              ? "bg-primary/15 text-primary border border-primary/25 font-semibold text-xs"
                              : "bg-secondary border border-border text-foreground font-medium text-xs"
                          }
                        >
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center">
                        <span>{capitalize(member.kitchen_display_name)}</span>
                        {isSelf && (
                          <span className="ml-2 text-xs text-primary/70 font-medium">(You)</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs py-3">
                    @{member.username || "—"}
                  </TableCell>
                  <TableCell className="py-3">
                    {member.role === "ADMIN" ? (
                      <span className="bg-primary/15 text-primary border border-primary/30 text-[10px] font-bold px-2 py-0.5 rounded-md inline-block">
                        ADMIN
                      </span>
                    ) : (
                      <span className="bg-secondary text-muted-foreground border border-border text-[10px] font-medium px-2 py-0.5 rounded-md inline-block">
                        {member.role}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono py-3">
                    {member.joined_at
                      ? new Date(member.joined_at).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right py-3">
                    {canRemove ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedMember(member)}
                        className="group h-8 px-2.5 text-xs text-muted-foreground hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-colors rounded-lg border-border"
                      >
                        <UserMinus className="w-3.5 h-3.5 mr-1 text-muted-foreground group-hover:text-red-400 transition-colors" />
                        <span>Remove</span>
                      </Button>
                    ) : isSelf ? (
                      <span className="text-xs text-muted-foreground font-mono italic">Primary</span>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Confirmation Modal via shadcn AlertDialog */}
      <AlertDialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <AlertDialogTitle>Remove {terminology.memberLabel}</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong className="text-foreground font-semibold">
                {selectedMember?.kitchen_display_name}
              </strong>{" "}
              {selectedMember?.username && (
                <span className="font-mono text-muted-foreground">
                  (@{selectedMember.username})
                </span>
              )}{" "}
              from this kitchen? They will lose access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                handleConfirmRemove();
              }}
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isPending ? "Removing..." : `Remove ${terminology.memberLabel}`}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
