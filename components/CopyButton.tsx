"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function CopyButton({
  text,
  label = "Copy Link",
  size = "sm",
  variant = "secondary",
  iconOnly = false,
  className,
}: {
  text: string;
  label?: string;
  size?: "default" | "sm" | "icon" | "icon-sm";
  variant?: "default" | "secondary" | "outline" | "ghost";
  iconOnly?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      toast.error("Failed to copy to clipboard");
    }
  };

  if (iconOnly || size === "icon" || size === "icon-sm") {
    return (
      <Tooltip open={copied ? true : undefined}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size={size === "icon-sm" ? "icon-sm" : "icon"}
            variant={copied ? "default" : variant}
            onClick={handleCopy}
            className={cn("transition-colors shrink-0", className)}
            aria-label={label}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {copied ? "Copied!" : label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={copied ? "default" : variant}
      onClick={handleCopy}
      className={cn("inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold transition", className)}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
          <span>{label}</span>
        </>
      )}
    </Button>
  );
}

