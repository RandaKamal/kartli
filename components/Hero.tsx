import Link from "next/link";
import { ArrowRight, Plus, CheckCircle2, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroProps {
  sessionUser?: {
    id: string;
    username?: string;
  } | null;
}

export function Hero({ sessionUser }: HeroProps) {
  return (
    <div className="space-y-6 sm:space-y-7 text-left">
      {/* Editorial Pill Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/70 bg-secondary/60 backdrop-blur-md text-xs font-medium text-secondary-foreground">
        <span className="flex h-2 w-2 rounded-full bg-accent-brand animate-pulse" />
        <span className="text-foreground font-semibold">kartli 1.0</span>
        <span className="text-muted-foreground/50">&middot;</span>
        <span className="text-muted-foreground">Shared Kitchen OS</span>
      </div>

      {/* Main Headline */}
      <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
        Kitchen management for spaces that love{" "}
        <span className="bg-gradient-to-r from-accent-brand via-accent-primary to-accent-secondary bg-clip-text text-transparent">
          good food
        </span>{" "}
        and zero drama.
      </h1>

      {/* Subheading */}
      <p className="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
        Track pantry staples, coordinate grocery runs with flatmates in real time, split supermarket receipts with Gemini Vision, and balance household expenses with one tap.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        {sessionUser ? (
          <>
            <Button
              asChild
              size="lg"
              className="rounded-2xl font-bold shadow-lg shadow-primary/10 h-11 sm:h-12 px-6 text-sm gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Link href="/dashboard">
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-2xl font-semibold h-11 sm:h-12 px-5 text-sm gap-2 border-border/70 bg-card/60 hover:bg-secondary text-foreground shadow-sm"
            >
              <Link href="/kitchen/new">
                <Plus className="w-4 h-4" />
                <span>Create Space</span>
              </Link>
            </Button>
          </>
        ) : (
          <>
            <Button
              asChild
              size="lg"
              className="rounded-2xl font-bold shadow-lg shadow-primary/10 h-11 sm:h-12 px-6 text-sm gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Link href="/register">
                <span>Start Your Kitchen</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-2xl font-semibold h-11 sm:h-12 px-5 text-sm gap-2 border-border/70 bg-card/60 hover:bg-secondary text-foreground shadow-sm"
            >
              <Link href="/login">
                <span>Sign In</span>
              </Link>
            </Button>
          </>
        )}
      </div>

      {/* Subtle Trust Indicators */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-muted-foreground pt-2">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-accent-brand" />
          <span>Email-free setup</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-accent-secondary" />
          <span>Self-hostable & Open Source</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-accent-primary" />
          <span>Gemini Vision AI</span>
        </span>
      </div>
    </div>
  );
}
