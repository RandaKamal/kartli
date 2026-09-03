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
import { Badge } from "@/components/ui/badge";
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

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{terminology.memberLabel}</TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const isSelf = member.user_id === currentUserId;
            const isOtherAdmin = member.role === "ADMIN" && !isSelf;
            const canRemove = !isSelf && !isOtherAdmin;
            const initial = (member.kitchen_display_name || "?").charAt(0).toUpperCase();

            return (
              <TableRow key={member.id}>
                <TableCell className="font-medium text-foreground">
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
                <TableCell className="text-muted-foreground font-mono text-xs">
                  @{member.username || "—"}
                </TableCell>
                <TableCell>
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
                <TableCell className="text-xs text-muted-foreground font-mono">
                  {member.joined_at
                    ? new Date(member.joined_at).toLocaleDateString()
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
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
