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
            "group-[.toaster]:border-accent-success/40 group-[.toaster]:text-accent-success",
          warning:
            "group-[.toaster]:border-accent-warning/40 group-[.toaster]:text-accent-warning",
          info:
            "group-[.toaster]:border-accent-brand/40 group-[.toaster]:text-accent-brand",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
