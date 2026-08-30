"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { updateKitchenName } from "@/app/actions/kitchen";
import type { Kitchen, ShoppingListItem } from "@/types";
import { ShoppingCart } from "@/components/ShoppingCart";
import { ArrowLeft, Shield, Settings, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [draftName, setDraftName] = useState(kitchen.name);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setName(kitchen.name);
    setDraftName(kitchen.name);
  }, [kitchen.name]);

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
        <DialogContent className="max-w-md w-full p-6 space-y-4">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-muted-foreground" />
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                Kitchen Settings
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Update the display name of your shared kitchen space.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSettings} className="space-y-4 py-1">
            <div className="space-y-2">
              <Label htmlFor="modal-kitchen-name" className="text-xs font-semibold text-foreground">
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
                className="rounded-xl h-10"
                disabled={isPending}
                autoFocus
              />
            </div>

            <DialogFooter className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-border mt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsSettingsOpen(false)}
                disabled={isPending}
                className="w-full sm:w-auto h-9 text-xs font-medium rounded-xl"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={isPending || !draftName.trim()}
                className="w-full sm:w-auto h-9 text-xs font-semibold rounded-xl gap-1.5"
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

