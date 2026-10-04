"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
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
    culinary_theme?: string;
    theme?: string;
  };
}

interface CulinaryTheme {
  id: string;
  name: string;
  subtitle: string;
  colors: [string, string, string]; // [Primary, Success/In-Cart, Warning/Needed]
}

export function ProfileSettings({ user }: ProfileSettingsProps) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const culinaryThemes: CulinaryTheme[] = [
    {
      id: "black-truffle",
      name: t.profile.themeBlackTruffleTitle,
      subtitle: t.profile.themeBlackTruffleDesc,
      colors: ["#34d399", "#10b981", "#22d3ee"],
    },
    {
      id: "velvet-fig",
      name: t.profile.themeVelvetFigTitle,
      subtitle: t.profile.themeVelvetFigDesc,
      colors: ["#9e55b6", "#34d399", "#c084fc"],
    },
  ];

  const [activeTab, setActiveTab] = useState("account");
  const { theme, setTheme } = useTheme();

  const userTheme = user.culinary_theme || user.theme;
  const [savedTheme, setSavedTheme] = useState<string>("black-truffle");
  const currentTheme = userTheme || savedTheme || "black-truffle";

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
        userTheme ||
        document.documentElement.dataset.culinaryTheme ||
        document.documentElement.getAttribute("data-culinary-theme") ||
        document.documentElement.dataset.theme ||
        document.documentElement.getAttribute("data-theme") ||
        localStorage.getItem("kartli-theme") ||
        localStorage.getItem("culinary-theme") ||
        "black-truffle";
      const normalized =
        active === "plum" || active === "velvet-fig"
          ? "velvet-fig"
          : "black-truffle";
      setSavedTheme(normalized);
    }
  }, [userTheme]);

  const handleCulinaryThemeChange = (themeKey: string) => {
    const normalizedKey =
      themeKey === "plum" || themeKey === "velvet-fig"
        ? "velvet-fig"
        : "black-truffle";
    setSavedTheme(normalizedKey);
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = normalizedKey;
      document.documentElement.setAttribute("data-theme", normalizedKey);
      document.documentElement.dataset.culinaryTheme = normalizedKey;
      document.documentElement.setAttribute("data-culinary-theme", normalizedKey);
      localStorage.setItem("kartli-theme", normalizedKey);
      localStorage.setItem("culinary-theme", normalizedKey);
      document.cookie = `kartli-theme=${normalizedKey}; path=/; max-age=31536000; SameSite=Lax`;
      document.cookie = `culinary-theme=${normalizedKey}; path=/; max-age=31536000; SameSite=Lax`;
    }
    const selected = culinaryThemes.find((t) => t.id === normalizedKey);
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
      {/* Dedicated back-navigation row with mb-8 */}
      <div className="mb-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t.profile.backToKitchens}</span>
        </Link>
      </div>

      {/* Page Header */}
      <div className="space-y-1 pb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          {t.profile.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t.profile.subtitle}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto mb-6 bg-muted/70 border border-border/80 p-1 rounded-2xl">
          <TabsTrigger value="account" className="rounded-xl text-xs font-semibold">
            {t.profile.accountTab}
          </TabsTrigger>
          <TabsTrigger value="preferences" className="rounded-xl text-xs font-semibold">
            {t.profile.preferencesTab}
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-xl text-xs font-semibold">
            {t.profile.securityTab}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Account Info */}
        <TabsContent value="account" className="space-y-6 animate-in fade-in-50">
          <Card className="p-6 rounded-2xl border border-border/80 bg-card shadow-sm space-y-6">
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
                <Label htmlFor="profile-username">{t.profile.usernameLabel}</Label>
                <Input
                  id="profile-username"
                  value={user.username}
                  readOnly
                  disabled
                  className="rounded-xl bg-muted/40 font-mono text-foreground"
                />
                <span className="text-[11px] text-muted-foreground block">
                  {t.profile.usernameHelper}
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-auth-type">{t.profile.authMethodLabel}</Label>
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
          {/* Card 1: Appearance & Culinary Themes */}
          <Card className="p-6 rounded-2xl border border-border/80 bg-card shadow-sm space-y-6">
            <div className="space-y-3">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Palette className="w-5 h-5 text-accent-primary" />
                  <span>{t.profile.themeLabel}</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t.profile.contrastModeSub}
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
                  <span>{t.profile.lightMode}</span>
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
                  <span>{t.profile.darkMode}</span>
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
                  <span>{t.profile.systemMode}</span>
                </button>
              </div>
            </div>

            <Separator className="bg-border/60" />

            {/* Culinary Color Themes Card Grid */}
            <div className="space-y-3">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-accent-primary" />
                  <span>{t.profile.culinaryThemesTitle}</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t.profile.culinaryThemesSub}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {culinaryThemes.map((theme) => {
                  const isSelected =
                    theme.id ===
                    (currentTheme === "plum" || currentTheme === "velvet-fig"
                      ? "velvet-fig"
                      : "black-truffle");
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
                          {t.profile.paletteLabel}
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
          </Card>

          {/* Card 2: Notification Preferences & Alerts */}
          <Card className="p-6 rounded-2xl border border-border/80 bg-card shadow-sm space-y-4">
            <CardHeader className="p-0 space-y-1">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <span>{t.profile.notifTitle}</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {t.profile.notifSub}
              </CardDescription>
            </CardHeader>

            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/40 border border-border/70">
                <div className="space-y-0.5">
                  <Label htmlFor="notify-pantry" className="text-sm font-medium text-foreground cursor-pointer">
                    {t.profile.notifRestockTitle}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t.profile.notifRestockDesc}
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
                    {t.profile.notifCheckoutTitle}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t.profile.notifCheckoutDesc}
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
                    {t.profile.notifMemberTitle}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t.profile.notifMemberDesc}
                  </p>
                </div>
                <Switch
                  id="notify-members"
                  checked={notifyMembers}
                  onCheckedChange={setNotifyMembers}
                />
              </div>
            </div>
          </Card>

          {/* Card 3: Preferred Currency */}
          <Card className="p-6 rounded-2xl border border-border/80 bg-card shadow-sm space-y-4">
            <div className="space-y-0.5">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-accent-primary" />
                <span>{t.profile.currencyLabel}</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                {t.profile.currencyHelper}
              </p>
            </div>

            <div className="pt-1 max-w-sm">
              <select
                id="preferred-currency-select"
                value={preferredCurrency}
                onChange={(e) => setPreferredCurrency(e.target.value)}
                className="w-full h-10 rounded-xl bg-card border border-border px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-xs"
                aria-label={t.profile.currencyLabel}
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code} className="bg-card text-foreground">
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-3 flex justify-end">
              <Button onClick={handleSavePreferences} disabled={isSaving} className="rounded-xl font-semibold">
                {isSaving ? "Saving..." : t.profile.savePreferences}
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 3: Security & Danger Zone */}
        <TabsContent value="security" className="space-y-6 animate-in fade-in-50">
          <Card className="p-6 rounded-2xl border border-border/80 bg-card shadow-sm space-y-6">
            <CardHeader className="p-0 space-y-1">
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <Key className="w-5 h-5 text-muted-foreground" />
                <span>{t.profile.securitySectionTitle}</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {t.profile.securitySectionSub}
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSaveSecurity} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">{t.profile.currentPasswordLabel}</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="••••••••"
                  className="rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">{t.profile.newPasswordLabel}</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder={t.profile.newPasswordPlaceholder}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">{t.profile.confirmPasswordLabel}</Label>
                  <Input
                    id="confirm-new-password"
                    type="password"
                    placeholder={t.profile.confirmPasswordPlaceholder}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" variant="secondary" className="rounded-xl font-semibold">
                  {t.profile.updatePasswordBtn}
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
                  <h4 className="text-sm font-bold text-foreground">{t.profile.dangerZoneTitle}</h4>
                  <p className="text-xs text-muted-foreground">
                    {t.profile.dangerZoneSub}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-foreground">{t.profile.signOutDeviceTitle}</span>
                  <p className="text-[11px] text-muted-foreground">
                    {t.profile.signOutDeviceSub}
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
                  {t.profile.signOutBtn}
                </Button>
              </div>

              <Separator className="bg-destructive/20" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-foreground">{t.profile.signOutAllTitle}</span>
                  <p className="text-[11px] text-muted-foreground">
                    {t.profile.signOutAllSub}
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
                  {t.profile.clearAllSessionsBtn}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Understated GitHub Repository Link Card */}
      <a
        href="https://github.com/randakamal/kartli"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center justify-between p-4 rounded-2xl border border-border/80 bg-card hover:bg-muted/40 hover:border-border transition-all duration-200 shadow-2xs cursor-pointer mt-6"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-muted/60 border border-border/60 text-muted-foreground group-hover:text-foreground transition-colors">
            <svg
              className="w-4 h-4 fill-current"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
          </div>
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5 font-mono">
              Open Source culinary operating system
            </span>
            <p className="text-[11px] text-muted-foreground">
              {t.profile.openSourceNotice}
            </p>
          </div>
        </div>

        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
      </a>
    </div>
  );
}
