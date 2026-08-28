import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-white text-black font-bold shadow-xs",
        secondary:
          "border-zinc-700 bg-zinc-800 text-zinc-300",
        outline:
          "border-zinc-800 bg-zinc-950 text-zinc-400",
        destructive:
          "border-accent-primary/30 bg-accent-primary/10 text-accent-primary",
        pending:
          "border-accent-secondary/40 bg-accent-secondary/10 text-accent-secondary",
        warm:
          "border-accent-warm/40 bg-accent-warm/10 text-accent-warm",
        success:
          "border-accent-muted-green/40 bg-accent-muted-green/10 text-accent-muted-green",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
