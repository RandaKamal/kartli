"use client";

import { useState, useTransition } from "react";
import { cancelInviteAction } from "@/app/actions/kitchen";
import type { KitchenMemberWithUser, KitchenSpaceType } from "@/types";
import { getSpaceTerminology } from "@/lib/spaceTerminology";
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
import { useI18n } from "@/context/i18n-context";

export function AdminPendingInvitesList({
  kitchenId,
  invites,
  baseUrl,
  spaceType = "FLATSHARE",
}: {
  kitchenId: string;
  invites: KitchenMemberWithUser[];
  baseUrl: string;
  spaceType?: KitchenSpaceType;
}) {
  const { t, lang } = useI18n();
  const [selectedInvite, setSelectedInvite] = useState<KitchenMemberWithUser | null>(null);
  const [isPending, startTransition] = useTransition();

  const terminology = getSpaceTerminology(spaceType, lang);

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
      <p className="text-xs text-muted-foreground py-4 text-center">
        {t("members.noPending")}
      </p>
    );
  }

  return (
    <>
      <div className="divide-y divide-border">
        {invites.map((invite) => {
          const origin = typeof window !== "undefined" ? window.location.origin : baseUrl;
          const inviteUrl = origin ? `${origin}/invite/${invite.invite_token}` : `/invite/${invite.invite_token}`;
          const initial = (invite.kitchen_display_name || "?").charAt(0).toUpperCase();

          return (
            <div
              key={invite.id}
              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 opacity-60">
                  <AvatarFallback className="bg-muted text-xs font-semibold text-muted-foreground">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground text-sm">
                      {invite.kitchen_display_name}
                    </span>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                      {t("common.pending")}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {t("kitchen.created", {
                      date: new Date(invite.created_at).toLocaleDateString(lang === "de" ? "de-DE" : "en-US"),
                    })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <Input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="h-8 px-2 text-xs text-muted-foreground font-mono w-40 sm:w-56 select-all rounded-lg"
                />
                <CopyButton text={inviteUrl} label={t("common.copy")} size="sm" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSelectedInvite(invite)}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                  title="Cancel invite"
                  aria-label={`Cancel invite for ${invite.kitchen_display_name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Revoke Invite Confirmation Modal */}
      <AlertDialog open={!!selectedInvite} onOpenChange={(open) => !open && setSelectedInvite(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <AlertDialogTitle>{t("members.cancelInvite")}</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Are you sure you want to revoke the invite for{" "}
              <strong className="text-foreground font-semibold">
                {selectedInvite?.kitchen_display_name}
              </strong>
              ? This link will become invalid immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                handleConfirmCancel();
              }}
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isPending ? t("common.deleting") : t("members.cancelInvite")}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
