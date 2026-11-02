import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string; inviteToken?: string }>;
}) {
  const { error, callbackUrl, inviteToken } = await searchParams;

  const registerHref = callbackUrl
    ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}${inviteToken ? `&inviteToken=${encodeURIComponent(inviteToken)}` : ""}`
    : inviteToken
    ? `/register?inviteToken=${encodeURIComponent(inviteToken)}`
    : "/register";

  return (
    <main className="relative flex-1 flex flex-col items-center justify-center min-h-[calc(100dvh-8rem)] px-4 py-8">
      {/* Ambient Glow */}
      <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
        <div className="w-[320px] sm:w-[460px] h-[320px] sm:h-[460px] bg-gradient-to-tr from-emerald-500/20 via-teal-400/15 to-cyan-500/20 dark:from-emerald-500/15 dark:via-teal-400/10 dark:to-cyan-500/15 rounded-full blur-[80px] sm:blur-[110px]" />
      </div>

      {/* Card Container */}
      <div className="relative w-full max-w-[400px] sm:max-w-md">
        <div className="relative rounded-3xl border border-border/70 dark:border-border/50 bg-card/90 dark:bg-card/75 text-card-foreground p-6 sm:p-7 backdrop-blur-xl shadow-xl space-y-4">
          {/* 4 & 5. Form Inputs & Primary Action CTA */}
          <LoginForm
            callbackUrl={callbackUrl}
            inviteToken={inviteToken}
            initialError={error}
          />

          {/* Navigation link to Register */}
          <div className="pt-2 border-t border-border/40 text-center">
            <p className="text-xs text-muted-foreground text-center">
              Don&apos;t have an account?
              <Link
                href={registerHref}
                className="text-foreground font-semibold hover:underline underline-offset-4 ml-1.5 transition-colors inline-flex items-center gap-1"
              >
                <span>Start your kitchen</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </p>
          </div>

          {/* 6. Micro-Feature Checklist Footer */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground pt-2.5 border-t border-border/40">
            <span className="flex items-center gap-1">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>Email-free onboarding</span>
            </span>
            <span className="text-border/60">&middot;</span>
            <span className="flex items-center gap-1">
              <span className="text-cyan-400 font-bold">✓</span>
              <span>Flatshare ready</span>
            </span>
            <span className="text-border/60">&middot;</span>
            <span className="flex items-center gap-1">
              <span className="text-amber-400 font-bold">✓</span>
              <span>Open Source</span>
            </span>
          </div>

          {/* Legal Links */}
          <div className="flex items-center justify-center gap-3 text-[11px] text-muted-foreground/80 pt-1">
            <Link href="/legal/imprint" className="hover:text-foreground transition-colors underline-offset-4 hover:underline">
              Impressum
            </Link>
            <span className="text-border/60">&middot;</span>
            <Link href="/legal/privacy" className="hover:text-foreground transition-colors underline-offset-4 hover:underline">
              Datenschutz
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

