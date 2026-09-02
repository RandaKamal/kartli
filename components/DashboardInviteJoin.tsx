"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, Link as LinkIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function DashboardInviteJoin() {
  const [inviteInput, setInviteInput] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inviteInput.trim();
    if (!trimmed) {
      toast.error("Please enter an invite link or token.");
      return;
    }

    // Extract token if full URL is pasted
    let token = trimmed;
    if (trimmed.includes("/invite/")) {
      const parts = trimmed.split("/invite/");
      token = parts[parts.length - 1].split("?")[0].split("#")[0];
    }

    if (!token) {
      toast.error("Invalid invite link format.");
      return;
    }

    setIsNavigating(true);
    router.push(`/invite/${encodeURIComponent(token)}`);
  };

  return (
    <form onSubmit={handleJoin} className="flex items-center gap-2 max-w-md w-full mx-auto">
      <div className="relative flex-1">
        <LinkIcon className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          type="text"
          placeholder="Paste invite link or code..."
          value={inviteInput}
          onChange={(e) => setInviteInput(e.target.value)}
          className="h-10 pl-9 pr-3 text-xs rounded-xl bg-card border-border/80 focus-visible:ring-1"
          disabled={isNavigating}
        />
      </div>
      <Button
        type="submit"
        size="sm"
        disabled={isNavigating || !inviteInput.trim()}
        className="h-10 px-4 rounded-xl text-xs font-semibold gap-1.5 shadow-xs"
      >
        {isNavigating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
        <span>Join</span>
      </Button>
    </form>
  );
}
