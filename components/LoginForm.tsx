"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { loginUserAction } from "@/app/actions/auth";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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
        <Label htmlFor="login-username">
          Username
        </Label>
        <Input
          id="login-username"
          type="text"
          name="username"
          required
          autoComplete="username"
          onKeyDown={handleKeyDown}
          placeholder="e.g. alex"
          className="rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="login-password">
          Password
        </Label>
        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? "text" : "password"}
            name="password"
            required
            autoComplete="current-password"
            onKeyDown={handleKeyDown}
            placeholder="••••••••"
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

      <Button
        type="submit"
        disabled={isPending}
        className="w-full h-11 rounded-xl font-semibold mt-2"
      >
        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        <span>{isPending ? "Signing In..." : "Sign In"}</span>
      </Button>
    </form>
  );
}

