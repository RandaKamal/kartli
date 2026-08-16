"use client";

import { useState, useTransition, useRef } from "react";
import { registerUserAction, loginUserAction } from "@/app/actions/auth";
import { Eye, EyeOff, Check, X, Loader2 } from "lucide-react";

export function InviteAuthTabs({
  inviteToken,
  suggestedName,
}: {
  inviteToken: string;
  suggestedName: string;
}) {
  const [tab, setTab] = useState<"register" | "login">("register");
  const callbackUrl = `/invite/${encodeURIComponent(inviteToken)}`;

  // Registration state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [registerError, setRegisterError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isRegisterPending, startRegisterTransition] = useTransition();
  const [isLoginPending, startLoginTransition] = useTransition();

  const registerFormRef = useRef<HTMLFormElement>(null);
  const loginFormRef = useRef<HTMLFormElement>(null);

  const isMatching = confirmPassword.length > 0 && password === confirmPassword;
  const isMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleRegisterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isRegisterPending) return;

    if (password !== confirmPassword) {
      setRegisterError("Passwords do not match. Please re-enter your password.");
      return;
    }

    setRegisterError(null);
    const formData = new FormData(e.currentTarget);

    startRegisterTransition(async () => {
      try {
        const result = await registerUserAction(null, formData);
        if (result?.error) {
          setRegisterError(result.error);
        }
      } catch (err: any) {
        if (err?.message?.includes("NEXT_REDIRECT")) return;
        setRegisterError(err.message || "Failed to create account. Please try again.");
      }
    });
  };

  const handleLoginSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoginPending) return;

    setLoginError(null);
    const formData = new FormData(e.currentTarget);

    startLoginTransition(async () => {
      try {
        const result = await loginUserAction(null, formData);
        if (result?.error) {
          setLoginError(result.error);
        }
      } catch (err: any) {
        if (err?.message?.includes("NEXT_REDIRECT")) return;
        setLoginError(err.message || "Failed to log in. Please try again.");
      }
    });
  };

  const handleRegisterKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isRegisterPending) {
      e.preventDefault();
      registerFormRef.current?.requestSubmit();
    }
  };

  const handleLoginKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoginPending) {
      e.preventDefault();
      loginFormRef.current?.requestSubmit();
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex p-1 bg-zinc-950 border border-zinc-800 rounded-xl">
        <button
          type="button"
          onClick={() => {
            setTab("register");
            setRegisterError(null);
            setLoginError(null);
          }}
          className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
            tab === "register"
              ? "bg-zinc-800 text-white shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          New User (Sign up)
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("login");
            setRegisterError(null);
            setLoginError(null);
          }}
          className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
            tab === "login"
              ? "bg-zinc-800 text-white shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Existing User (Log in)
        </button>
      </div>

      {tab === "register" ? (
        <form
          ref={registerFormRef}
          onSubmit={handleRegisterSubmit}
          className="space-y-4 text-left"
        >
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <input type="hidden" name="inviteToken" value={inviteToken} />

          {registerError && (
            <div className="p-3 bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-xl font-medium text-center">
              {registerError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Account Username
            </label>
            <input
              type="text"
              name="username"
              required
              autoComplete="username"
              onKeyDown={handleRegisterKeyDown}
              defaultValue={suggestedName.toLowerCase().replace(/\s+/g, "")}
              placeholder="e.g. sarah_42"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm transition"
            />
            <span className="text-[11px] text-zinc-500 mt-1 block">
              Unique username for your personal account.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                onKeyDown={handleRegisterKeyDown}
                placeholder="At least 6 characters"
                className="w-full px-4 py-2.5 pr-11 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm transition"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition p-1"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                onKeyDown={handleRegisterKeyDown}
                placeholder="Re-enter your password"
                className="w-full px-4 py-2.5 pr-11 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm transition"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition p-1"
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Live Validation Indicator */}
            {confirmPassword.length > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                {isMatching ? (
                  <span className="text-zinc-300 flex items-center gap-1 font-medium">
                    <Check className="w-3.5 h-3.5 text-white" /> Passwords match
                  </span>
                ) : (
                  <span className="text-zinc-400 flex items-center gap-1 font-medium">
                    <X className="w-3.5 h-3.5 text-zinc-400" /> Passwords do not match
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isRegisterPending || isMismatch}
            className="w-full py-3 px-4 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm inline-flex items-center justify-center gap-2"
          >
            {isRegisterPending && <Loader2 className="w-4 h-4 animate-spin text-black" />}
            <span>{isRegisterPending ? "Creating Account..." : "Create Account & Join Kitchen →"}</span>
          </button>
        </form>
      ) : (
        <form
          ref={loginFormRef}
          onSubmit={handleLoginSubmit}
          className="space-y-4 text-left"
        >
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <input type="hidden" name="inviteToken" value={inviteToken} />

          {loginError && (
            <div className="p-3 bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-xl font-medium text-center">
              {loginError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Account Username
            </label>
            <input
              type="text"
              name="username"
              required
              autoComplete="username"
              onKeyDown={handleLoginKeyDown}
              placeholder="Your existing username"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showLoginPassword ? "text" : "password"}
                name="password"
                required
                autoComplete="current-password"
                onKeyDown={handleLoginKeyDown}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 pr-11 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm transition"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowLoginPassword(!showLoginPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition p-1"
                title={showLoginPassword ? "Hide password" : "Show password"}
              >
                {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoginPending}
            className="w-full py-3 px-4 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 disabled:opacity-40 transition shadow-sm inline-flex items-center justify-center gap-2"
          >
            {isLoginPending && <Loader2 className="w-4 h-4 animate-spin text-black" />}
            <span>{isLoginPending ? "Signing In..." : "Log In & Join Kitchen →"}</span>
          </button>
        </form>
      )}
    </div>
  );
}
