import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground font-semibold shadow-xs",
        secondary:
          "border-border bg-secondary text-secondary-foreground",
        outline:
          "border-border bg-transparent text-muted-foreground",
        destructive:
          "border-destructive/30 bg-destructive/10 text-destructive font-medium",
        pending:
          "border-accent-success/30 bg-accent-success/10 text-accent-success font-medium",
        warm:
          "border-accent-warning/30 bg-accent-warning/10 text-accent-warning font-medium",
        success:
          "border-accent-success/30 bg-accent-success/10 text-accent-success font-medium",
        accent:
          "border-accent-brand/30 bg-accent-brand/10 text-accent-brand font-medium",
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
