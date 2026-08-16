"use client";

import { useState, useTransition, useRef } from "react";
import { loginUserAction } from "@/app/actions/auth";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export function LoginForm({
  callbackUrl,
  initialError,
}: {
  callbackUrl?: string;
  initialError?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;

    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const result = await loginUserAction(null, formData);
        if (result?.error) {
          setError(result.error);
        }
      } catch (err: any) {
        // NEXT_REDIRECT errors are expected during navigation
        if (err?.message?.includes("NEXT_REDIRECT")) return;
        setError(err.message || "Failed to sign in. Please try again.");
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
          onKeyDown={handleKeyDown}
          placeholder="e.g. alex"
          className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm transition"
        />
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
            autoComplete="current-password"
            onKeyDown={handleKeyDown}
            placeholder="••••••••"
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

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 px-4 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 disabled:opacity-40 transition shadow-sm inline-flex items-center justify-center gap-2"
      >
        {isPending && <Loader2 className="w-4 h-4 animate-spin text-black" />}
        <span>{isPending ? "Signing In..." : "Sign In"}</span>
      </button>
    </form>
  );
}
