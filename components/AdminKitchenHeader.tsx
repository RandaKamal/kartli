"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { updateKitchenSettings, regeneratePublicViewToken } from "@/app/actions/kitchen";
import type { Kitchen, ShoppingListItem, KitchenSpaceType } from "@/types";
import { CopyButton } from "@/components/CopyButton";
import {
  ArrowLeft,
  Shield,
  Settings,
  Loader2,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  Home,
  Heart,
  Briefcase,
  Building2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useI18n } from "@/context/i18n-context";

export function AdminKitchenHeader({
  kitchen,
  shoppingListItems,
  currentUserId,
}: {
  kitchen: Kitchen;
  shoppingListItems: ShoppingListItem[];
  currentUserId: string;
}) {
  const { t, lang } = useI18n();
  const [name, setName] = useState(kitchen.name);
  const [spaceType, setSpaceType] = useState<KitchenSpaceType>(kitchen.space_type || "FLATSHARE");
  const [publicViewToken, setPublicViewToken] = useState(kitchen.public_view_token);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [draftName, setDraftName] = useState(kitchen.name);
  const [draftSpaceType, setDraftSpaceType] = useState<KitchenSpaceType>(
    kitchen.space_type || "FLATSHARE"
  );

  const [isPending, startTransition] = useTransition();
  const [isRegenerating, startRegenerateTransition] = useTransition();

  useEffect(() => {
    setName(kitchen.name);
    setDraftName(kitchen.name);
    setSpaceType(kitchen.space_type || "FLATSHARE");
    setDraftSpaceType(kitchen.space_type || "FLATSHARE");
    setPublicViewToken(kitchen.public_view_token);
  }, [kitchen.name, kitchen.space_type, kitchen.public_view_token]);

  const publicGuestUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/kitchen/view/${publicViewToken}`
      : `/kitchen/view/${publicViewToken}`;

  const handleOpenSettings = () => {
    setDraftName(name);
    setDraftSpaceType(spaceType);
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = draftName.trim();
    if (!trimmed) {
      toast.error("Kitchen name cannot be empty.");
      return;
    }

    if (trimmed === name && draftSpaceType === spaceType) {
      setIsSettingsOpen(false);
      return;
    }

    const previousName = name;
    const previousSpaceType = spaceType;

    setName(trimmed);
    setSpaceType(draftSpaceType);
    setIsSettingsOpen(false);

    startTransition(async () => {
      try {
        await updateKitchenSettings({
          kitchenId: kitchen.id,
          name: trimmed,
          spaceType: draftSpaceType,
        });
        toast.success("Kitchen settings saved successfully!");
      } catch (err: any) {
        setName(previousName);
        setDraftName(previousName);
        setSpaceType(previousSpaceType);
        setDraftSpaceType(previousSpaceType);
        toast.error(err.message || "Failed to update kitchen settings.");
      }
    });
  };

  const handleRegenerateGuestLink = () => {
    startRegenerateTransition(async () => {
      try {
        const res = await regeneratePublicViewToken(kitchen.id);
        if (res.success && res.newToken) {
          setPublicViewToken(res.newToken);
          toast.success("Guest supermarket link regenerated!");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to regenerate guest link.");
      }
    });
  };

  return (
    <>
      <div className="space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition px-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t("kitchen.backToKitchens")}</span>
        </Link>

        <Card className="border border-border/80 bg-card rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Badge variant="secondary" className="bg-muted text-foreground border border-border font-medium text-[11px] gap-1 px-2.5 py-0.5">
                <Shield className="w-3 h-3 text-muted-foreground" />
                <span>ADMIN PANEL</span>
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                {t("kitchen.created", {
                  date: new Date(kitchen.created_at).toLocaleDateString(lang === "de" ? "de-DE" : "en-US"),
                })}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight truncate">
              {name}
            </h1>

            <p className="text-sm text-muted-foreground mt-1">
              Manage members, generate invite tokens, and configure space presets.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button asChild variant="outline" size="sm" className="rounded-lg font-medium text-xs h-8">
              <Link href={`/kitchen/${kitchen.id}/member`}>Member View</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenSettings}
              className="rounded-lg font-medium text-xs h-8 gap-1.5"
            >
              <Settings className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{t("tabs.settings")}</span>
            </Button>
          </div>
        </Card>
      </div>

      {/* Kitchen Settings Modal Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-lg bg-card border border-border p-6 text-card-foreground flex flex-col gap-6 rounded-3xl shadow-xl">
          <DialogHeader className="space-y-1.5 text-left">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-muted-foreground" />
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                Kitchen Settings
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Manage your household space, wording presets, and guest access.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSettings} className="flex flex-col gap-6 py-0.5">
            {/* Section 1: General & Name */}
            <div className="space-y-2">
              <Label
                htmlFor="modal-kitchen-name"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                Kitchen Name
              </Label>
              <Input
                id="modal-kitchen-name"
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                required
                maxLength={255}
                placeholder="e.g. Baker Street Kitchen"
                className="rounded-xl h-10 bg-muted/40 border-border text-foreground focus-visible:ring-1 focus-visible:ring-ring"
                disabled={isPending}
                autoFocus
              />
            </div>

            <Separator className="bg-border/60" />

            {/* Section 2: Household Type / Space Context */}
            <div className="space-y-2.5">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Space Context &amp; Wording
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Choose how members are addressed throughout the app.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setDraftSpaceType("FLATSHARE")}
                  className={`h-16 rounded-2xl flex flex-col items-center justify-center gap-1 font-semibold text-xs border transition-all cursor-pointer ${
                    draftSpaceType === "FLATSHARE"
                      ? "bg-secondary text-foreground border-foreground/25 shadow-xs"
                      : "bg-card text-muted-foreground border-border/80 hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5" />
                    <span>Flatshare</span>
                  </div>
                  <span className="text-[10px] font-normal text-muted-foreground">
                    Term: Roommates
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDraftSpaceType("FAMILY")}
                  className={`h-16 rounded-2xl flex flex-col items-center justify-center gap-1 font-semibold text-xs border transition-all cursor-pointer ${
                    draftSpaceType === "FAMILY"
                      ? "bg-secondary text-foreground border-foreground/25 shadow-xs"
                      : "bg-card text-muted-foreground border-border/80 hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5" />
                    <span>Family</span>
                  </div>
                  <span className="text-[10px] font-normal text-muted-foreground">
                    Term: Family
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDraftSpaceType("OFFICE")}
                  className={`h-16 rounded-2xl flex flex-col items-center justify-center gap-1 font-semibold text-xs border transition-all cursor-pointer ${
                    draftSpaceType === "OFFICE"
                      ? "bg-secondary text-foreground border-foreground/25 shadow-xs"
                      : "bg-card text-muted-foreground border-border/80 hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Office</span>
                  </div>
                  <span className="text-[10px] font-normal text-muted-foreground">
                    Term: Team
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDraftSpaceType("NEUTRAL")}
                  className={`h-16 rounded-2xl flex flex-col items-center justify-center gap-1 font-semibold text-xs border transition-all cursor-pointer ${
                    draftSpaceType === "NEUTRAL"
                      ? "bg-secondary text-foreground border-foreground/25 shadow-xs"
                      : "bg-card text-muted-foreground border-border/80 hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Neutral</span>
                  </div>
                  <span className="text-[10px] font-normal text-muted-foreground">
                    Term: Members
                  </span>
                </button>
              </div>
            </div>

            <Separator className="bg-border/60" />

            {/* Section 3: Guest Supermarket Link */}
            <div className="space-y-3 rounded-2xl p-4 bg-muted/20 border border-border/70">
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-accent-brand" />
                  <span>Guest Supermarket Link</span>
                </h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Disposable read-only link for supermarket visitors. Regenerating invalidates the previous link immediately.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  readOnly
                  value={publicGuestUrl}
                  className="h-8 px-2.5 text-xs text-foreground font-mono select-all rounded-xl bg-card border-border/80"
                />
                <CopyButton text={publicGuestUrl} label="Copy" size="sm" />
                <Button asChild variant="ghost" size="icon-sm" className="h-8 w-8 rounded-xl" title="Open guest view">
                  <Link href={`/kitchen/view/${publicViewToken}`} target="_blank">
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  </Link>
                </Button>
              </div>

              <div className="pt-0.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerateGuestLink}
                  disabled={isRegenerating}
                  className="rounded-xl text-xs font-medium gap-1.5 h-8 border-border hover:bg-muted"
                  title="Regenerate token and revoke previous link"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
                  <span>{isRegenerating ? "Regenerating..." : "Regenerate Link"}</span>
                </Button>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-border mt-1">
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={isPending || !draftName.trim()}
                className="w-full sm:w-auto h-9 px-5 text-xs font-semibold rounded-xl gap-1.5 shadow-sm"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isPending ? "Saving..." : "Save Changes"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
