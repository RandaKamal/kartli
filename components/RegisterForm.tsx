"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { registerUserAction } from "@/app/actions/auth";
import { Eye, EyeOff, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      {callbackUrl && (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      )}

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-xl text-center font-medium animate-in fade-in-50">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="reg-username">
          Username
        </Label>
        <Input
          id="reg-username"
          type="text"
          name="username"
          required
          autoComplete="username"
          minLength={2}
          onKeyDown={handleKeyDown}
          placeholder="e.g. sarah_miller"
          className="rounded-xl"
        />
        <span className="text-[11px] text-muted-foreground block">
          Used to log into your account. Must be unique.
        </span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-password">
          Password
        </Label>
        <div className="relative">
          <Input
            id="reg-password"
            type={showPassword ? "text" : "password"}
            name="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            onKeyDown={handleKeyDown}
            placeholder="At least 6 characters"
            className="rounded-xl pr-11"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition p-1 cursor-pointer"
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-confirmPassword">
          Confirm Password
        </Label>
        <div className="relative">
          <Input
            id="reg-confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            name="confirmPassword"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            onKeyDown={handleKeyDown}
            placeholder="Re-enter your password"
            className="rounded-xl pr-11"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition p-1 cursor-pointer"
            title={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Live Validation Indicator with Accent Tokens */}
        {confirmPassword.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs">
            {isMatching ? (
              <span className="text-emerald-700 dark:text-emerald-300 flex items-center gap-1 font-medium animate-in fade-in">
                <Check className="w-3.5 h-3.5" /> Passwords match
              </span>
            ) : (
              <span className="text-destructive flex items-center gap-1 font-medium animate-in fade-in">
                <X className="w-3.5 h-3.5" /> Passwords do not match
              </span>
            )}
          </div>
        )}
      </div>

      <Button
        type="submit"
        disabled={isPending || isMismatch}
        className="w-full h-11 rounded-xl font-semibold mt-2"
      >
        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        <span>{isPending ? "Creating Account..." : "Create Account"}</span>
      </Button>
    </form>
  );
}

