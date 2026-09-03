"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  User,
  Shield,
  Bell,
  Key,
  Palette,
  AlertOctagon,
  Sun,
  Moon,
  Laptop,
  Check,
  UtensilsCrossed,
  DollarSign,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/CopyButton";
import { logoutAction } from "@/app/actions/auth";
import { updatePreferredCurrencyAction } from "@/app/actions/user";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import { toast } from "sonner";

interface ProfileSettingsProps {
  user: {
    id: string;
    username: string;
    preferred_currency?: string;
  };
}

interface CulinaryTheme {
  id: string;
  name: string;
  subtitle: string;
  colors: [string, string, string]; // [Primary, Success/In-Cart, Warning/Needed]
}

const CULINARY_THEMES: CulinaryTheme[] = [
  {
    id: "truffle",
    name: "Black Truffle",
    subtitle: "Minimalist High-Contrast Luxury",
    colors: ["#f4f4f5", "#34d399", "#fbbf24"],
  },
  {
    id: "saffron",
    name: "Saffron Citrus",
    subtitle: "Warm Mediterranean",
    colors: ["#e9c46a", "#90be6d", "#f4a261"],
  },
  {
    id: "plum",
    name: "Midnight Plum",
    subtitle: "Neo-Bistro",
    colors: ["#c084fc", "#4ade80", "#f59e0b"],
  },
  {
    id: "nordic",
    name: "Nordic Salt",
    subtitle: "Scandinavian Slate & Teal",
    colors: ["#22d3ee", "#10b981", "#fb923c"],
  },
];

export function ProfileSettings({ user }: ProfileSettingsProps) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState("account");
  const { theme, setTheme } = useTheme();
  const [culinaryTheme, setCulinaryTheme] = useState<string>("truffle");
  const [preferredCurrency, setPreferredCurrency] = useState<string>(user.preferred_currency || "EUR");
  const [notifyPantry, setNotifyPantry] = useState(true);
  const [notifyShopping, setNotifyShopping] = useState(true);
  const [notifyMembers, setNotifyMembers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (tabParam === "settings" || tabParam === "preferences") {
      setActiveTab("preferences");
    } else if (tabParam === "security") {
      setActiveTab("security");
    } else if (tabParam === "account") {
      setActiveTab("account");
    }
  }, [tabParam]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const active =
        document.documentElement.dataset.theme ||
        document.documentElement.getAttribute("data-theme") ||
        localStorage.getItem("kartli-theme") ||
        localStorage.getItem("culinary-theme") ||
        localStorage.getItem("theme") ||
        "truffle";
      setCulinaryTheme(active === "black-truffle" ? "truffle" : active);
    }
  }, []);

  const handleCulinaryThemeChange = (themeKey: string) => {
    const normalizedKey = themeKey === "black-truffle" ? "truffle" : themeKey;
    setCulinaryTheme(normalizedKey);
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = normalizedKey;
      document.documentElement.setAttribute("data-theme", normalizedKey);
      localStorage.setItem("kartli-theme", normalizedKey);
      localStorage.setItem("culinary-theme", normalizedKey);
      localStorage.setItem("theme", normalizedKey);
      document.cookie = `kartli-theme=${normalizedKey}; path=/; max-age=31536000; SameSite=Lax`;
      document.cookie = `culinary-theme=${normalizedKey}; path=/; max-age=31536000; SameSite=Lax`;
    }
    const selected = CULINARY_THEMES.find((t) => t.id === normalizedKey);
    toast.success(`Theme updated to ${selected?.name || normalizedKey}`);
  };

  const initial = (user.username || "?").charAt(0).toUpperCase();

  const handleSavePreferences = async () => {
    setIsSaving(true);
    try {
      await updatePreferredCurrencyAction(preferredCurrency);
      toast.success("Preferences updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update preferences");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    toast.info("Password update functionality is coming soon");
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto mb-6 bg-muted/70 border border-border/80 p-1 rounded-2xl">
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
          <Card className="border border-border/80 bg-card rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border border-border/80">
                  <AvatarFallback className="bg-secondary text-xl font-bold text-foreground">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-foreground tracking-tight">
                      @{user.username}
                    </h2>
                    <Badge variant="secondary" className="text-[10px]">
                      Active
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Registered Kitchen Member
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs text-muted-foreground font-mono">
                  ID: {user.id.slice(0, 8)}...
                </Badge>
                <CopyButton text={user.id} label="Copy Full ID" size="sm" />
              </div>
            </div>

            <Separator className="bg-border/60" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="profile-username">Username</Label>
                <Input
                  id="profile-username"
                  value={user.username}
                  readOnly
                  disabled
                  className="rounded-xl bg-muted/40 font-mono text-foreground"
                />
                <span className="text-[11px] text-muted-foreground block">
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
                  className="rounded-xl bg-muted/40 font-medium text-foreground"
                />
                <span className="text-[11px] text-muted-foreground block">
                  Managed via NextAuth.js / Auth.js v5.
                </span>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 2: Preferences */}
        <TabsContent value="preferences" className="space-y-6 animate-in fade-in-50">
          <Card className="border border-border/80 bg-card rounded-3xl p-6 sm:p-8 space-y-6">
            {/* 1. Appearance / Light & Dark Mode + Culinary Color Themes */}
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="space-y-0.5">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Palette className="w-5 h-5 text-accent-primary" />
                    <span>Light &amp; Dark Mode</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Choose your preferred contrast mode (Light, Dark, or System default).
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={`h-12 rounded-2xl flex items-center justify-center gap-2 font-semibold text-xs border transition-all cursor-pointer shadow-xs ${
                      theme === "light"
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                    <span>Light</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={`h-12 rounded-2xl flex items-center justify-center gap-2 font-semibold text-xs border transition-all cursor-pointer shadow-xs ${
                      theme === "dark"
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                    <span>Dark</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("system")}
                    className={`h-12 rounded-2xl flex items-center justify-center gap-2 font-semibold text-xs border transition-all cursor-pointer shadow-xs ${
                      theme === "system"
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <Laptop className="w-4 h-4" />
                    <span>System</span>
                  </button>
                </div>
              </div>

              {/* Culinary Color Themes Card Grid */}
              <div className="space-y-3">
                <div className="space-y-0.5">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <UtensilsCrossed className="w-5 h-5 text-accent-primary" />
                    <span>Culinary Color Themes</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Choose an artisanal food-inspired palette for your personal kartli workspace.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {CULINARY_THEMES.map((theme) => {
                    const isSelected = culinaryTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => handleCulinaryThemeChange(theme.id)}
                        className={`flex flex-col justify-between p-4 rounded-xl border transition-all h-[110px] text-left cursor-pointer ${
                          isSelected
                            ? "border-accent-primary bg-accent-primary/5 ring-2 ring-accent-primary/20 shadow-xs"
                            : "bg-card border-border hover:border-primary/60 hover:bg-muted/30"
                        }`}
                      >
                        {/* Top Row */}
                        <div className="flex items-start justify-between gap-2 w-full">
                          <div>
                            <div className="text-sm font-semibold text-foreground">
                              {theme.name}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {theme.subtitle}
                            </div>
                          </div>

                          {isSelected ? (
                            <div className="w-5 h-5 rounded-full bg-accent-primary text-primary-foreground flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-border shrink-0" />
                          )}
                        </div>

                        {/* Bottom Row */}
                        <div className="flex items-center justify-between pt-2 border-t border-border/40 mt-auto w-full">
                          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                            Palette
                          </span>
                          <div className="flex items-center gap-1.5">
                            {theme.colors.map((hex, idx) => (
                              <span
                                key={idx}
                                className="w-3.5 h-3.5 rounded-full border border-black/20 dark:border-white/10 shrink-0 shadow-xs"
                                style={{ backgroundColor: hex }}
                              />
                            ))}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <Separator className="bg-border/60" />

            {/* 2. Notification Preferences & Alerts */}
            <div className="space-y-4">
              <CardHeader className="p-0 space-y-1">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  <span>Notification Preferences</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Configure when and how you receive grocery and kitchen status alerts.
                </CardDescription>
              </CardHeader>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/40 border border-border/70">
                  <div className="space-y-0.5">
                    <Label htmlFor="notify-pantry" className="text-sm font-medium text-foreground cursor-pointer">
                      Pantry Restock Alerts
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Get notified when an item in your kitchen is marked as Empty.
                    </p>
                  </div>
                  <Switch
                    id="notify-pantry"
                    checked={notifyPantry}
                    onCheckedChange={setNotifyPantry}
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/40 border border-border/70">
                  <div className="space-y-0.5">
                    <Label htmlFor="notify-shopping" className="text-sm font-medium text-foreground cursor-pointer">
                      Shopping Cart &amp; Checkout Updates
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Receive confirmation when a roommate checks out groceries.
                    </p>
                  </div>
                  <Switch
                    id="notify-shopping"
                    checked={notifyShopping}
                    onCheckedChange={setNotifyShopping}
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/40 border border-border/70">
                  <div className="space-y-0.5">
                    <Label htmlFor="notify-members" className="text-sm font-medium text-foreground cursor-pointer">
                      Member Activity
                    </Label>
                    <p className="text-xs text-muted-foreground">
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
            </div>

            <Separator className="bg-border/60" />

            {/* 3. Preferred Currency (Pinned at bottom as secondary setting) */}
            <div className="space-y-3">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-accent-primary" />
                  <span>Preferred Currency</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Set your default currency for receipts, shopping cart items, and automated refund conversions.
                </p>
              </div>

              <div className="pt-1 max-w-sm">
                <select
                  id="preferred-currency-select"
                  value={preferredCurrency}
                  onChange={(e) => setPreferredCurrency(e.target.value)}
                  className="w-full h-10 rounded-xl bg-card border border-border px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-xs"
                  aria-label="Preferred Currency"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code} className="bg-card text-foreground">
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <Button onClick={handleSavePreferences} disabled={isSaving} className="rounded-xl font-semibold">
                {isSaving ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 3: Security & Danger Zone */}
        <TabsContent value="security" className="space-y-6 animate-in fade-in-50">
          <Card className="border-border bg-card rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <CardHeader className="p-0 space-y-1">
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <Key className="w-5 h-5 text-muted-foreground" />
                <span>Password &amp; Security</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
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

            <Separator className="bg-border/60" />

            {/* Danger Zone */}
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Danger Zone</h4>
                  <p className="text-xs text-muted-foreground">
                    Irreversible actions related to your account sessions.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-foreground">Sign Out of This Device</span>
                  <p className="text-[11px] text-muted-foreground">
                    End your current session and return to the login screen.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    await logoutAction();
                  }}
                  className="rounded-xl font-medium"
                >
                  Sign Out
                </Button>
              </div>

              <Separator className="bg-destructive/20" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-foreground">Sign Out of All Devices</span>
                  <p className="text-[11px] text-muted-foreground">
                    Invalidates active JWT tokens across other browsers.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await logoutAction();
                  }}
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 rounded-xl font-medium"
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
