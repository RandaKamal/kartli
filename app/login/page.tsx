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
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center p-4 relative py-8 sm:py-12">
      {/* 1. Ambient Multi-Color Radial Glow */}
      <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none overflow-hidden">
        <div className="w-[620px] h-[620px] max-w-full rounded-full bg-gradient-to-tr from-emerald-500/10 via-cyan-500/10 to-amber-500/10 blur-[130px] opacity-60" />
      </div>

      {/* Elevated Card Shell */}
      <div className="relative w-full max-w-md">
        {/* Diffuse glow backdrop behind card */}
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-cyan-500/10 rounded-3xl blur-xl pointer-events-none opacity-40" />

        <div className="relative rounded-3xl border border-border/80 bg-card/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          {/* 2. Mini Terminal Header on the Card */}
          <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-6">
            <div className="flex items-center">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-[11px] font-mono text-muted-foreground ml-2">
                kartli // secure-auth
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-[10px] tracking-wider uppercase font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE SESSION</span>
            </div>
          </div>

          {/* 3. Punchy Headline & Landing Page Typography */}
          <div className="text-center space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-snug">
              Welcome back to <span className="text-amber-300">good food</span> and{" "}
              <span className="text-cyan-400">zero drama</span>.
            </h1>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto text-center mt-1.5">
              Enter your credentials to access your kitchens and grocery lists.
            </p>
          </div>

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
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground pt-3 border-t border-border/40">
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
    </div>
  );
}

