"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminRefundsSection } from "@/components/AdminRefundsSection";
import type { KitchenMemberWithUser, KitchenSpaceType, CheckoutWithDetails } from "@/types";
import { useTranslation } from "@/lib/i18n";

export interface ExpenseLedgerModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  kitchenId: string;
  spaceType?: KitchenSpaceType;
  members: KitchenMemberWithUser[];
  onCheckoutUpdated?: (checkout: Partial<CheckoutWithDetails> & { id: string }) => void;
}

/**
 * Admin-only settlements surface. Personal purchase history lives in
 * Pulse → Feed, so this modal only handles household refunds.
 */
export function ExpenseLedgerModal({
  isOpen,
  onOpenChange,
  kitchenId,
  spaceType,
  members,
  onCheckoutUpdated,
}: ExpenseLedgerModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        onDismiss={() => onOpenChange(false)}
        className="sm:max-w-3xl w-full p-0 gap-0 overflow-hidden flex flex-col rounded-xl border border-border bg-card shadow-2xl"
      >
        <DialogHeader className="px-5 py-4 sm:px-6 border-b border-border pr-12 text-left">
          <DialogTitle className="text-base font-semibold text-foreground tracking-tight">
            {t.kitchen.ledger.modalTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 pt-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] space-y-6 overscroll-contain min-h-0 max-h-[82dvh]">
          <AdminRefundsSection
            kitchenId={kitchenId}
            spaceType={spaceType}
            members={members}
            onCheckoutUpdated={onCheckoutUpdated}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ExpenseLedgerModal;
