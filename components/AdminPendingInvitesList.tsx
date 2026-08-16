"use client";

import { useState, useTransition } from "react";
import { cancelInviteAction } from "@/app/actions/kitchen";
import type { KitchenMemberWithUser } from "@/types";
import { CopyButton } from "@/components/CopyButton";
import { Trash2, AlertTriangle, X, Loader2 } from "lucide-react";

export function AdminPendingInvitesList({
  kitchenId,
  invites,
  baseUrl,
}: {
  kitchenId: string;
  invites: KitchenMemberWithUser[];
  baseUrl: string;
}) {
  const [selectedInvite, setSelectedInvite] = useState<KitchenMemberWithUser | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConfirmCancel = () => {
    if (!selectedInvite) return;
    setErrorMessage(null);

    startTransition(async () => {
      try {
        await cancelInviteAction(kitchenId, selectedInvite.id);
        setSelectedInvite(null);
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to cancel invite.");
      }
    });
  };

  if (invites.length === 0) {
    return (
      <p className="text-xs text-zinc-500 py-4 text-center">
        No pending invites. All invited members have claimed their links.
      </p>
    );
  }

  return (
    <>
      <div className="divide-y divide-zinc-800">
        {invites.map((invite) => {
          const inviteUrl = `${baseUrl}/invite/${invite.invite_token}`;
          const initial = (invite.kitchen_display_name || "?").charAt(0).toUpperCase();

          return (
            <div
              key={invite.id}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-950 border border-dashed border-zinc-700 text-zinc-400 flex items-center justify-center font-semibold text-xs select-none shrink-0">
                  {initial}
                </div>
                <div>
                  <div className="font-medium text-white text-sm">
                    {invite.kitchen_display_name}
                  </div>
                  <div className="text-xs text-zinc-500 font-medium">
                    Status: Pending Claim
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-xs text-zinc-300 font-mono w-44 sm:w-56 select-all"
                />
                <CopyButton text={inviteUrl} label="Copy Invite" />
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSelectedInvite(invite);
                  }}
                  title="Cancel and revoke invite"
                  className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-950 transition"
                >
                  <Trash2 className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300" />
                  <span className="hidden sm:inline">Revoke</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {selectedInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6 relative">
            <button
              type="button"
              onClick={() => setSelectedInvite(null)}
              className="absolute right-5 top-5 text-zinc-400 hover:text-white p-1 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-zinc-800 border border-zinc-700 text-zinc-300 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Cancel Invite
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Are you sure you want to cancel the invite for{" "}
                  <strong className="text-white font-semibold">
                    {selectedInvite.kitchen_display_name}
                  </strong>
                  ? The invite link will be permanently revoked.
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-xl font-medium">
                {errorMessage}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setSelectedInvite(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition"
              >
                Keep Invite
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmCancel}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white text-black hover:bg-zinc-200 disabled:opacity-50 transition shadow-sm"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isPending ? "Revoking..." : "Revoke Invite"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
