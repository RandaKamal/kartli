"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  currentUserId?: string;
  onCheckoutUpdated?: (checkout: Partial<CheckoutWithDetails> & { id: string }) => void;
}

export function ExpenseLedgerModal({
  isOpen,
  onOpenChange,
  kitchenId,
  isAdmin,
  spaceType,
  members,
  checkouts,
  currentUserId,
  onCheckoutUpdated,
}: ExpenseLedgerModalProps) {
  const { t } = useTranslation();
  const [userPurchases, setUserPurchases] = React.useState<CheckoutWithDetails[]>(checkouts || []);

  React.useEffect(() => {
    setUserPurchases(checkouts || []);
  }, [checkouts]);

  const handleCheckoutUpdated = (updated: Partial<CheckoutWithDetails> & { id: string }) => {
    setUserPurchases((prev) =>
      prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
    );
    onCheckoutUpdated?.(updated);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        onDismiss={() => onOpenChange(false)}
        className="sm:max-w-3xl w-full p-0 gap-0 overflow-hidden flex flex-col rounded-xl border border-white/[0.08] bg-card shadow-2xl"
      >
        <DialogHeader className="px-5 py-4 sm:px-6 border-b border-white/[0.06] pr-12 text-left">
          <DialogTitle className="text-base font-semibold text-foreground tracking-tight">
            {t.kitchen.ledger.modalTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 pb-10 pt-4 space-y-6 overscroll-contain max-h-[82vh]">
          {isAdmin && (
            <AdminRefundsSection
              kitchenId={kitchenId}
              spaceType={spaceType}
              members={members}
              onCheckoutUpdated={handleCheckoutUpdated}
            />
          )}

          <MyPurchasesSection
            kitchenId={kitchenId}
            checkouts={userPurchases}
            defaultExpanded={!isAdmin}
            onReceiptDeleted={(receiptId) => {
              setUserPurchases((prev) =>
                prev.map((c) => ({
                  ...c,
                  receipts: c.receipts.filter((r) => r.id !== receiptId),
                }))
              );
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ExpenseLedgerModal;
