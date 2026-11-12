"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RoommatesView } from "@/components/kitchen/RoommatesView";
import type { KitchenMemberWithUser, KitchenRole, KitchenSpaceType } from "@/types";
import { useTranslation } from "@/lib/i18n";

export interface RoommatesModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  kitchenId: string;
  kitchenName: string;
  members: KitchenMemberWithUser[];
  currentUserId: string;
  isAdmin: boolean;
  creatorId?: string | null;
  spaceType?: KitchenSpaceType;
  baseUrl?: string;
  onMemberAdded?: (member: KitchenMemberWithUser) => void;
  onMemberRemoved?: (memberId: string) => void;
  onRoleChanged?: (memberId: string, newRole: KitchenRole) => void;
}

export function RoommatesModal({
  isOpen,
  onOpenChange,
  kitchenId,
  kitchenName,
  members,
  currentUserId,
  isAdmin,
  creatorId,
  spaceType,
  baseUrl,
  onMemberAdded,
  onMemberRemoved,
  onRoleChanged,
}: RoommatesModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        onDismiss={() => onOpenChange(false)}
        className="sm:max-w-md w-full p-0 gap-0 overflow-hidden flex flex-col"
      >
        <DialogHeader className="p-5 sm:p-6 pb-3 border-b border-border/60 pr-12 text-left">
          <DialogTitle className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
            {kitchenName} {t.kitchen.roommates.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t.kitchen.roommates.subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto touch-pan-y px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] overscroll-contain">
          <RoommatesView
            kitchenId={kitchenId}
            kitchenName={kitchenName}
            members={members}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            creatorId={creatorId}
            spaceType={spaceType}
            baseUrl={baseUrl || ""}
            onMemberAdded={onMemberAdded}
            onMemberRemoved={onMemberRemoved}
            onRoleChanged={onRoleChanged}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default RoommatesModal;
