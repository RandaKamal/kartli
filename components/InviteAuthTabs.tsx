"use client";

import { useState, useTransition, useRef } from "react";
import { registerUserAction, loginUserAction } from "@/app/actions/auth";
import { Eye, EyeOff, Check, X, Loader2, BadgeCheck } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

const labelCls =
  "text-[11px] font-semibold tracking-wider text-muted-foreground/80 mb-1.5 block font-sans";
const inputCls =
  "h-11 w-full rounded-xl bg-secondary/30 border border-border/60 px-3.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all";
const ctaCls =
  "h-12 w-full rounded-2xl bg-foreground text-background font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-md shadow-foreground/5 mt-4 cursor-pointer disabled:opacity-50 disabled:pointer-events-none";
const eyeCls =
  "absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer";

export function InviteAuthTabs({
  inviteToken,
  suggestedName,
}: {
  inviteToken: string;
  suggestedName: string;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"register" | "login">("register");
  const callbackUrl = `/invite/${encodeURIComponent(inviteToken)}`;

  // Registration state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [registerError, setRegisterError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isRegisterPending, startRegisterTransition] = useTransition();
  const [isLoginPending, startLoginTransition] = useTransition();

  const registerFormRef = useRef<HTMLFormElement>(null);
  const loginFormRef = useRef<HTMLFormElement>(null);

  const isMatching = confirmPassword.length > 0 && password === confirmPassword;
  const isMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleRegisterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isRegisterPending) return;

    if (password !== confirmPassword) {
      const err = t.invite.passwordsMismatchError;
      setRegisterError(err);
      toast.error(err);
      return;
    }

    setRegisterError(null);
    const formData = new FormData(e.currentTarget);

    startRegisterTransition(async () => {
      try {
        const result = await registerUserAction(null, formData);
        if (result?.error) {
          setRegisterError(result.error);
          toast.error(result.error);
        } else {
          toast.success(t.invite.accountCreated);
        }
      } catch (err: any) {
        if (err?.message?.includes("NEXT_REDIRECT")) return;
        const msg = err.message || t.invite.registerFailed;
        setRegisterError(msg);
        toast.error(msg);
      }
    });
  };

  const handleLoginSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoginPending) return;

    setLoginError(null);
    const formData = new FormData(e.currentTarget);

    startLoginTransition(async () => {
      try {
        const result = await loginUserAction(null, formData);
        if (result?.error) {
          setLoginError(result.error);
          toast.error(result.error);
        } else {
          toast.success(t.invite.signedIn);
        }
      } catch (err: any) {
        if (err?.message?.includes("NEXT_REDIRECT")) return;
        const msg = err.message || t.invite.loginFailed;
        setLoginError(msg);
        toast.error(msg);
      }
    });
  };

  const handleRegisterKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isRegisterPending) {
      e.preventDefault();
      registerFormRef.current?.requestSubmit();
    }
  };

  const handleLoginKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoginPending) {
      e.preventDefault();
      loginFormRef.current?.requestSubmit();
    }
  };

  const errBox = (msg: string) => (
    <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-xl font-medium text-center animate-in fade-in-50">
      {msg}
    </div>
  );

  const passwordField = (opts: {
    id: string;
    value?: string;
    onChange?: (v: string) => void;
    show: boolean;
    toggle: () => void;
    autoComplete: string;
    placeholder: string;
    label: string;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    minLength?: number;
    name: string;
  }) => (
    <div>
      <label htmlFor={opts.id} className={labelCls}>{opts.label}</label>
      <div className="relative">
        <input
          id={opts.id}
          type={opts.show ? "text" : "password"}
          name={opts.name}
          required
          minLength={opts.minLength}
          {...(opts.onChange
            ? { value: opts.value, onChange: (e: React.ChangeEvent<HTMLInputElement>) => opts.onChange!(e.target.value) }
            : {})}
          autoComplete={opts.autoComplete}
          onKeyDown={opts.onKeyDown}
          placeholder={opts.placeholder}
          className={`${inputCls} pr-12`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={opts.toggle}
          className={eyeCls}
          title={opts.show ? t.invite.hidePassword : t.invite.showPassword}
          aria-label={opts.show ? t.invite.hidePassword : t.invite.showPassword}
        >
          {opts.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <Tabs
      value={tab}
      onValueChange={(val) => {
        setTab(val as "register" | "login");
        setRegisterError(null);
        setLoginError(null);
      }}
      className="w-full"
    >
      <TabsList className="w-full grid grid-cols-2 p-1 bg-secondary/50 rounded-xl mb-6 text-xs font-semibold h-auto border-0">
        <TabsTrigger
          value="register"
          className="h-9 rounded-lg text-xs font-semibold border border-transparent text-muted-foreground hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border-border/50 transition-all"
        >
          {t.invite.newAccountTab}
        </TabsTrigger>
        <TabsTrigger
          value="login"
          className="h-9 rounded-lg text-xs font-semibold border border-transparent text-muted-foreground hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border-border/50 transition-all"
        >
          {t.invite.existingAccountTab}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="register" className="mt-0">
        <form ref={registerFormRef} onSubmit={handleRegisterSubmit} className="space-y-4 text-left">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <input type="hidden" name="inviteToken" value={inviteToken} />
          {registerError && errBox(registerError)}

          <div>
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="invite-username" className={labelCls}>{t.invite.usernameLabel}</label>
              {suggestedName && (
                <span className="mb-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  <BadgeCheck className="w-3 h-3" />
                  {t.invite.reservedForYou}
                </span>
              )}
            </div>
            <input
              id="invite-username"
              type="text"
              name="username"
              required
              autoComplete="username"
              onKeyDown={handleRegisterKeyDown}
              defaultValue={suggestedName.toLowerCase().replace(/\s+/g, "")}
              placeholder={t.invite.usernamePlaceholder}
              className={inputCls}
            />
            <span className="text-[11px] text-muted-foreground block mt-1.5">
              {t.invite.usernameHelper}
            </span>
          </div>

          {passwordField({
            id: "invite-password",
            name: "password",
            value: password,
            onChange: setPassword,
            show: showPassword,
            toggle: () => setShowPassword(!showPassword),
            autoComplete: "new-password",
            placeholder: t.invite.passwordPlaceholder,
            label: t.invite.passwordLabel,
            onKeyDown: handleRegisterKeyDown,
            minLength: 6,
          })}

          <div>
            {passwordField({
              id: "invite-confirmPassword",
              name: "confirmPassword",
              value: confirmPassword,
              onChange: setConfirmPassword,
              show: showConfirmPassword,
              toggle: () => setShowConfirmPassword(!showConfirmPassword),
              autoComplete: "new-password",
              placeholder: t.invite.confirmPasswordPlaceholder,
              label: t.invite.confirmPasswordLabel,
              onKeyDown: handleRegisterKeyDown,
              minLength: 6,
            })}
            {confirmPassword.length > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                {isMatching ? (
                  <span className="text-emerald-700 dark:text-emerald-300 flex items-center gap-1 font-medium animate-in fade-in">
                    <Check className="w-3.5 h-3.5" /> {t.invite.passwordsMatch}
                  </span>
                ) : (
                  <span className="text-destructive flex items-center gap-1 font-medium animate-in fade-in">
                    <X className="w-3.5 h-3.5" /> {t.invite.passwordsMismatch}
                  </span>
                )}
              </div>
            )}
          </div>

          <button type="submit" disabled={isRegisterPending || isMismatch} className={ctaCls}>
            {isRegisterPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isRegisterPending ? t.invite.creatingAccount : t.invite.submitBtnNew}</span>
          </button>
        </form>
      </TabsContent>

      <TabsContent value="login" className="mt-0">
        <form ref={loginFormRef} onSubmit={handleLoginSubmit} className="space-y-4 text-left">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <input type="hidden" name="inviteToken" value={inviteToken} />
          {loginError && errBox(loginError)}

          <div>
            <label htmlFor="invite-login-username" className={labelCls}>{t.invite.usernameLabel}</label>
            <input
              id="invite-login-username"
              type="text"
              name="username"
              required
              autoComplete="username"
              onKeyDown={handleLoginKeyDown}
              placeholder={t.invite.existingUsernamePlaceholder}
              className={inputCls}
            />
          </div>

          {passwordField({
            id: "invite-login-password",
            name: "password",
            show: showLoginPassword,
            toggle: () => setShowLoginPassword(!showLoginPassword),
            autoComplete: "current-password",
            placeholder: "••••••••",
            label: t.invite.passwordLabel,
            onKeyDown: handleLoginKeyDown,
          })}

          <button type="submit" disabled={isLoginPending} className={ctaCls}>
            {isLoginPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isLoginPending ? t.invite.signingIn : t.invite.submitBtnExisting}</span>
          </button>
        </form>
      </TabsContent>
    </Tabs>
  );
}
