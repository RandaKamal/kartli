"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  User,
  Shield,
  Bell,
  Palette,
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
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { logoutAction } from "@/app/actions/auth";
import { updatePreferredCurrencyAction } from "@/app/actions/user";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import { toast } from "sonner";
import { PasswordChangeForm, AccountDeletionZone } from "@/components/settings/UserSettingsModal";
import { NotificationToggle, usePushNotifications } from "@/components/NotificationToggle";
import { updateNotificationPrefAction } from "@/app/actions/push";
import type { NotificationPrefs, PushKind } from "@/lib/push";

interface ProfileSettingsProps {
  user: {
    id: string;
    username: string;
    preferred_currency?: string;
    culinary_theme?: string;
    theme?: string;
  };
  notificationPrefs: NotificationPrefs;
}

interface CulinaryTheme {
  id: string;
  name: string;
  subtitle: string;
  colors: [string, string, string]; // [Primary, Success/In-Cart, Warning/Needed]
}

export function ProfileSettings({ user, notificationPrefs }: ProfileSettingsProps) {
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

  const [activeTab, setActiveTab] = useState("preferences");
  const { theme, setTheme } = useTheme();

  const userTheme = user.culinary_theme || user.theme;
  const [savedTheme, setSavedTheme] = useState<string>("black-truffle");
  const currentTheme = userTheme || savedTheme || "black-truffle";

  const [preferredCurrency, setPreferredCurrency] = useState<string>(user.preferred_currency || "EUR");
  const [prefs, setPrefs] = useState<NotificationPrefs>(notificationPrefs);
  const push = usePushNotifications();
  const prefsLocked = push.status !== "on";
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // "account" is the removed tab; old links to it land on preferences.
    if (tabParam === "settings" || tabParam === "preferences" || tabParam === "account") {
      setActiveTab("preferences");
    } else if (tabParam === "security") {
      setActiveTab("security");
    }
    // Dashboard mute buttons link to /profile?tab=preferences#notifications
    if (window.location.hash === "#notifications") {
      requestAnimationFrame(() =>
        document.getElementById("notifications")?.scrollIntoView({ behavior: "smooth", block: "start" })
      );
    }
  }, [tabParam]);

  const handlePrefChange = async (kind: PushKind, enabled: boolean) => {
    setPrefs((prev) => ({ ...prev, [kind]: enabled }));
    try {
      await updateNotificationPrefAction(kind, enabled);
    } catch {
      setPrefs((prev) => ({ ...prev, [kind]: !enabled }));
      toast.error(t.profile.notifPrefSaveFailed);
    }
  };

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
      <div className="pb-2">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
          {t.profile.title}
        </h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-xs mx-auto mb-6 h-9 bg-secondary/60 border border-border/70 p-0.5 rounded-lg items-center">
          <TabsTrigger value="preferences" className="w-full h-full rounded-md text-xs font-medium flex items-center justify-center text-center leading-none">
            {t.profile.preferencesTab}
          </TabsTrigger>
          <TabsTrigger value="security" className="w-full h-full rounded-md text-xs font-medium flex items-center justify-center text-center leading-none">
            {t.profile.securityTab}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Preferences */}
        <TabsContent value="preferences" className="space-y-6 animate-in fade-in-50">
          {/* Card 1: Appearance & Culinary Themes */}
          <Card className="p-4 sm:p-5 rounded-xl border border-border/70 bg-card shadow-xs space-y-5">
            <div className="space-y-3">
              <div className="space-y-0.5">
                <h3 className="text-sm sm:text-base font-semibold text-foreground">
                  {t.profile.themeLabel}
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`w-full h-9 px-2 sm:px-3 rounded-lg flex items-center justify-center gap-1.5 font-medium text-xs border transition-colors cursor-pointer select-none ${
                    theme === "light"
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-transparent shadow-xs"
                      : "bg-secondary/40 text-muted-foreground border-border/60 hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Sun className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.profile.lightMode}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`w-full h-9 px-2 sm:px-3 rounded-lg flex items-center justify-center gap-1.5 font-medium text-xs border transition-colors cursor-pointer select-none ${
                    theme === "dark"
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-transparent shadow-xs"
                      : "bg-secondary/40 text-muted-foreground border-border/60 hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Moon className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.profile.darkMode}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("system")}
                  className={`w-full h-9 px-2 sm:px-3 rounded-lg flex items-center justify-center gap-1.5 font-medium text-xs border transition-colors cursor-pointer select-none ${
                    theme === "system"
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-transparent shadow-xs"
                      : "bg-secondary/40 text-muted-foreground border-border/60 hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.profile.systemMode}</span>
                </button>
              </div>
            </div>

            <Separator className="bg-border/60" />

            {/* Culinary Color Themes Card Grid */}
            <div className="space-y-3">
              <div className="space-y-0.5">
                <h3 className="text-sm sm:text-base font-semibold text-foreground">
                  {t.profile.culinaryThemesTitle}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
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
                      className={`flex flex-col justify-between p-3.5 rounded-lg border transition-all min-h-[96px] gap-2.5 w-full text-left cursor-pointer ${
                        isSelected
                          ? "border-foreground/40 bg-secondary/60 shadow-xs"
                          : "bg-card border-border/70 hover:border-border hover:bg-secondary/30"
                      }`}
                    >
                      {/* Top Row */}
                      <div className="flex items-start justify-between gap-2 w-full">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-foreground">
                            {theme.name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {theme.subtitle}
                          </div>
                        </div>

                        {isSelected ? (
                          <div className="mt-0.5 w-4 h-4 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="mt-0.5 w-4 h-4 rounded-full border border-border shrink-0" />
                        )}
                      </div>

                      {/* Bottom Row */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/40 mt-auto w-full">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono leading-none">
                          {t.profile.paletteLabel}
                        </span>
                        <div className="inline-flex items-center justify-end gap-1.5 shrink-0">
                          {theme.colors.map((hex, idx) => (
                            <span
                              key={idx}
                              className="block w-3 h-3 rounded-full border border-black/10 dark:border-white/10 shrink-0"
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
          <Card
            id="notifications"
            className="p-4 sm:p-5 rounded-xl border border-border/70 bg-card shadow-xs space-y-4 scroll-mt-24"
          >
            <CardHeader className="p-0 space-y-1">
              <CardTitle className="text-sm sm:text-base font-semibold text-foreground">
                {t.profile.notifTitle}
              </CardTitle>
            </CardHeader>

            {/* Device push switch: gates the per-type preferences below */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border/70 bg-muted/20">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">{t.profile.notificationsLabel}</p>
                <p className="text-xs text-muted-foreground">
                  {push.status === "unsupported"
                    ? t.profile.notificationsUnsupported
                    : t.profile.notificationsSubtext}
                </p>
              </div>
              <div className="shrink-0">
                <NotificationToggle push={push} />
              </div>
            </div>

            <div className="space-y-2">
              {prefsLocked && push.status !== "checking" && (
                <p className="text-xs text-muted-foreground">{t.profile.notificationsLockedHint}</p>
              )}

              <div
                className={`flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/70 transition-opacity ${prefsLocked ? "opacity-50" : ""}`}
              >
                <div className="space-y-0.5">
                  <Label htmlFor="notify-pantry" className="text-xs sm:text-sm font-medium text-foreground cursor-pointer">
                    {t.profile.notifRestockTitle}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t.profile.notifRestockDesc}
                  </p>
                </div>
                <Switch
                  id="notify-pantry"
                  checked={prefs.restock}
                  onCheckedChange={(v) => handlePrefChange("restock", v)}
                  disabled={prefsLocked}
                />
              </div>

              <div
                className={`flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/70 transition-opacity ${prefsLocked ? "opacity-50" : ""}`}
              >
                <div className="space-y-0.5">
                  <Label htmlFor="notify-shopping" className="text-xs sm:text-sm font-medium text-foreground cursor-pointer">
                    {t.profile.notifCheckoutTitle}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t.profile.notifCheckoutDesc}
                  </p>
                </div>
                <Switch
                  id="notify-shopping"
                  checked={prefs.checkout}
                  onCheckedChange={(v) => handlePrefChange("checkout", v)}
                  disabled={prefsLocked}
                />
              </div>

              <div
                className={`flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/70 transition-opacity ${prefsLocked ? "opacity-50" : ""}`}
              >
                <div className="space-y-0.5">
                  <Label htmlFor="notify-members" className="text-xs sm:text-sm font-medium text-foreground cursor-pointer">
                    {t.profile.notifMemberTitle}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t.profile.notifMemberDesc}
                  </p>
                </div>
                <Switch
                  id="notify-members"
                  checked={prefs.members}
                  onCheckedChange={(v) => handlePrefChange("members", v)}
                  disabled={prefsLocked}
                />
              </div>
            </div>
          </Card>

          {/* Card 3: Preferred Currency */}
          <Card className="p-4 sm:p-5 rounded-xl border border-border/70 bg-card shadow-xs space-y-3">
            <div className="space-y-0.5">
              <h3 className="text-sm sm:text-base font-semibold text-foreground">
                {t.profile.currencyLabel}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t.profile.currencyHelper}
              </p>
            </div>

            <div className="pt-0.5 max-w-xs">
              <select
                id="preferred-currency-select"
                value={preferredCurrency}
                onChange={(e) => setPreferredCurrency(e.target.value)}
                className="w-full h-9 rounded-lg bg-card border border-border/70 px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-foreground cursor-pointer shadow-xs"
                aria-label={t.profile.currencyLabel}
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code} className="bg-card text-foreground">
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex justify-end">
              <Button onClick={handleSavePreferences} disabled={isSaving} size="sm" className="rounded-lg font-medium text-xs h-8 px-3">
                {isSaving ? "Saving..." : t.profile.savePreferences}
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 2: Security & Danger Zone */}
        <TabsContent value="security" className="space-y-6 animate-in fade-in-50">
          <PasswordChangeForm />

          {/* Session Management */}
          <Card className="p-4 sm:p-6 rounded-2xl border border-border/80 bg-card shadow-sm space-y-6">
            <CardHeader className="p-0 space-y-1">
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <span>{t.profile.securitySectionTitle}</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {t.profile.securitySectionSub}
              </CardDescription>
            </CardHeader>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-foreground">{t.profile.signOutDeviceTitle}</span>
                  <p className="text-[11px] text-muted-foreground">
                    {t.profile.signOutDeviceSub}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await logoutAction();
                  }}
                  className="rounded-xl font-medium"
                >
                  {t.profile.signOutBtn}
                </Button>
              </div>

              <Separator className="bg-border/60" />

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

          {/* GDPR-compliant Account Deletion Zone */}
          <AccountDeletionZone />
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
