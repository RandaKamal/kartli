import Link from "next/link";
import { RegisterForm } from "@/components/RegisterForm";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string; inviteToken?: string }>;
}) {
  const { error, callbackUrl, inviteToken } = await searchParams;

  const loginHref = callbackUrl
    ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}${inviteToken ? `&inviteToken=${encodeURIComponent(inviteToken)}` : ""}`
    : inviteToken
    ? `/login?inviteToken=${encodeURIComponent(inviteToken)}`
    : "/login";

  return (
    <main className="relative flex-1 flex flex-col items-center justify-center min-h-[calc(100dvh-8rem)] px-4 py-8">
      {/* Ambient Glow */}
      <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
        <div className="w-[320px] sm:w-[460px] h-[320px] sm:h-[460px] bg-gradient-to-tr from-emerald-500/20 via-teal-400/15 to-cyan-500/20 dark:from-emerald-500/15 dark:via-teal-400/10 dark:to-cyan-500/15 rounded-full blur-[80px] sm:blur-[110px]" />
      </div>

      {/* Card Container */}
      <div className="relative w-full max-w-[400px] sm:max-w-md">
        <div className="relative rounded-3xl border border-border/70 dark:border-border/50 bg-card/90 dark:bg-card/75 text-card-foreground p-6 sm:p-7 backdrop-blur-xl shadow-xl space-y-4">
          {/* 2. Mini Terminal Header on the Card */}
          <div className="flex items-center border-b border-border/40 pb-3 mb-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <span className="text-[11px] font-mono text-muted-foreground ml-2">
              kartli // secure-auth
            </span>
          </div>

          {/* 3. Punchy Headline & Landing Page Typography */}
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground text-center">
              Kitchen management with{" "}
              <span className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400 bg-clip-text text-transparent font-extrabold">
                zero drama
              </span>.
            </h1>
          </div>

          {/* 4 & 5. Form Inputs & Primary Action CTA */}
          <RegisterForm
            callbackUrl={callbackUrl}
            inviteToken={inviteToken}
            initialError={error}
          />

          {/* Navigation link to Login */}
          <div className="pt-2 border-t border-border/40 text-center">
            <p className="text-xs text-muted-foreground text-center">
              Already have an account?
              <Link
                href={loginHref}
                className="text-foreground font-semibold hover:underline underline-offset-4 ml-1.5 transition-colors inline-flex items-center gap-1"
              >
                <span>Sign in</span>
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
        </div>
      </div>
    </main>
  );
}

