"use client";

import { useState, useTransition, useRef } from "react";
import { registerUserAction, loginUserAction } from "@/app/actions/auth";
import { Eye, EyeOff, Check, X, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function InviteAuthTabs({
  inviteToken,
  suggestedName,
}: {
  inviteToken: string;
  suggestedName: string;
}) {
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
      const err = "Passwords do not match. Please re-enter your password.";
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
          toast.success("Account created! Joining kitchen...");
        }
      } catch (err: any) {
        if (err?.message?.includes("NEXT_REDIRECT")) return;
        const msg = err.message || "Failed to create account. Please try again.";
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
          toast.success("Signed in! Joining kitchen...");
        }
      } catch (err: any) {
        if (err?.message?.includes("NEXT_REDIRECT")) return;
        const msg = err.message || "Failed to log in. Please try again.";
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

  return (
    <div className="space-y-6">
      <Tabs
        value={tab}
        onValueChange={(val) => {
          setTab(val as "register" | "login");
          setRegisterError(null);
          setLoginError(null);
        }}
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 w-full h-11 p-1 bg-zinc-950 border border-zinc-800 rounded-xl">
          <TabsTrigger value="register" className="rounded-lg text-xs sm:text-sm font-semibold">
            New User (Sign up)
          </TabsTrigger>
          <TabsTrigger value="login" className="rounded-lg text-xs sm:text-sm font-semibold">
            Existing User (Log in)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="register">
          <form
            ref={registerFormRef}
            onSubmit={handleRegisterSubmit}
            className="space-y-4 text-left pt-2"
          >
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <input type="hidden" name="inviteToken" value={inviteToken} />

            {registerError && (
              <div className="p-3 bg-accent-primary/10 border border-accent-primary/30 text-accent-primary text-xs rounded-xl font-medium text-center animate-in fade-in-50">
                {registerError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="invite-username">
                Account Username
              </Label>
              <Input
                id="invite-username"
                type="text"
                name="username"
                required
                autoComplete="username"
                onKeyDown={handleRegisterKeyDown}
                defaultValue={suggestedName.toLowerCase().replace(/\s+/g, "")}
                placeholder="e.g. sarah_42"
                className="rounded-xl"
              />
              <span className="text-[11px] text-zinc-500 block">
                Unique username for your personal account.
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-password">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="invite-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  onKeyDown={handleRegisterKeyDown}
                  placeholder="At least 6 characters"
                  className="rounded-xl pr-11"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition p-1 cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-confirmPassword">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="invite-confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  onKeyDown={handleRegisterKeyDown}
                  placeholder="Re-enter your password"
                  className="rounded-xl pr-11"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition p-1 cursor-pointer"
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Live Validation Indicator */}
              {confirmPassword.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                  {isMatching ? (
                    <span className="text-accent-muted-green flex items-center gap-1 font-medium animate-in fade-in">
                      <Check className="w-3.5 h-3.5" /> Passwords match
                    </span>
                  ) : (
                    <span className="text-accent-secondary flex items-center gap-1 font-medium animate-in fade-in">
                      <X className="w-3.5 h-3.5" /> Passwords do not match
                    </span>
                  )}
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={isRegisterPending || isMismatch}
              className="w-full h-11 rounded-xl font-semibold mt-2"
            >
              {isRegisterPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isRegisterPending ? "Creating Account..." : "Create Account & Join Kitchen →"}</span>
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="login">
          <form
            ref={loginFormRef}
            onSubmit={handleLoginSubmit}
            className="space-y-4 text-left pt-2"
          >
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <input type="hidden" name="inviteToken" value={inviteToken} />

            {loginError && (
              <div className="p-3 bg-accent-primary/10 border border-accent-primary/30 text-accent-primary text-xs rounded-xl font-medium text-center animate-in fade-in-50">
                {loginError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="invite-login-username">
                Account Username
              </Label>
              <Input
                id="invite-login-username"
                type="text"
                name="username"
                required
                autoComplete="username"
                onKeyDown={handleLoginKeyDown}
                placeholder="Your existing username"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-login-password">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="invite-login-password"
                  type={showLoginPassword ? "text" : "password"}
                  name="password"
                  required
                  autoComplete="current-password"
                  onKeyDown={handleLoginKeyDown}
                  placeholder="••••••••"
                  className="rounded-xl pr-11"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition p-1 cursor-pointer"
                  title={showLoginPassword ? "Hide password" : "Show password"}
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoginPending}
              className="w-full h-11 rounded-xl font-semibold mt-2"
            >
              {isLoginPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isLoginPending ? "Signing In..." : "Log In & Join Kitchen →"}</span>
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}

