"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-zinc-900 group-[.toaster]:text-zinc-100 group-[.toaster]:border-zinc-800 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-2xl group-[.toaster]:text-xs font-sans",
          description: "group-[.toast]:text-zinc-400 text-xs",
          actionButton:
            "group-[.toast]:bg-white group-[.toast]:text-black group-[.toast]:font-semibold group-[.toast]:rounded-xl",
          cancelButton:
            "group-[.toast]:bg-zinc-800 group-[.toast]:text-zinc-400 group-[.toast]:rounded-xl",
          error:
            "group-[.toaster]:border-accent-primary/40 group-[.toaster]:text-zinc-100",
          success:
            "group-[.toaster]:border-accent-muted-green/40 group-[.toaster]:text-zinc-100",
          warning:
            "group-[.toaster]:border-accent-warm/40 group-[.toaster]:text-zinc-100",
          info:
            "group-[.toaster]:border-accent-secondary/40 group-[.toaster]:text-zinc-100",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
