import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getInviteByToken, claimInvite } from "@/lib/invite";
import { InviteAuthTabs } from "@/components/InviteAuthTabs";

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
      <div className="max-w-md mx-auto my-12 bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm space-y-6">
        <div className="text-5xl">⚠️</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-900">
            Invalid or Expired Invite Link
          </h1>
          <p className="text-sm text-slate-500">
            This invite link does not exist, has expired, or has already been claimed by another member.
          </p>
        </div>
        <div className="pt-4 border-t border-slate-100">
          <Link
            href="/"
            className="inline-block px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition text-sm shadow-sm"
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

    // Handle unexpected claim error for authenticated user
    return (
      <div className="max-w-md mx-auto my-12 bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm space-y-6">
        <div className="text-5xl">⚠️</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-900">
            Could Not Accept Invite
          </h1>
          <p className="text-sm text-slate-500">{claimResult.message}</p>
        </div>
        <div className="pt-4 border-t border-slate-100">
          <Link
            href="/"
            className="inline-block px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold transition text-sm shadow-sm"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // 3. User is NOT logged in: Present welcome card + inline auth tabs
  return (
    <div className="max-w-md mx-auto my-8 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-center space-y-6">
      <div className="inline-flex p-3.5 bg-emerald-50 rounded-2xl text-3xl">
        🍳
      </div>

      <div className="space-y-2">
        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
          You&apos;ve Been Invited!
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          Join {invite.kitchen_name}
        </h1>
        <p className="text-sm text-slate-600">
          You are invited to join as{" "}
          <strong className="text-slate-900 font-bold underline decoration-emerald-500 underline-offset-4">
            &ldquo;{invite.kitchen_display_name}&rdquo;
          </strong>
          .
        </p>
      </div>

      <div className="p-4 bg-slate-50 rounded-2xl text-xs text-slate-500 text-left">
        Log in or choose a username and password below to immediately join this kitchen. No email address required!
      </div>

      <InviteAuthTabs
        inviteToken={token}
        suggestedName={invite.kitchen_display_name}
      />
    </div>
  );
}
