import Link from "next/link";
import { UtensilsCrossed, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100dvh-8rem)] px-4 py-12 text-center relative overflow-hidden">
      {/* Dark culinary ambient background glows */}
      <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
        <div className="w-[360px] sm:w-[500px] h-[360px] sm:h-[500px] bg-gradient-to-tr from-amber-500/15 via-emerald-500/10 to-teal-500/10 dark:from-amber-500/10 dark:via-emerald-500/5 dark:to-teal-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-md w-full bg-card/70 border border-border/70 backdrop-blur-xl rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6">
        {/* Culinary Icon Badge */}
        <div className="w-16 h-16 rounded-2xl bg-muted/60 border border-border/80 flex items-center justify-center text-muted-foreground mx-auto shadow-inner">
          <UtensilsCrossed className="w-8 h-8 text-primary" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-semibold tracking-widest uppercase text-muted-foreground">
            404 · Error
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Diese Küche existiert nicht.
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            The pantry you are looking for has been moved, cleared, or never existed in this kitchen space.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            asChild
            variant="default"
            className="w-full sm:w-auto rounded-xl font-medium inline-flex items-center gap-2"
          >
            <Link href="/dashboard">
              <Home className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto rounded-xl font-medium inline-flex items-center gap-2"
          >
            <Link href="/">
              <ArrowLeft className="w-4 h-4" />
              <span>Homepage</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
