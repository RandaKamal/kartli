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
import { toast } from "sonner";
import { useI18n } from "@/context/i18n-context";

interface ProfileSettingsProps {
  user: {
    id: string;
    username: string;
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
    id: "saffron",
    name: "Saffron Citrus",
    subtitle: "Warm Mediterranean",
    colors: ["#e9c46a", "#90be6d", "#f4a261"],
  },
  {
    id: "truffle",
    name: "Black Truffle",
    subtitle: "Minimalist High-Contrast Luxury",
    colors: ["#f4f4f5", "#34d399", "#fbbf24"],
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
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState("account");
  const { theme, setTheme } = useTheme();
  const [culinaryTheme, setCulinaryTheme] = useState<string>("saffron");
  const [notifyPantry, setNotifyPantry] = useState(true);
  const [notifyShopping, setNotifyShopping] = useState(true);
  const [notifyMembers, setNotifyMembers] = useState(false);

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
        "saffron";
      setCulinaryTheme(active);
    }
  }, []);

  const handleCulinaryThemeChange = (themeKey: string) => {
    setCulinaryTheme(themeKey);
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = themeKey;
      document.documentElement.setAttribute("data-theme", themeKey);
      localStorage.setItem("kartli-theme", themeKey);
      localStorage.setItem("culinary-theme", themeKey);
      document.cookie = `kartli-theme=${themeKey}; path=/; max-age=31536000; SameSite=Lax`;
      document.cookie = `culinary-theme=${themeKey}; path=/; max-age=31536000; SameSite=Lax`;
    }
    const selected = CULINARY_THEMES.find((t) => t.id === themeKey);
    toast.success(`Theme updated to ${selected?.name || themeKey}`);
  };

  const initial = (user.username || "?").charAt(0).toUpperCase();

  const handleSavePreferences = () => {
    toast.success(t("profile.savePreferences") + " ✓");
  };

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    toast.info(t("profile.passwordUpdateComingSoon"));
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto mb-6 bg-muted/70 border border-border/80 p-1 rounded-2xl">
          <TabsTrigger value="account" className="rounded-xl text-xs font-semibold">
            {t("profile.tabAccount")}
          </TabsTrigger>
          <TabsTrigger value="preferences" className="rounded-xl text-xs font-semibold">
            {t("profile.tabPreferences")}
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-xl text-xs font-semibold">
            {t("profile.tabSecurity")}
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
                      {t("profile.activeBadge")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("profile.memberRole")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs text-muted-foreground font-mono">
                  ID: {user.id.slice(0, 8)}...
                </Badge>
                <CopyButton text={user.id} label={t("profile.copyFullId")} size="sm" />
              </div>
            </div>

            <Separator className="bg-border/60" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="profile-username">{t("profile.usernameLabel")}</Label>
                <Input
                  id="profile-username"
                  value={user.username}
                  readOnly
                  disabled
                  className="rounded-xl bg-muted/40 font-mono text-foreground"
                />
                <span className="text-[11px] text-muted-foreground block">
                  {t("profile.usernameDescription")}
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-auth-type">{t("profile.authMethodLabel")}</Label>
                <Input
                  id="profile-auth-type"
                  value="Credentials (Encrypted JWT Session)"
                  readOnly
                  disabled
                  className="rounded-xl bg-muted/40 font-medium text-foreground"
                />
                <span className="text-[11px] text-muted-foreground block">
                  {t("profile.authMethodDescription")}
                </span>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 2: Preferences */}
        <TabsContent value="preferences" className="space-y-6 animate-in fade-in-50">
          <Card className="border border-border/80 bg-card rounded-3xl p-6 sm:p-8 space-y-6">
            {/* Appearance / Light & Dark Mode */}
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

            <Separator className="bg-border/60" />

            {/* Notification Preferences */}
            <CardHeader className="p-0 space-y-1">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <span>{t("profile.notificationsTitle")}</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {t("profile.notificationsSubtitle")}
              </CardDescription>
            </CardHeader>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/40 border border-border/70">
                <div className="space-y-0.5">
                  <Label htmlFor="notify-pantry" className="text-sm font-medium text-foreground cursor-pointer">
                    {t("profile.pantryAlerts")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("profile.pantryAlertsSub")}
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
                    {t("profile.shoppingAlerts")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("profile.shoppingAlertsSub")}
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
                    {t("profile.memberAlerts")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("profile.memberAlertsSub")}
                  </p>
                </div>
                <Switch
                  id="notify-members"
                  checked={notifyMembers}
                  onCheckedChange={setNotifyMembers}
                />
              </div>
            </div>

            <Separator className="bg-border/60" />

            {/* Interactive Culinary Color Themes Card Grid */}
            <div className="space-y-3">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-accent-primary" />
                  <span>{t("profile.themesTitle")}</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("profile.themesSubtitle")}
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

            <div className="pt-2 flex justify-end">
              <Button onClick={handleSavePreferences} className="rounded-xl font-semibold">
                {t("profile.savePreferences")}
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
                <span>{t("profile.tabSecurity")}</span>
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
                  {t("profile.saveSecurity")}
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
                  <h4 className="text-sm font-bold text-foreground">{t("profile.dangerZone")}</h4>
                  <p className="text-xs text-muted-foreground">
                    {t("profile.dangerDescription")}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-foreground">{t("profile.logoutButton")}</span>
                  <p className="text-[11px] text-muted-foreground">
                    {t("profile.dangerDescription")}
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
                  {t("nav.logOut")}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
