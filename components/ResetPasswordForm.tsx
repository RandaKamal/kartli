"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertOctagon,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  X,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { redeemPasswordResetAction } from "@/app/actions/password-reset";
import { storePasswordCredential } from "@/lib/credential-manager";

export function ResetPasswordForm({
  token,
  valid,
  username,
  requiresSecondKitchenCheck,
}: {
  token: string;
  valid: boolean;
  username?: string;
  requiresSecondKitchenCheck?: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secondKitchenName, setSecondKitchenName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isDone, setIsDone] = useState(false);

  if (!valid || !username) {
    return (
      <div className="space-y-4 text-center py-2">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
          <AlertOctagon className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-lg font-bold text-foreground">
            {t.authRecovery.resetInvalidTitle}
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t.authRecovery.resetInvalidDesc}
          </p>
        </div>
        <Link
          href="/login"
          className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm"
        >
          <span>{t.authRecovery.resetGoToLogin}</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  if (isDone) {
    return (
      <div className="space-y-4 text-center py-2 animate-in fade-in-50">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
          <Check className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-lg font-bold text-foreground">
            {t.authRecovery.resetSuccessTitle}
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t.authRecovery.resetSuccessDesc}
          </p>
        </div>
        <Link
          href="/login"
          className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm"
        >
          <span>{t.authRecovery.resetGoToLogin}</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const isMatching = confirmPassword.length > 0 && newPassword === confirmPassword;
  const isMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;

    if (newPassword.length < 6) {
      const msg = t.settings.passwordTooShortError;
      setError(msg);
      toast.error(msg);
      return;
    }

    if (newPassword !== confirmPassword) {
      const msg = t.settings.passwordMismatchError;
      setError(msg);
      toast.error(msg);
      return;
    }

    if (requiresSecondKitchenCheck && !secondKitchenName.trim()) {
      const msg = t.settings.allFieldsRequired;
      setError(msg);
      toast.error(msg);
      return;
    }

    setError(null);
    setIsPending(true);
    try {
      const res = await redeemPasswordResetAction({
        token,
        newPassword,
        secondKitchenName: requiresSecondKitchenCheck ? secondKitchenName : undefined,
      });

      if (!res.success) {
        const msg = res.error || "Failed to reset password.";
        setError(msg);
        toast.error(msg);
        setIsPending(false);
        return;
      }

      await storePasswordCredential(username, newPassword, username);
      toast.success(t.authRecovery.resetSuccessTitle);
      setIsDone(true);
      setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (err: any) {
      const msg = err?.message || "Failed to reset password.";
      setError(msg);
      toast.error(msg);
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <div className="mx-auto w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-2">
          <KeyRound className="w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {t.authRecovery.resetPageTitle}
        </h1>
        <p className="text-xs text-muted-foreground">
          {t.authRecovery.resetPageSubtitle.replace("{username}", username)}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Hidden username input so native password managers associate the updated password */}
        <input
          type="text"
          name="username"
          autoComplete="username"
          value={username}
          readOnly
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-xl text-center font-medium">
            {error}
          </div>
        )}

        {requiresSecondKitchenCheck && (
          <div className="space-y-1.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <Label
              htmlFor="reset-second-kitchen"
              className="text-[11px] font-semibold tracking-wider uppercase text-foreground/80 flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>{t.authRecovery.resetSecondKitchenLabel}</span>
            </Label>
            <input
              id="reset-second-kitchen"
              type="text"
              name="secondKitchenName"
              required
              value={secondKitchenName}
              onChange={(e) => setSecondKitchenName(e.target.value)}
              disabled={isPending}
              placeholder={t.authRecovery.resetSecondKitchenPlaceholder}
              className="h-10 w-full rounded-xl bg-background border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none"
            />
            <p className="text-[11px] text-muted-foreground">
              {t.authRecovery.resetSecondKitchenHint}
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label
            htmlFor="reset-new-password"
            className="text-[11px] font-semibold tracking-wider uppercase text-foreground/80 block"
          >
            {t.settings.newPasswordLabel}
          </Label>
          <div className="h-11 bg-secondary/50 border border-border focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 rounded-xl transition-all flex items-center px-3.5 gap-2.5">
            <Lock className="w-4 h-4 text-muted-foreground/70 shrink-0 pointer-events-none" />
            <input
              id="reset-new-password"
              type={showNew ? "text" : "password"}
              name="newPassword"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              disabled={isPending}
              placeholder={t.settings.newPasswordPlaceholder}
              className="w-full h-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-sm text-foreground placeholder:text-muted-foreground/60 p-0"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowNew((prev) => !prev)}
              className="text-muted-foreground/70 hover:text-foreground transition p-1 cursor-pointer shrink-0"
              aria-label={showNew ? t.settings.hidePassword : t.settings.showPassword}
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="reset-confirm-password"
            className="text-[11px] font-semibold tracking-wider uppercase text-foreground/80 block"
          >
            {t.settings.confirmPasswordLabel}
          </Label>
          <div className="h-11 bg-secondary/50 border border-border focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 rounded-xl transition-all flex items-center px-3.5 gap-2.5">
            <Lock className="w-4 h-4 text-muted-foreground/70 shrink-0 pointer-events-none" />
            <input
              id="reset-confirm-password"
              type={showConfirm ? "text" : "password"}
              name="confirmPassword"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              disabled={isPending}
              placeholder={t.settings.confirmPasswordPlaceholder}
              className="w-full h-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-sm text-foreground placeholder:text-muted-foreground/60 p-0"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowConfirm((prev) => !prev)}
              className="text-muted-foreground/70 hover:text-foreground transition p-1 cursor-pointer shrink-0"
              aria-label={showConfirm ? t.settings.hidePassword : t.settings.showPassword}
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {confirmPassword.length > 0 && (
            <div className="mt-1 flex items-center gap-1.5 text-xs">
              {isMatching ? (
                <span className="text-emerald-500 dark:text-emerald-400 flex items-center gap-1 font-medium">
                  <Check className="w-3.5 h-3.5" /> {t.invite.passwordsMatch}
                </span>
              ) : (
                <span className="text-rose-500 dark:text-rose-400 flex items-center gap-1 font-medium">
                  <X className="w-3.5 h-3.5" /> {t.settings.passwordMismatchError}
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
              <span>{t.authRecovery.resetSubmittingBtn}</span>
            </>
          ) : (
            <>
              <span>{t.authRecovery.resetSubmitBtn}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
