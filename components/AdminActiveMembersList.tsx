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
import { useI18n } from "@/context/i18n-context";

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
  const { t, lang } = useI18n();
  const [selectedMember, setSelectedMember] = useState<KitchenMemberWithUser | null>(null);
  const [isPending, startTransition] = useTransition();

  const terminology = getSpaceTerminology(spaceType, lang);

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
            <TableHead>{t("common.username")}</TableHead>
            <TableHead>{t("common.role")}</TableHead>
            <TableHead>{t("common.date")}</TableHead>
            <TableHead className="text-right">{t("common.actions")}</TableHead>
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
                      <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center">
                      <span>{capitalize(member.kitchen_display_name)}</span>
                      {isSelf && (
                        <span className="ml-2 text-xs text-muted-foreground font-normal">({t("common.you")})</span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  @{member.username || "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className="text-[11px] font-medium"
                  >
                    {member.role === "ADMIN" ? t("common.admin") : t("common.member")}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono">
                  {member.joined_at
                    ? new Date(member.joined_at).toLocaleDateString(lang === "de" ? "de-DE" : "en-US")
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {canRemove ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedMember(member)}
                      className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-lg border-border"
                    >
                      <UserMinus className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                      <span>{t("common.delete")}</span>
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
              <AlertDialogTitle>{t("members.removeTitle")}</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              {t("members.removeConfirm", {
                name: selectedMember?.kitchen_display_name || "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                handleConfirmRemove();
              }}
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isPending ? t("common.deleting") : t("members.removeMember")}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
