"use client";

import { useEffect, useRef } from "react";
import { claimGuestCartAction } from "@/app/actions/pantry";
import { readGuestCartCookie, clearGuestCartCookieClient } from "@/lib/guestCart";
import { toast } from "sonner";

export function GuestCartHandoverListener({ kitchenId }: { kitchenId: string }) {
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    const guestIds = readGuestCartCookie(kitchenId);
    if (guestIds.length > 0) {
      claimGuestCartAction(kitchenId, guestIds)
        .then(({ transferredCount }) => {
          clearGuestCartCookieClient(kitchenId);
          if (transferredCount > 0) {
            toast.success(
              `Transferred ${transferredCount} item${
                transferredCount === 1 ? "" : "s"
              } from your guest shopping trip to your cart!`
            );
          }
        })
        .catch((err) => {
          console.error("Failed to claim guest cart items:", err);
        });
    }
  }, [kitchenId]);

  return null;
}
