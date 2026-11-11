"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Receipt } from "lucide-react";
import { AdminRefundsSection } from "@/components/AdminRefundsSection";
import { MyPurchasesSection } from "@/components/MyPurchasesSection";
import type { KitchenMemberWithUser, KitchenSpaceType, CheckoutWithDetails } from "@/types";
import { useTranslation } from "@/lib/i18n";

export interface ExpenseLedgerModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  kitchenId: string;
  isAdmin: boolean;
  spaceType?: KitchenSpaceType;
  members: KitchenMemberWithUser[];
  checkouts: CheckoutWithDetails[];
}

export function ExpenseLedgerModal({
  isOpen,
  onOpenChange,
  kitchenId,
  isAdmin,
  spaceType,
  members,
  checkouts,
}: ExpenseLedgerModalProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        onDismiss={() => onOpenChange(false)}
        className="sm:max-w-3xl w-full p-0 gap-0 overflow-hidden flex flex-col rounded-2xl border border-white/[0.08] bg-card shadow-2xl"
      >
        <DialogHeader className="px-5 py-4 sm:px-6 border-b border-white/[0.06] pr-12 text-left">
          <DialogTitle className="text-base font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Receipt className="w-4 h-4 text-muted-foreground" />
            <span>{t.kitchen.ledger.modalTitle}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 pb-10 pt-4 space-y-6 overscroll-contain max-h-[82vh]">
          {isAdmin && (
            <AdminRefundsSection
              kitchenId={kitchenId}
              spaceType={spaceType}
              members={members}
            />
          )}

          <MyPurchasesSection
            kitchenId={kitchenId}
            checkouts={checkouts}
          />
        </div>

        <div className="sm:hidden p-3 border-t border-white/[0.06] bg-card shrink-0">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            className="w-full h-10 rounded-lg text-xs font-semibold cursor-pointer"
          >
            {t.common.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ExpenseLedgerModal;
