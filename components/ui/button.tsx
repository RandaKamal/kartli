import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-white text-black hover:bg-zinc-200 shadow-sm active:scale-[0.98]",
        destructive:
          "bg-accent-primary text-white hover:bg-accent-primary/90 shadow-sm active:scale-[0.98]",
        outline:
          "border border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900 hover:text-white hover:border-zinc-700 active:scale-[0.98]",
        secondary:
          "bg-zinc-900 border border-zinc-800 text-zinc-200 hover:bg-zinc-800 hover:text-white hover:border-zinc-700 active:scale-[0.98]",
        ghost:
          "text-zinc-400 hover:text-white hover:bg-zinc-900 active:scale-[0.98]",
        link:
          "text-zinc-300 underline-offset-4 hover:underline hover:text-white",
        accent:
          "bg-accent-primary/10 border border-accent-primary/30 text-accent-primary hover:bg-accent-primary/20 active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-4 py-2 text-sm",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-6 text-sm sm:text-base font-semibold",
        icon: "h-8 w-8 rounded-lg p-0",
        "icon-sm": "h-7 w-7 rounded-md p-0",
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
