"use client";

import { useEffect, useState } from "react";
import { Fingerprint, Loader2, Plus, Trash2, Smartphone } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { deletePasskeyAction } from "@/app/actions/passkey";
import {
  isWebAuthnSupported,
  registerPasskeyClient,
} from "@/lib/credential-manager";
import type { UserPasskey } from "@/types";

export function PasskeyManager({
  initialPasskeys,
}: {
  initialPasskeys: UserPasskey[];
}) {
  const { t, locale } = useTranslation();
  const [passkeys, setPasskeys] = useState<UserPasskey[]>(initialPasskeys);
  const [deviceName, setDeviceName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(isWebAuthnSupported());
  }, []);

  const formatDate = (value: Date | string) => {
    try {
      return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-US", {
        dateStyle: "medium",
      }).format(new Date(value));
    } catch {
      return String(value);
    }
  };

  const handleAddPasskey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supported || isRegistering) return;

    setIsRegistering(true);
    try {
      const { passkey } = await registerPasskeyClient(deviceName);
      setPasskeys((prev) => [passkey, ...prev]);
      setDeviceName("");
      toast.success(t.settings.passkeyAdded);
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        // User cancelled the native WebAuthn prompt
        return;
      }
      toast.error(err?.message || "Failed to register passkey.");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDeletePasskey = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      const res = await deletePasskeyAction(id);
      if (!res.success) {
        toast.error(res.error || "Failed to remove passkey.");
        return;
      }
      setPasskeys((prev) => prev.filter((pk) => pk.id !== id));
      toast.success(t.settings.passkeyDeleted);
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove passkey.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card className="p-6 rounded-2xl border border-border/80 bg-card shadow-sm space-y-5">
      <CardHeader className="p-0 space-y-1">
        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
          <Fingerprint className="w-5 h-5 text-emerald-500" />
          <span>{t.settings.passkeysTitle}</span>
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          {t.settings.passkeysSubtitle}
        </CardDescription>
      </CardHeader>

      {!supported ? (
        <p className="text-xs text-muted-foreground bg-muted/30 border border-border/60 rounded-xl p-3">
          {t.settings.passkeyUnsupported}
        </p>
      ) : (
        <form onSubmit={handleAddPasskey} className="flex flex-col sm:flex-row gap-2.5 items-end">
          <div className="w-full sm:flex-1 space-y-1.5">
            <Label htmlFor="passkey-device-name" className="text-xs font-semibold">
              {t.settings.passkeyDeviceLabel}
            </Label>
            <Input
              id="passkey-device-name"
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder={t.settings.passkeyDevicePlaceholder}
              maxLength={80}
              disabled={isRegistering}
              className="rounded-xl h-9"
            />
          </div>
          <Button
            type="submit"
            disabled={isRegistering}
            className="rounded-xl font-semibold gap-2 h-9 w-full sm:w-auto shrink-0 cursor-pointer"
          >
            {isRegistering ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t.settings.addingPasskeyBtn}</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>{t.settings.addPasskeyBtn}</span>
              </>
            )}
          </Button>
        </form>
      )}

      <div className="space-y-2">
        {passkeys.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            {t.settings.passkeyEmpty}
          </p>
        ) : (
          passkeys.map((pk) => (
            <div
              key={pk.id}
              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/20 border border-border/70"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {pk.device_name || t.settings.passkeyDefaultName}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t.settings.passkeyAddedOn.replace("{date}", formatDate(pk.created_at))}
                    {" · "}
                    {pk.last_used_at
                      ? t.settings.passkeyLastUsed.replace("{date}", formatDate(pk.last_used_at))
                      : t.settings.passkeyNeverUsed}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={deletingId === pk.id}
                onClick={() => handleDeletePasskey(pk.id)}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0 cursor-pointer"
                title={t.settings.deletePasskeyBtn}
                aria-label={t.settings.deletePasskeyBtn}
              >
                {deletingId === pk.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
