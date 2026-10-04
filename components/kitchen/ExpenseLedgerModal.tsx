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
        className="sm:max-w-2xl w-full p-0 gap-0 overflow-hidden flex flex-col"
      >
        <DialogHeader className="p-5 sm:p-6 pb-3 border-b border-border/60 pr-12 text-left">
          <DialogTitle className="text-lg sm:text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            <span>Expense &amp; Refund Ledger</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Shared household balances, receipt checkouts, and refund claims.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 pb-8 pt-4 space-y-6 overscroll-contain">
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
            className="w-full h-10 rounded-xl text-xs font-semibold cursor-pointer"
          >
            {t.common.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ExpenseLedgerModal;
