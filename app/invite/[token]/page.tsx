import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getInviteByToken, claimInvite } from "@/lib/invite";
import { InviteAuthTabs } from "@/components/InviteAuthTabs";
import { AlertCircle, MailCheck, ArrowLeft } from "lucide-react";

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
      <div className="max-w-md mx-auto my-12 bg-zinc-900 border border-zinc-800 rounded-3xl p-8 sm:p-10 text-center shadow-xl space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white tracking-tight">
            Invalid or Expired Invite Link
          </h1>
          <p className="text-xs text-zinc-400 leading-relaxed">
            This invite link does not exist, has expired, or has already been claimed by another member.
          </p>
        </div>
        <div className="pt-4 border-t border-zinc-800">
          <Link
            href="/"
            className="inline-block px-5 py-2.5 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 transition text-xs shadow-sm"
          >
            Go to Homepage
          </Link>
        </div>
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
      <div className="max-w-md mx-auto my-12 bg-zinc-900 border border-zinc-800 rounded-3xl p-8 sm:p-10 text-center shadow-xl space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white tracking-tight">
            Could Not Accept Invite
          </h1>
          <p className="text-xs text-zinc-400 leading-relaxed">{claimResult.message}</p>
        </div>
        <div className="pt-4 border-t border-zinc-800">
          <Link
            href="/"
            className="inline-block px-5 py-2.5 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 transition text-xs shadow-sm"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // 3. User is NOT logged in: Present polished welcome card + inline auth tabs
  return (
    <div className="max-w-md mx-auto my-8 space-y-4">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition px-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Home</span>
      </Link>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 sm:p-10 shadow-xl text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-zinc-200 mx-auto">
          <MailCheck className="w-7 h-7" />
        </div>

        <div className="space-y-3">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-zinc-800 border border-zinc-700 text-zinc-300 uppercase tracking-wider">
            You&apos;ve Been Invited
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Join {invite.kitchen_name}
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            You are invited to join as{" "}
            <strong className="text-white underline decoration-zinc-500 underline-offset-4 font-semibold">
              &ldquo;{invite.kitchen_display_name}&rdquo;
            </strong>
          </p>
        </div>

        <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-xs text-zinc-400 text-left leading-relaxed">
          Log in or create a username and password below to immediately accept this invite and access the shared grocery list.
        </div>

        <div className="pt-2">
          <InviteAuthTabs
            inviteToken={token}
            suggestedName={invite.kitchen_display_name}
          />
        </div>
      </div>
    </div>
  );
}
