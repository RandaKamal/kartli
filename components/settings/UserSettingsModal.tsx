"use client";

import React, { useState } from "react";
import {
  Key,
  Eye,
  EyeOff,
  AlertOctagon,
  Loader2,
  Lock,
  Trash2,
  ShieldAlert,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { changePasswordAction, deleteAccountAction } from "@/app/actions/user";
import { useTranslation } from "@/lib/i18n";
import { toast } from "sonner";

/**
 * Self-contained Password Change Form component.
 */
export function PasswordChangeForm() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(t.settings.allFieldsRequired);
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t.settings.passwordTooShortError);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t.settings.passwordMismatchError);
      return;
    }

    setIsPending(true);
    try {
      const res = await changePasswordAction(currentPassword, newPassword);
      if (!res.success) {
        toast.error(res.error || t.settings.currentPasswordIncorrect);
      } else {
        toast.success(t.settings.passwordChangedSuccess);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="p-6 rounded-2xl border border-border/80 bg-card shadow-sm space-y-5">
      <CardHeader className="p-0 space-y-1">
        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
          <Key className="w-5 h-5 text-muted-foreground" />
          <span>{t.settings.securityTitle}</span>
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          {t.settings.securitySubtitle}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current Password */}
        <div className="space-y-2">
          <Label htmlFor="settings-current-password" className="text-xs font-semibold">
            {t.settings.currentPasswordLabel}
          </Label>
          <div className="relative">
            <Input
              id="settings-current-password"
              type={showCurrent ? "text" : "password"}
              placeholder={t.settings.currentPasswordPlaceholder}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isPending}
              className="rounded-xl pr-10"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label={showCurrent ? t.settings.hidePassword : t.settings.showPassword}
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* New Password & Confirm New Password */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="settings-new-password" className="text-xs font-semibold">
              {t.settings.newPasswordLabel}
            </Label>
            <div className="relative">
              <Input
                id="settings-new-password"
                type={showNew ? "text" : "password"}
                placeholder={t.settings.newPasswordPlaceholder}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isPending}
                className="rounded-xl pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label={showNew ? t.settings.hidePassword : t.settings.showPassword}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings-confirm-password" className="text-xs font-semibold">
              {t.settings.confirmPasswordLabel}
            </Label>
            <div className="relative">
              <Input
                id="settings-confirm-password"
                type={showConfirm ? "text" : "password"}
                placeholder={t.settings.confirmPasswordPlaceholder}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isPending}
                className="rounded-xl pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label={showConfirm ? t.settings.hidePassword : t.settings.showPassword}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            type="submit"
            disabled={isPending}
            className="rounded-xl font-semibold gap-2 min-w-[160px]"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t.settings.updatingPasswordBtn}</span>
              </>
            ) : (
              <span>{t.settings.updatePasswordBtn}</span>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}

/**
 * Account Deletion Danger Zone component with confirmation modal.
 */
export function AccountDeletionZone() {
  const { t } = useTranslation();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionError, setDeletionError] = useState<string | null>(null);

  const handleOpenDialog = () => {
    setConfirmPassword("");
    setDeletionError(null);
    setIsConfirmOpen(true);
  };

  const handleCloseDialog = () => {
    if (isDeleting) return;
    setIsConfirmOpen(false);
    setConfirmPassword("");
    setDeletionError(null);
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!confirmPassword) {
      setDeletionError(t.settings.allFieldsRequired);
      return;
    }

    setIsDeleting(true);
    setDeletionError(null);

    try {
      const res = await deleteAccountAction(confirmPassword);
      if (!res.success) {
        setDeletionError(res.error || t.settings.deleteFailed);
        toast.error(res.error || t.settings.deleteFailed);
        setIsDeleting(false);
      } else {
        toast.success(t.settings.deleteSuccess);
        setConfirmPassword("");
        setDeletionError(null);
        setIsConfirmOpen(false);
        // The server action returns after clearing the session cookies; navigate
        // explicitly so the deleted account cannot remain on a cached page.
        window.location.href = "/login";
      }
    } catch (err: any) {
      // In Next.js, NEXT_REDIRECT error indicates a server redirect in progress
      const isRedirect =
        err?.message === "NEXT_REDIRECT" ||
        err?.digest?.startsWith("NEXT_REDIRECT");
      if (isRedirect) {
        toast.success(t.settings.deleteSuccess);
        return;
      }
      const msg = err?.message || t.settings.deleteFailed;
      setDeletionError(msg);
      toast.error(msg);
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 shrink-0 mt-0.5">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-foreground">
              {t.settings.dangerZoneTitle}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t.settings.dangerZoneDesc}
            </p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            type="button"
            variant="destructive"
            onClick={handleOpenDialog}
            className="rounded-xl font-semibold gap-2 shadow-xs cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>{t.settings.deleteAccountBtn}</span>
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent
          onDismiss={handleCloseDialog}
          className="sm:max-w-md w-full p-6 space-y-5 rounded-3xl"
        >
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {t.settings.deleteModalTitle}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {t.settings.deleteModalDesc}
            </DialogDescription>
          </DialogHeader>

          {deletionError && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs leading-relaxed flex items-start gap-2.5">
              <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{deletionError}</div>
            </div>
          )}

          <form onSubmit={handleDeleteAccount} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delete-confirm-password" className="text-xs font-semibold">
                {t.settings.deleteConfirmPasswordLabel}
              </Label>
              <div className="relative">
                <Input
                  id="delete-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t.settings.deleteConfirmPasswordPlaceholder}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (deletionError) setDeletionError(null);
                  }}
                  disabled={isDeleting}
                  className="rounded-xl pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label={showConfirmPassword ? t.settings.hidePassword : t.settings.showPassword}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2 pt-2 flex flex-col-reverse sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                disabled={isDeleting}
                className="rounded-xl w-full sm:w-auto"
              >
                {t.settings.cancelBtn}
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isDeleting}
                className="rounded-xl font-semibold gap-2 w-full sm:w-auto min-w-[140px]"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t.settings.deletingBtn}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>{t.settings.deleteConfirmBtn}</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export interface UserSettingsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user?: {
    id?: string;
    username?: string;
  };
}

/**
 * User Settings Modal dialog component.
 */
export function UserSettingsModal({
  isOpen,
  onOpenChange,
  user,
}: UserSettingsModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        onDismiss={() => onOpenChange(false)}
        className="sm:max-w-lg w-full p-0 gap-0 overflow-hidden flex flex-col rounded-3xl"
      >
        <DialogHeader className="p-6 pb-4 border-b border-border/60 text-left">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground tracking-tight">
                {t.settings.modalTitle}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {user?.username ? `@${user.username} · ` : ""}
                {t.settings.modalSubtitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[80vh]">
          <PasswordChangeForm />
          <AccountDeletionZone />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default UserSettingsModal;
