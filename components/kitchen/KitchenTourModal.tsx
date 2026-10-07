"use client";

import * as React from "react";
import { Package, PlusCircle, ShoppingCart, Receipt } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface TourStepConfig {
  key: "step1" | "step2" | "step3" | "step4";
  icon: LucideIcon;
  // Full class strings so Tailwind can detect them statically
  tile: string;
  glow: string;
  iconColor: string;
  dotActive: string;
}

const STEPS: TourStepConfig[] = [
  {
    key: "step1",
    icon: Package,
    tile: "bg-emerald-500/10 border-emerald-500/30",
    glow: "bg-emerald-500/25",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    dotActive: "bg-emerald-500",
  },
  {
    key: "step2",
    icon: PlusCircle,
    tile: "bg-teal-500/10 border-teal-500/30",
    glow: "bg-teal-500/25",
    iconColor: "text-teal-600 dark:text-teal-400",
    dotActive: "bg-teal-500",
  },
  {
    key: "step3",
    icon: ShoppingCart,
    tile: "bg-cyan-500/10 border-cyan-500/30",
    glow: "bg-cyan-500/25",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    dotActive: "bg-cyan-500",
  },
  {
    key: "step4",
    icon: Receipt,
    tile: "bg-violet-500/10 border-violet-500/30",
    glow: "bg-violet-500/25",
    iconColor: "text-violet-600 dark:text-violet-400",
    dotActive: "bg-violet-500",
  },
];

export interface KitchenTourModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fired on every dismissal (finish, skip, Esc, backdrop, drag). Caller persists completion. */
  onComplete?: () => void;
}

export function KitchenTourModal({ isOpen, onOpenChange, onComplete }: KitchenTourModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = React.useState(0);
  const [direction, setDirection] = React.useState<1 | -1>(1);

  // Always restart from the first step when (re)opened
  React.useEffect(() => {
    if (isOpen) {
      setStep(0);
      setDirection(1);
    }
  }, [isOpen]);

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const Icon = current.icon;
  const copy = t.tour[current.key];

  const goTo = (target: number) => {
    if (target === step) return;
    setDirection(target > step ? 1 : -1);
    setStep(target);
  };

  const handleOpenChange = (open: boolean) => {
    // Any dismissal (skip, Esc, backdrop, drag, finish) counts as completed
    if (!open) onComplete?.();
    onOpenChange(open);
  };

  const handleNext = () => {
    if (isLast) {
      handleOpenChange(false);
    } else {
      goTo(step + 1);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        onDismiss={() => handleOpenChange(false)}
        className={cn(
          // Locked height keeps the card from jumping between steps
          "h-[min(30rem,88dvh)] sm:h-auto sm:min-h-[26rem] sm:max-h-[85vh] max-w-full",
          "sm:max-w-md w-full bg-card/95 backdrop-blur-2xl border-border shadow-2xl sm:rounded-3xl",
          "p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-6"
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.desc}</DialogDescription>
        </DialogHeader>

        {/* Step content */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col items-center justify-center text-center px-1 sm:pt-4">
          <div
            key={step}
            className={cn(
              "w-full flex flex-col items-center gap-5 animate-in fade-in-0 duration-300",
              direction === 1 ? "slide-in-from-right-6" : "slide-in-from-left-6"
            )}
          >
            <div className="relative">
              <div
                aria-hidden
                className={cn("absolute inset-0 -m-4 rounded-full blur-2xl", current.glow)}
              />
              <div
                className={cn(
                  "relative h-24 w-24 sm:h-28 sm:w-28 rounded-[2rem] border flex items-center justify-center shadow-sm",
                  current.tile
                )}
              >
                <Icon className={cn("h-11 w-11 sm:h-12 sm:w-12", current.iconColor)} strokeWidth={1.75} />
              </div>
            </div>

            <div className="flex flex-col gap-2 max-w-full">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {t.tour.stepOf
                  .replace("{current}", String(step + 1))
                  .replace("{total}", String(STEPS.length))}
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground text-balance break-words">
                {copy.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed text-pretty break-words">
                {copy.desc}
              </p>
            </div>
          </div>
        </div>

        {/* Progress dots (44px tap targets around slim pills) */}
        <div className="flex items-center justify-center pt-3" role="tablist">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={i === step}
              aria-label={t.tour.goToStep.replace("{step}", String(i + 1))}
              onClick={() => goTo(i)}
              className="h-11 px-1.5 flex items-center justify-center cursor-pointer focus:outline-none group"
            >
              <span
                className={cn(
                  "block h-2 rounded-full transition-all duration-300 group-focus-visible:ring-2 group-focus-visible:ring-ring",
                  i === step ? cn("w-6", current.dotActive) : "w-2 bg-muted-foreground/30 group-hover:bg-muted-foreground/50"
                )}
              />
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className={cn(
              "min-h-[44px] px-5 rounded-full text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer",
              isLast && "invisible"
            )}
            tabIndex={isLast ? -1 : 0}
            aria-hidden={isLast}
          >
            {t.tour.skip}
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 min-h-[44px] px-6 rounded-full bg-foreground text-background text-sm font-bold shadow-sm hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
          >
            {isLast ? t.tour.finish : t.tour.next}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default KitchenTourModal;
