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
            "group toast group-[.toaster]:bg-card/95 group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-white/10 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-xl group-[.toaster]:backdrop-blur-xl group-[.toaster]:p-3 group-[.toaster]:text-xs font-medium font-sans",
          description: "group-[.toast]:text-muted-foreground text-xs",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-semibold group-[.toast]:rounded-lg group-[.toast]:text-xs",
          cancelButton:
            "group-[.toast]:bg-secondary group-[.toast]:text-secondary-foreground group-[.toast]:rounded-lg group-[.toast]:text-xs",
          error:
            "group-[.toaster]:border-destructive/30 group-[.toaster]:text-foreground",
          success:
            "group-[.toaster]:border-emerald-500/30 group-[.toaster]:text-foreground",
          warning:
            "group-[.toaster]:border-amber-500/30 group-[.toaster]:text-foreground",
          info:
            "group-[.toaster]:border-white/10 group-[.toaster]:text-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
