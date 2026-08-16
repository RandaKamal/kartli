"use client";

import { useState, useTransition } from "react";
import { removeKitchenMemberAction } from "@/app/actions/kitchen";
import type { KitchenMemberWithUser } from "@/types";
import { UserMinus, AlertTriangle, X, Loader2 } from "lucide-react";

export function AdminActiveMembersList({
  kitchenId,
  members,
  currentUserId,
}: {
  kitchenId: string;
  members: KitchenMemberWithUser[];
  currentUserId: string;
}) {
  const [selectedMember, setSelectedMember] = useState<KitchenMemberWithUser | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConfirmRemove = () => {
    if (!selectedMember) return;
    setErrorMessage(null);

    startTransition(async () => {
      try {
        await removeKitchenMemberAction(kitchenId, selectedMember.id);
        setSelectedMember(null);
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to remove member.");
      }
    });
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              <th className="pb-3">Member</th>
              <th className="pb-3">Username</th>
              <th className="pb-3">Role</th>
              <th className="pb-3">Joined Date</th>
              <th className="pb-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {members.map((member) => {
              const isSelf = member.user_id === currentUserId;
              const isOtherAdmin = member.role === "ADMIN" && !isSelf;
              const canRemove = !isSelf && !isOtherAdmin;
              const initial = (member.kitchen_display_name || "?").charAt(0).toUpperCase();

              return (
                <tr key={member.id} className="hover:bg-zinc-800/40 transition">
                  <td className="py-3 font-medium text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center font-semibold text-xs select-none shrink-0 shadow-xs">
                        {initial}
                      </div>
                      <div className="flex items-center">
                        <span>{member.kitchen_display_name}</span>
                        {isSelf && (
                          <span className="ml-2 text-xs text-zinc-500 font-normal">(You)</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-zinc-400 font-mono text-xs">
                    @{member.username || "—"}
                  </td>
                  <td className="py-3">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {member.role}
                    </span>
                  </td>
                  <td className="py-3 text-xs text-zinc-500">
                    {member.joined_at
                      ? new Date(member.joined_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="py-3 text-right">
                    {canRemove ? (
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMessage(null);
                          setSelectedMember(member);
                        }}
                        className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-950 transition"
                      >
                        <UserMinus className="w-3 h-3 text-zinc-500" />
                        <span>Remove</span>
                      </button>
                    ) : isSelf ? (
                      <span className="text-xs text-zinc-600 font-mono italic">Primary</span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6 relative">
            <button
              type="button"
              onClick={() => setSelectedMember(null)}
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
                  Remove Member
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Are you sure you want to remove{" "}
                  <strong className="text-white font-semibold">
                    {selectedMember.kitchen_display_name}
                  </strong>{" "}
                  {selectedMember.username && (
                    <span className="font-mono text-zinc-300">
                      (@{selectedMember.username})
                    </span>
                  )}{" "}
                  from this kitchen? They will lose access immediately.
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
                onClick={() => setSelectedMember(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmRemove}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white text-black hover:bg-zinc-200 disabled:opacity-50 transition shadow-sm"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isPending ? "Removing..." : "Remove Member"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
