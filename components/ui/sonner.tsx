"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-2xl group-[.toaster]:text-xs font-sans",
          description: "group-[.toast]:text-muted-foreground text-xs",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-semibold group-[.toast]:rounded-xl",
          cancelButton:
            "group-[.toast]:bg-secondary group-[.toast]:text-secondary-foreground group-[.toast]:rounded-xl",
          error:
            "group-[.toaster]:border-destructive/40 group-[.toaster]:text-destructive",
          success:
            "group-[.toaster]:border-emerald-500/40 group-[.toaster]:text-emerald-700 dark:group-[.toaster]:text-emerald-300",
          warning:
            "group-[.toaster]:border-amber-500/40 group-[.toaster]:text-amber-700 dark:group-[.toaster]:text-amber-300",
          info:
            "group-[.toaster]:border-accent-primary/40 group-[.toaster]:text-accent-primary",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
