"use client";

import { useState, useTransition } from "react";
import { cancelInviteAction } from "@/app/actions/kitchen";
import type { KitchenMemberWithUser } from "@/types";
import { CopyButton } from "@/components/CopyButton";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function AdminPendingInvitesList({
  kitchenId,
  invites,
  baseUrl,
}: {
  kitchenId: string;
  invites: KitchenMemberWithUser[];
  baseUrl: string;
}) {
  const [selectedInvite, setSelectedInvite] = useState<KitchenMemberWithUser | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleConfirmCancel = () => {
    if (!selectedInvite) return;

    startTransition(async () => {
      try {
        await cancelInviteAction(kitchenId, selectedInvite.id);
        toast.success(`Revoked invite for ${selectedInvite.kitchen_display_name}`);
        setSelectedInvite(null);
      } catch (err: any) {
        toast.error(err.message || "Failed to cancel invite.");
      }
    });
  };

  if (invites.length === 0) {
    return (
      <p className="text-xs text-zinc-500 py-4 text-center">
        No pending invites. All invited members have claimed their links.
      </p>
    );
  }

  return (
    <>
      <div className="divide-y divide-zinc-800">
        {invites.map((invite) => {
          const inviteUrl = `${baseUrl}/invite/${invite.invite_token}`;
          const initial = (invite.kitchen_display_name || "?").charAt(0).toUpperCase();

          return (
            <div
              key={invite.id}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-800/20 px-2 rounded-xl transition"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 border border-dashed border-zinc-700 bg-zinc-950">
                  <AvatarFallback className="bg-transparent text-xs font-semibold text-zinc-400">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-white text-sm">
                    {invite.kitchen_display_name}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="pending" className="text-[10px] px-2 py-0">
                      Pending Claim
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="h-8 px-2.5 text-xs text-zinc-300 font-mono w-44 sm:w-56 select-all rounded-lg"
                />
                <CopyButton text={inviteUrl} label="Copy Invite Link" size="icon" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedInvite(invite)}
                  title="Cancel and revoke invite"
                  className="h-8 px-2.5 text-xs text-zinc-400 hover:text-accent-primary hover:border-accent-primary/40 rounded-lg border-zinc-800"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:mr-1 text-zinc-500 hover:text-accent-primary" />
                  <span className="hidden sm:inline">Revoke</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal via shadcn AlertDialog */}
      <AlertDialog open={!!selectedInvite} onOpenChange={(open) => !open && setSelectedInvite(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-2xl bg-accent-primary/10 border border-accent-primary/20 text-accent-primary">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <AlertDialogTitle>Cancel Invite</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Are you sure you want to cancel the invite for{" "}
              <strong className="text-white font-semibold">
                {selectedInvite?.kitchen_display_name}
              </strong>
              ? The invite link will be permanently revoked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Keep Invite</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                handleConfirmCancel();
              }}
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isPending ? "Revoking..." : "Revoke Invite"}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

