"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { loginUserAction } from "@/app/actions/auth";
import { Eye, EyeOff, Loader2, User, Lock, ArrowRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function LoginForm({
  callbackUrl,
  inviteToken,
  initialError,
}: {
  callbackUrl?: string;
  inviteToken?: string;
  initialError?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (initialError) {
      toast.error(initialError);
    }
  }, [initialError]);

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
          toast.error(result.error);
        } else {
          toast.success("Signed in successfully!");
        }
      } catch (err: any) {
        // NEXT_REDIRECT errors are expected during navigation
        if (err?.message?.includes("NEXT_REDIRECT")) return;
        const msg = err.message || "Failed to sign in. Please try again.";
        setError(msg);
        toast.error(msg);
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
      method="POST"
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      {callbackUrl && (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      )}
      {inviteToken && (
        <input type="hidden" name="inviteToken" value={inviteToken} />
      )}

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-xl text-center font-medium animate-in fade-in-50">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label
          htmlFor="login-username"
          className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground mb-1 block"
        >
          Username
        </Label>
        <div className="h-11 bg-secondary/30 border border-border/80 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 rounded-xl transition-all flex items-center px-3.5 gap-2.5">
          <User className="w-4 h-4 text-muted-foreground/70 shrink-0 pointer-events-none" />
          <input
            id="login-username"
            type="text"
            name="username"
            required
            autoComplete="username"
            onKeyDown={handleKeyDown}
            placeholder="alex@baker-street"
            className="w-full h-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-sm text-foreground placeholder:text-muted-foreground/50 p-0"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="login-password"
            className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground mb-1 block"
          >
            Password
          </Label>
        </div>
        <div className="h-11 bg-secondary/30 border border-border/80 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 rounded-xl transition-all flex items-center px-3.5 gap-2.5">
          <Lock className="w-4 h-4 text-muted-foreground/70 shrink-0 pointer-events-none" />
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            name="password"
            required
            autoComplete="current-password"
            onKeyDown={handleKeyDown}
            placeholder="••••••••"
            className="w-full h-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-sm text-foreground placeholder:text-muted-foreground/50 p-0"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowPassword((prev) => !prev);
            }}
            className="text-muted-foreground/70 hover:text-foreground transition p-1 cursor-pointer focus:outline-none shrink-0"
            title={showPassword ? "Hide password" : "Show password"}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="h-11 w-full bg-white text-zinc-950 font-semibold rounded-xl hover:bg-zinc-200 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-[0_0_25px_-5px_rgba(255,255,255,0.2)] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Signing In...</span>
          </>
        ) : (
          <>
            <span>Sign In</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}

