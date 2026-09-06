"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { registerUserAction } from "@/app/actions/auth";
import { Eye, EyeOff, Check, X, Loader2, User, Lock, ArrowRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function RegisterForm({
  callbackUrl,
  inviteToken,
  initialError,
}: {
  callbackUrl?: string;
  inviteToken?: string;
  initialError?: string;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (initialError) {
      toast.error(initialError);
    }
  }, [initialError]);

  const isMatching = confirmPassword.length > 0 && password === confirmPassword;
  const isMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;

    if (password !== confirmPassword) {
      const err = "Passwords do not match. Please re-enter your password.";
      setError(err);
      toast.error(err);
      return;
    }

    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const result = await registerUserAction(null, formData);
        if (result?.error) {
          setError(result.error);
          toast.error(result.error);
        } else {
          toast.success("Account created successfully!");
        }
      } catch (err: any) {
        if (err?.message?.includes("NEXT_REDIRECT")) return;
        const msg = err.message || "Failed to create account. Please try again.";
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
      className="space-y-3"
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
          htmlFor="reg-username"
          className="text-[11px] font-semibold tracking-wider uppercase text-foreground/80 mb-1 block"
        >
          Username
        </Label>
        <div className="h-11 bg-secondary/50 border border-border focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 rounded-xl transition-all flex items-center px-3.5 gap-2.5">
          <User className="w-4 h-4 text-muted-foreground/70 shrink-0 pointer-events-none" />
          <input
            id="reg-username"
            type="text"
            name="username"
            required
            autoComplete="username"
            minLength={2}
            onKeyDown={handleKeyDown}
            placeholder="e.g. sophie, alex, finn"
            className="w-full h-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-sm text-foreground placeholder:text-muted-foreground/60 p-0"
          />
        </div>
        <span className="text-[11px] text-muted-foreground/70 block pt-0.5">
          Used to log into your account. Must be unique.
        </span>
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor="reg-password"
          className="text-[11px] font-semibold tracking-wider uppercase text-foreground/80 mb-1 block"
        >
          Password
        </Label>
        <div className="h-11 bg-secondary/50 border border-border focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 rounded-xl transition-all flex items-center px-3.5 gap-2.5">
          <Lock className="w-4 h-4 text-muted-foreground/70 shrink-0 pointer-events-none" />
          <input
            id="reg-password"
            type={showPassword ? "text" : "password"}
            name="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            onKeyDown={handleKeyDown}
            placeholder="••••••••"
            className="w-full h-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-sm text-foreground placeholder:text-muted-foreground/60 p-0"
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

      <div className="space-y-1.5">
        <Label
          htmlFor="reg-confirmPassword"
          className="text-[11px] font-semibold tracking-wider uppercase text-foreground/80 mb-1 block"
        >
          Confirm Password
        </Label>
        <div className="h-11 bg-secondary/50 border border-border focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 rounded-xl transition-all flex items-center px-3.5 gap-2.5">
          <Lock className="w-4 h-4 text-muted-foreground/70 shrink-0 pointer-events-none" />
          <input
            id="reg-confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            name="confirmPassword"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            onKeyDown={handleKeyDown}
            placeholder="••••••••"
            className="w-full h-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-sm text-foreground placeholder:text-muted-foreground/60 p-0"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowConfirmPassword((prev) => !prev);
            }}
            className="text-muted-foreground/70 hover:text-foreground transition p-1 cursor-pointer focus:outline-none shrink-0"
            title={showConfirmPassword ? "Hide password" : "Show password"}
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Live Validation Indicator with Accent Tokens */}
        {confirmPassword.length > 0 && (
          <div className="mt-1 flex items-center gap-1.5 text-xs">
            {isMatching ? (
              <span className="text-emerald-500 dark:text-emerald-400 flex items-center gap-1 font-medium animate-in fade-in">
                <Check className="w-3.5 h-3.5" /> Passwords match
              </span>
            ) : (
              <span className="text-rose-500 dark:text-rose-400 flex items-center gap-1 font-medium animate-in fade-in">
                <X className="w-3.5 h-3.5" /> Passwords do not match
              </span>
            )}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending || isMismatch}
        className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-1.5"
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Creating Account...</span>
          </>
        ) : (
          <>
            <span>Start Your Kitchen</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}

