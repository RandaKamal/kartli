"use client";

import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { InviteAuthTabs } from "@/components/InviteAuthTabs";
import { useTranslation } from "@/lib/i18n";

export function InviteWelcome({
  token,
  kitchenName,
  displayName,
  requestedUsername,
  initialUsername,
  initialStatus,
}: {
  token: string;
  kitchenName: string;
  displayName: string;
  requestedUsername: string;
  initialUsername: string;
  initialStatus: "idle" | "available" | "taken";
}) {
  const { t } = useTranslation();

  return (
    <div className="max-w-md w-full mx-auto my-6 sm:my-8 px-4 pb-12 flex flex-col">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-1 mb-6 self-start min-h-[44px]"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>{t.invite.backHome}</span>
      </Link>

      <div className="text-center px-2">
        <div className="h-16 w-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto mb-4 shadow-lg shadow-primary/10">
          <Home className="w-7 h-7" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center text-balance break-words">
          {t.invite.welcomeTitle.replace("{kitchenName}", kitchenName)}
        </h1>
        <p className="text-center text-sm text-muted-foreground mt-1 break-words">
          {t.invite.invitedAs.replace("{name}", displayName)}
        </p>
      </div>

      <div className="max-w-md w-full mx-auto bg-card/70 border border-border/80 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl mt-4">
        <InviteAuthTabs
          inviteToken={token}
          requestedUsername={requestedUsername}
          initialUsername={initialUsername}
          initialStatus={initialStatus}
        />
      </div>

      <p className="text-center text-[11px] text-muted-foreground/70 mt-8">
        {t.invite.footerNote}
      </p>
    </div>
  );
}
