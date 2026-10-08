"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Portal to document.body so toasts can never be laid out inside the header/nav DOM.
  if (!mounted) return null;

  return createPortal(
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      offset={20}
      mobileOffset={{ top: 20, left: 16, right: 16 }}
      className="toaster group !z-[100] pointer-events-none"
      toastOptions={{
        classNames: {
          toast:
            "group toast pointer-events-none max-w-[90vw] sm:max-w-md px-4 py-2 rounded-2xl bg-card/95 text-foreground border border-border/80 shadow-2xl backdrop-blur-xl flex items-center gap-2 text-xs font-medium font-sans animate-in fade-in slide-in-from-top-2 duration-150",
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
    />,
    document.body
  );
};

export { Toaster };
