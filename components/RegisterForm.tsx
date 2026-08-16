"use client";

import { useActionState } from "react";
import { registerUserAction, AuthActionResult } from "@/app/actions/auth";

export function RegisterForm({
  callbackUrl,
  initialError,
}: {
  callbackUrl?: string;
  initialError?: string;
}) {
  const [state, formAction, isPending] = useActionState<AuthActionResult, FormData>(
    registerUserAction,
    initialError ? { error: initialError } : {}
  );

  return (
    <form action={formAction} className="space-y-4">
      {callbackUrl && (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      )}

      {state?.error && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl text-center font-medium">
          {state.error}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
          Choose a Unique Username
        </label>
        <input
          type="text"
          name="username"
          required
          autoComplete="username"
          minLength={2}
          placeholder="e.g. sarah_miller"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
        />
        <span className="text-[11px] text-slate-400 mt-1 block">
          Used to log into your account. Must be unique.
        </span>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
          Choose a Password
        </label>
        <input
          type="password"
          name="password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="At least 6 characters"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold transition shadow-sm"
      >
        {isPending ? "Creating Account..." : "Create Account"}
      </button>
    </form>
  );
}
