import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getInviteByToken, claimInvite } from "@/lib/invite";
import { InviteWelcome } from "@/components/InviteWelcome";
import { checkUsernameAvailability, sanitizeUsername } from "@/lib/username";
import { AlertCircle } from "lucide-react";
import { Card, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getInviteByToken(token);

  // 1. If invite token is not found or already claimed
  if (!invite || invite.is_claimed) {
    return (
      <div className="max-w-md mx-auto my-12">
        <Card className="border-border bg-card rounded-3xl p-8 sm:p-10 text-center shadow-xl space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-xl font-bold text-foreground tracking-tight">
              Invalid or Expired Invite Link
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground leading-relaxed">
              This invite link does not exist, has expired, or has already been claimed by another member.
            </CardDescription>
          </div>
          <CardFooter className="p-0 pt-4 border-t border-border justify-center">
            <Button asChild variant="default" size="sm" className="rounded-xl font-semibold">
              <Link href="/">Go to Homepage</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // 2. If user is already authenticated, claim invite and redirect
  const session = await auth();

  if (session?.user?.id) {
    const claimResult = await claimInvite(token, session.user.id);

    if (claimResult.success || claimResult.error === "ALREADY_MEMBER") {
      redirect(`/kitchen/${claimResult.kitchenId || invite.kitchen_id}`);
    }

    return (
      <div className="max-w-md mx-auto my-12">
        <Card className="border-border bg-card rounded-3xl p-8 sm:p-10 text-center shadow-xl space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-xl font-bold text-foreground tracking-tight">
              Could Not Accept Invite
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground leading-relaxed">
              {claimResult.message}
            </CardDescription>
          </div>
          <CardFooter className="p-0 pt-4 border-t border-border justify-center">
            <Button asChild variant="default" size="sm" className="rounded-xl font-semibold">
              <Link href="/">Go to Homepage</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // 3. User is NOT logged in: warm welcome card + inline auth tabs (client, i18n-aware)
  // Default handle derives strictly from the invited nickname (never from any session user)
  const requestedUsername = sanitizeUsername(invite.kitchen_display_name) || "user";
  const availability = await checkUsernameAvailability(requestedUsername).catch(() => null);
  const initialUsername = availability && !availability.available && availability.suggestion
    ? availability.suggestion
    : requestedUsername;

  return (
    <InviteWelcome
      token={token}
      kitchenName={invite.kitchen_name}
      displayName={invite.kitchen_display_name}
      requestedUsername={requestedUsername}
      initialUsername={initialUsername}
      initialStatus={
        !availability ? "idle" : availability.available || availability.suggestion ? "available" : "taken"
      }
    />
  );
}
