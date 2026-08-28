import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground font-bold shadow-xs",
        secondary:
          "border-border bg-secondary text-secondary-foreground",
        outline:
          "border-border bg-background text-muted-foreground",
        destructive:
          "border-destructive/30 bg-destructive/10 text-destructive font-medium",
        pending:
          "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium",
        warm:
          "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium",
        success:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium",
        accent:
          "border-accent-primary/30 bg-accent-primary/10 text-accent-primary font-medium",
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
