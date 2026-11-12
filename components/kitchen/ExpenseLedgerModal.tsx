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

  const pendingPersonalPurchases = userPurchases.filter(
    (c) => !c.is_refunded && !c.is_declined
  ).length;

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
        className="sm:max-w-3xl w-full p-0 gap-0 overflow-hidden flex flex-col rounded-xl border border-border bg-card shadow-2xl"
      >
        <DialogHeader className="px-5 py-4 sm:px-6 border-b border-border pr-12 text-left">
          <DialogTitle className="text-base font-semibold text-foreground tracking-tight">
            {isAdmin ? t.kitchen.ledger.modalTitle : t.kitchen.ledger.myPurchases}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 pt-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] space-y-6 overscroll-contain min-h-0 max-h-[82dvh]">
          {isAdmin ? (
            <>
              <AdminRefundsSection
                kitchenId={kitchenId}
                spaceType={spaceType}
                members={members}
                onCheckoutUpdated={handleCheckoutUpdated}
              />

              <MyPurchasesSection
                kitchenId={kitchenId}
                checkouts={userPurchases}
                defaultExpanded={pendingPersonalPurchases > 0}
                onReceiptDeleted={(receiptId) => {
                  setUserPurchases((prev) =>
                    prev.map((c) => ({
                      ...c,
                      receipts: c.receipts.filter((r) => r.id !== receiptId),
                    }))
                  );
                }}
              />
            </>
          ) : (
            <MyPurchasesSection
              kitchenId={kitchenId}
              checkouts={userPurchases}
              standalone
              onReceiptDeleted={(receiptId) => {
                setUserPurchases((prev) =>
                  prev.map((c) => ({
                    ...c,
                    receipts: c.receipts.filter((r) => r.id !== receiptId),
                  }))
                );
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ExpenseLedgerModal;
