"use client";

import { useState, useActionState } from "react";
import { registerUserAction, loginUserAction, AuthActionResult } from "@/app/actions/auth";

export function InviteAuthTabs({
  inviteToken,
  suggestedName,
}: {
  inviteToken: string;
  suggestedName: string;
}) {
  const [tab, setTab] = useState<"register" | "login">("register");
  const callbackUrl = `/invite/${encodeURIComponent(inviteToken)}`;

  const [registerState, registerActionHandler, isRegisterPending] = useActionState<
    AuthActionResult,
    FormData
  >(registerUserAction, {});

  const [loginState, loginActionHandler, isLoginPending] = useActionState<
    AuthActionResult,
    FormData
  >(loginUserAction, {});

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex p-1 bg-slate-100 rounded-xl">
        <button
          type="button"
          onClick={() => setTab("register")}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${
            tab === "register"
              ? "bg-white text-emerald-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          New User (Sign up)
        </button>
        <button
          type="button"
          onClick={() => setTab("login")}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${
            tab === "login"
              ? "bg-white text-emerald-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Existing User (Log in)
        </button>
      </div>

      {tab === "register" ? (
        <form action={registerActionHandler} className="space-y-4 text-left">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <input type="hidden" name="inviteToken" value={inviteToken} />

          {registerState?.error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {registerState.error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Choose an Account Username
            </label>
            <input
              type="text"
              name="username"
              required
              minLength={2}
              autoComplete="username"
              defaultValue={suggestedName.toLowerCase().replace(/\s+/g, "")}
              placeholder="e.g. sarah_42"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Unique account username for logging in across devices.
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
            disabled={isRegisterPending}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold transition shadow-sm"
          >
            {isRegisterPending ? "Creating Account..." : "Create Account & Join Kitchen →"}
          </button>
        </form>
      ) : (
        <form action={loginActionHandler} className="space-y-4 text-left">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <input type="hidden" name="inviteToken" value={inviteToken} />

          {loginState?.error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {loginState.error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Account Username
            </label>
            <input
              type="text"
              name="username"
              required
              autoComplete="username"
              placeholder="Your existing username"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isLoginPending}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold transition shadow-sm"
          >
            {isLoginPending ? "Signing In..." : "Log In & Join Kitchen →"}
          </button>
        </form>
      )}
    </div>
  );
}
