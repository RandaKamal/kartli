import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 shadow-xs",
        destructive:
          "text-rose-600 hover:bg-rose-500/10 border border-rose-500/20 dark:text-rose-400 bg-transparent",
        outline:
          "border border-border/80 bg-background text-foreground hover:bg-muted/70 hover:text-foreground",
        secondary:
          "bg-zinc-100 text-zinc-900 border border-zinc-200/80 hover:bg-zinc-200/80 dark:bg-zinc-800/80 dark:text-zinc-200 dark:border-white/[0.08] dark:hover:bg-zinc-800",
        ghost:
          "text-zinc-600 hover:text-zinc-900 hover:bg-black/[0.05] dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/[0.05]",
        link:
          "text-foreground underline-offset-4 hover:underline",
        accent:
          "bg-accent-primary text-white hover:bg-accent-primary/90",
        success:
          "bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600",
      },
      size: {
        default: "h-9 px-3.5 py-1.5 text-sm",
        sm: "h-8 px-2.5 text-xs",
        lg: "h-10 px-5 text-sm font-medium",
        icon: "h-8 w-8 p-0",
        "icon-sm": "h-7 w-7 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
