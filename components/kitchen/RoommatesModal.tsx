"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { RoommatesView } from "@/components/kitchen/RoommatesView";
import type { KitchenMemberWithUser, KitchenSpaceType } from "@/types";
import { useTranslation } from "@/lib/i18n";

export interface RoommatesModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  kitchenId: string;
  kitchenName: string;
  members: KitchenMemberWithUser[];
  currentUserId: string;
  isAdmin: boolean;
  spaceType?: KitchenSpaceType;
  baseUrl?: string;
  onMemberAdded?: (member: KitchenMemberWithUser) => void;
  onMemberRemoved?: (memberId: string) => void;
}

export function RoommatesModal({
  isOpen,
  onOpenChange,
  kitchenId,
  kitchenName,
  members,
  currentUserId,
  isAdmin,
  spaceType,
  baseUrl,
  onMemberAdded,
  onMemberRemoved,
}: RoommatesModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        onDismiss={() => onOpenChange(false)}
        className="sm:max-w-md w-full p-0 gap-0 overflow-hidden flex flex-col"
      >
        <DialogHeader className="p-5 sm:p-6 pb-3 border-b border-border/60 pr-12 text-left">
          <DialogTitle className="text-lg sm:text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span>{kitchenName} {t.kitchen.roommates.title}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t.kitchen.roommates.subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 pb-8 pt-3 overscroll-contain">
          <RoommatesView
            kitchenId={kitchenId}
            kitchenName={kitchenName}
            members={members}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            spaceType={spaceType}
            baseUrl={baseUrl || ""}
            onMemberAdded={onMemberAdded}
            onMemberRemoved={onMemberRemoved}
          />
        </div>

        <div className="sm:hidden p-3 border-t border-border/60 bg-muted/20 shrink-0">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            className="w-full h-10 rounded-xl text-xs font-semibold cursor-pointer"
          >
            {t.common.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default RoommatesModal;
