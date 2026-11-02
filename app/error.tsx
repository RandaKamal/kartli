"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected runtime client boundary errors
    console.error("Runtime application error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100dvh-8rem)] px-4 py-12 text-center relative overflow-hidden">
      {/* Subtle Error Glow */}
      <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
        <div className="w-[360px] sm:w-[500px] h-[360px] sm:h-[500px] bg-destructive/10 rounded-full blur-[110px]" />
      </div>

      <div className="max-w-md w-full bg-card/75 border border-border/80 backdrop-blur-xl rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mx-auto shadow-inner">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-semibold tracking-widest uppercase text-destructive">
            Kritischer Fehler
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Etwas ist schiefgelaufen.
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            An unexpected error occurred while processing this kitchen view. You can try refreshing the action or return to safety.
          </p>
        </div>

        {error?.digest && (
          <div className="text-[11px] font-mono text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg border border-border/40 inline-block">
            Digest: {error.digest}
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            onClick={() => reset()}
            variant="default"
            className="w-full sm:w-auto rounded-xl font-medium inline-flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Erneut versuchen</span>
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto rounded-xl font-medium inline-flex items-center gap-2"
          >
            <Link href="/dashboard">
              <Home className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
