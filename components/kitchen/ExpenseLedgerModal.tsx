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
        className="sm:max-w-3xl w-full p-0 gap-0 overflow-hidden flex flex-col rounded-3xl border border-white/[0.08] bg-card/95 backdrop-blur-2xl shadow-2xl"
      >
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-border/60 pr-12 text-left bg-muted/20 backdrop-blur-md">
          <DialogTitle className="text-lg sm:text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
            <span>{t.kitchen.ledger.modalTitle}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t.kitchen.ledger.modalSubtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 pb-8 pt-4 space-y-6 overscroll-contain max-h-[82vh]">
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

        <div className="sm:hidden p-3 border-t border-border/60 bg-muted/20 shrink-0">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            className="w-full h-10 rounded-full text-xs font-semibold cursor-pointer"
          >
            {t.common.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ExpenseLedgerModal;

