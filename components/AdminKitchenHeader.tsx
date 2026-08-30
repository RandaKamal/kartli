"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { updateKitchenName, regeneratePublicViewToken } from "@/app/actions/kitchen";
import type { Kitchen, ShoppingListItem } from "@/types";
import { ShoppingCart } from "@/components/ShoppingCart";
import { CopyButton } from "@/components/CopyButton";
import {
  ArrowLeft,
  Shield,
  Settings,
  Loader2,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
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

export function AdminKitchenHeader({
  kitchen,
  shoppingListItems,
  currentUserId,
}: {
  kitchen: Kitchen;
  shoppingListItems: ShoppingListItem[];
  currentUserId: string;
}) {
  const [name, setName] = useState(kitchen.name);
  const [publicViewToken, setPublicViewToken] = useState(kitchen.public_view_token);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [draftName, setDraftName] = useState(kitchen.name);
  const [isPending, startTransition] = useTransition();
  const [isRegenerating, startRegenerateTransition] = useTransition();

  useEffect(() => {
    setName(kitchen.name);
    setDraftName(kitchen.name);
    setPublicViewToken(kitchen.public_view_token);
  }, [kitchen.name, kitchen.public_view_token]);

  const publicGuestUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/kitchen/view/${publicViewToken}`
      : `/kitchen/view/${publicViewToken}`;

  const handleOpenSettings = () => {
    setDraftName(name);
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = draftName.trim();
    if (!trimmed) {
      toast.error("Kitchen name cannot be empty.");
      return;
    }

    if (trimmed === name) {
      setIsSettingsOpen(false);
      return;
    }

    const previousName = name;
    setName(trimmed);
    setIsSettingsOpen(false);

    startTransition(async () => {
      try {
        await updateKitchenName({
          kitchenId: kitchen.id,
          newName: trimmed,
        });
        toast.success("Kitchen name updated successfully!");
      } catch (err: any) {
        setName(previousName);
        setDraftName(previousName);
        toast.error(err.message || "Failed to update kitchen name.");
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
          <span>Back to Kitchens</span>
        </Link>

        <Card className="border border-border/80 bg-card rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Badge variant="accent" className="font-semibold text-[11px] gap-1 px-2.5 py-0.5">
                <Shield className="w-3 h-3" />
                ADMIN PANEL
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                Created {new Date(kitchen.created_at).toLocaleDateString()}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight truncate">
              {name}
            </h1>

            <p className="text-sm text-muted-foreground mt-1">
              Manage members, generate invite tokens, and view guest links.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <ShoppingCart
              kitchenId={kitchen.id}
              items={shoppingListItems}
              currentUserId={currentUserId}
            />
            <Button asChild variant="secondary" size="sm" className="rounded-xl font-medium">
              <Link href={`/kitchen/${kitchen.id}/admin/purchases`}>Purchases</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-xl font-medium">
              <Link href={`/kitchen/${kitchen.id}/member`}>Member View</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenSettings}
              className="rounded-xl font-medium gap-1.5"
            >
              <Settings className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Settings</span>
            </Button>
          </div>
        </Card>
      </div>

      {/* Kitchen Settings Modal Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md w-full p-6 space-y-5 rounded-3xl">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-muted-foreground" />
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                Kitchen Settings
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Manage kitchen details and disposable guest access links.
            </DialogDescription>
          </DialogHeader>

          {/* Section 1: Name Update Form */}
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="modal-kitchen-name" className="text-xs font-semibold text-foreground">
                Kitchen Display Name
              </Label>
              <Input
                id="modal-kitchen-name"
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                required
                maxLength={255}
                placeholder="e.g. Baker Street Kitchen"
                className="rounded-xl h-10"
                disabled={isPending}
                autoFocus
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={isPending || !draftName.trim()}
                className="h-9 text-xs font-semibold rounded-xl gap-1.5"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isPending ? "Saving..." : "Save Name"}</span>
              </Button>
            </div>
          </form>

          <Separator className="bg-border/70" />

          {/* Section 2: Disposable Guest Supermarket Link */}
          <div className="space-y-3">
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
                className="h-8 px-2.5 text-xs text-foreground font-mono select-all rounded-xl bg-muted/40"
              />
              <CopyButton text={publicGuestUrl} label="Copy" size="sm" />
              <Button asChild variant="ghost" size="icon-sm" className="h-8 w-8 rounded-xl" title="Open guest view">
                <Link href={`/kitchen/view/${publicViewToken}`} target="_blank">
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                </Link>
              </Button>
            </div>

            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRegenerateGuestLink}
                disabled={isRegenerating}
                className="rounded-xl text-xs font-medium gap-1.5 h-8 border-border"
                title="Regenerate token and revoke previous link"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
                <span>{isRegenerating ? "Regenerating..." : "Regenerate Link"}</span>
              </Button>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsSettingsOpen(false)}
              className="w-full sm:w-auto h-9 text-xs font-medium rounded-xl"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
