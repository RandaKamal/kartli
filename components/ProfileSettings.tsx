"use client";

import { useState } from "react";
import { User, Shield, Bell, Key, Palette, AlertOctagon, CheckCircle2, Copy } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/CopyButton";
import { toast } from "sonner";

interface ProfileSettingsProps {
  user: {
    id: string;
    username: string;
  };
}

export function ProfileSettings({ user }: ProfileSettingsProps) {
  const [notifyPantry, setNotifyPantry] = useState(true);
  const [notifyShopping, setNotifyShopping] = useState(true);
  const [notifyMembers, setNotifyMembers] = useState(false);

  const initial = (user.username || "?").charAt(0).toUpperCase();

  const handleSavePreferences = () => {
    toast.success("Preferences updated successfully");
  };

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    toast.info("Password update functionality is coming soon");
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto mb-6 bg-zinc-900 border border-zinc-800 p-1 rounded-2xl">
          <TabsTrigger value="account" className="rounded-xl text-xs font-semibold">
            Account
          </TabsTrigger>
          <TabsTrigger value="preferences" className="rounded-xl text-xs font-semibold">
            Preferences
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-xl text-xs font-semibold">
            Security
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Account Info */}
        <TabsContent value="account" className="space-y-6 animate-in fade-in-50">
          <Card className="border-zinc-800/80 bg-zinc-900/90 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-zinc-700">
                  <AvatarFallback className="bg-zinc-800 text-xl font-bold text-white">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      @{user.username}
                    </h2>
                    <Badge variant="secondary" className="text-[10px]">
                      Active
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Registered Kitchen Member
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs text-zinc-400 font-mono">
                  ID: {user.id.slice(0, 8)}...
                </Badge>
                <CopyButton text={user.id} label="Copy Full ID" size="sm" />
              </div>
            </div>

            <Separator className="bg-zinc-800" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="profile-username">Username</Label>
                <Input
                  id="profile-username"
                  value={user.username}
                  readOnly
                  disabled
                  className="rounded-xl bg-zinc-950/60 font-mono text-zinc-300"
                />
                <span className="text-[11px] text-zinc-500 block">
                  Your unique identifier across all kitchens.
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-auth-type">Authentication Method</Label>
                <Input
                  id="profile-auth-type"
                  value="Credentials (Encrypted JWT Session)"
                  readOnly
                  disabled
                  className="rounded-xl bg-zinc-950/60 font-medium text-zinc-300"
                />
                <span className="text-[11px] text-zinc-500 block">
                  Managed via NextAuth.js / Auth.js v5.
                </span>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 2: Preferences */}
        <TabsContent value="preferences" className="space-y-6 animate-in fade-in-50">
          <Card className="border-zinc-800/80 bg-zinc-900/90 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <CardHeader className="p-0 space-y-1">
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-zinc-400" />
                <span>Notification Preferences</span>
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Configure when and how you receive grocery and kitchen status alerts.
              </CardDescription>
            </CardHeader>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
                <div className="space-y-0.5">
                  <Label htmlFor="notify-pantry" className="text-sm font-medium text-white cursor-pointer">
                    Pantry Restock Alerts
                  </Label>
                  <p className="text-xs text-zinc-400">
                    Get notified when an item in your kitchen is marked as Empty.
                  </p>
                </div>
                <Switch
                  id="notify-pantry"
                  checked={notifyPantry}
                  onCheckedChange={setNotifyPantry}
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
                <div className="space-y-0.5">
                  <Label htmlFor="notify-shopping" className="text-sm font-medium text-white cursor-pointer">
                    Shopping Cart &amp; Checkout Updates
                  </Label>
                  <p className="text-xs text-zinc-400">
                    Receive confirmation when a roommate checks out groceries.
                  </p>
                </div>
                <Switch
                  id="notify-shopping"
                  checked={notifyShopping}
                  onCheckedChange={setNotifyShopping}
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
                <div className="space-y-0.5">
                  <Label htmlFor="notify-members" className="text-sm font-medium text-white cursor-pointer">
                    Member Activity
                  </Label>
                  <p className="text-xs text-zinc-400">
                    Alert when a new member claims an invite link in your kitchen.
                  </p>
                </div>
                <Switch
                  id="notify-members"
                  checked={notifyMembers}
                  onCheckedChange={setNotifyMembers}
                />
              </div>
            </div>

            <Separator className="bg-zinc-800" />

            {/* Design System Token Palette Showcase */}
            <div className="space-y-3">
              <div className="space-y-0.5">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Palette className="w-4 h-4 text-zinc-400" />
                  <span>Active Theme Accent Tokens</span>
                </h4>
                <p className="text-xs text-zinc-400">
                  Modular CSS variables configured in your design system palette.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-accent-primary shadow-xs" />
                    <span className="text-xs font-semibold text-white">Primary</span>
                  </div>
                  <p className="text-[11px] font-mono text-zinc-400">#f14666</p>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-accent-secondary shadow-xs" />
                    <span className="text-xs font-semibold text-white">Secondary</span>
                  </div>
                  <p className="text-[11px] font-mono text-zinc-400">#ee8980</p>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-accent-warm shadow-xs" />
                    <span className="text-xs font-semibold text-white">Warm</span>
                  </div>
                  <p className="text-[11px] font-mono text-zinc-400">#ffcdaa</p>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-accent-muted-green shadow-xs" />
                    <span className="text-xs font-semibold text-white">Muted Green</span>
                  </div>
                  <p className="text-[11px] font-mono text-zinc-400">#9cb898</p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button onClick={handleSavePreferences} className="rounded-xl font-semibold">
                Save Preferences
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 3: Security & Danger Zone */}
        <TabsContent value="security" className="space-y-6 animate-in fade-in-50">
          <Card className="border-zinc-800/80 bg-zinc-900/90 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <CardHeader className="p-0 space-y-1">
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-zinc-400" />
                <span>Password &amp; Security</span>
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Update your credentials or manage active sessions.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSaveSecurity} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="••••••••"
                  className="rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="At least 6 characters"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                  <Input
                    id="confirm-new-password"
                    type="password"
                    placeholder="Repeat new password"
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" variant="secondary" className="rounded-xl font-semibold">
                  Update Password
                </Button>
              </div>
            </form>

            <Separator className="bg-zinc-800" />

            {/* Danger Zone */}
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Danger Zone</h4>
                  <p className="text-xs text-zinc-400">
                    Irreversible actions related to your account sessions.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-zinc-200">Sign Out of All Devices</span>
                  <p className="text-[11px] text-zinc-500">
                    Invalidates active JWT tokens across other browsers.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info("Active sessions cleared")}
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 rounded-xl"
                >
                  Clear All Sessions
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
