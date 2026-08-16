"use client";

import { useState, useTransition, useRef } from "react";
import { registerUserAction } from "@/app/actions/auth";
import { Eye, EyeOff, Check, X, Loader2 } from "lucide-react";

export function RegisterForm({
  callbackUrl,
  initialError,
}: {
  callbackUrl?: string;
  initialError?: string;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const isMatching = confirmPassword.length > 0 && password === confirmPassword;
  const isMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter your password.");
      return;
    }

    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const result = await registerUserAction(null, formData);
        if (result?.error) {
          setError(result.error);
        }
      } catch (err: any) {
        if (err?.message?.includes("NEXT_REDIRECT")) return;
        setError(err.message || "Failed to create account. Please try again.");
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isPending) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      {callbackUrl && (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      )}

      {error && (
        <div className="p-3.5 bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-xl text-center font-medium">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
          Username
        </label>
        <input
          type="text"
          name="username"
          required
          autoComplete="username"
          minLength={2}
          onKeyDown={handleKeyDown}
          placeholder="e.g. sarah_miller"
          className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm transition"
        />
        <span className="text-[11px] text-zinc-500 mt-1 block">
          Used to log into your account. Must be unique.
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
            onKeyDown={handleKeyDown}
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
            onKeyDown={handleKeyDown}
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
        disabled={isPending || isMismatch}
        className="w-full py-3 px-4 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm inline-flex items-center justify-center gap-2"
      >
        {isPending && <Loader2 className="w-4 h-4 animate-spin text-black" />}
        <span>{isPending ? "Creating Account..." : "Create Account"}</span>
      </button>
    </form>
  );
}
