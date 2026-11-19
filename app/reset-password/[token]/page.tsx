import { validatePasswordResetToken } from "@/lib/password-reset";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const decodedToken = decodeURIComponent(token || "");
  const validation = await validatePasswordResetToken(decodedToken).catch(
    (): { valid: boolean; username?: string; requiresSecondKitchenCheck?: boolean } => ({
      valid: false,
    })
  );

  return (
    <main className="relative flex-1 flex flex-col items-center justify-center min-h-[calc(100dvh-8rem)] px-4 py-8">
      <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
        <div className="w-[320px] sm:w-[460px] h-[320px] sm:h-[460px] bg-gradient-to-tr from-emerald-500/20 via-teal-400/15 to-cyan-500/20 dark:from-emerald-500/15 dark:via-teal-400/10 dark:to-cyan-500/15 rounded-full blur-[80px] sm:blur-[110px]" />
      </div>

      <div className="relative w-full max-w-[400px] sm:max-w-md">
        <div className="relative rounded-3xl border border-border/70 dark:border-border/50 bg-card/90 dark:bg-card/75 text-card-foreground p-6 sm:p-7 backdrop-blur-xl shadow-xl">
          <ResetPasswordForm
            token={decodedToken}
            valid={validation.valid}
            username={validation.username}
            requiresSecondKitchenCheck={validation.requiresSecondKitchenCheck}
          />
        </div>
      </div>
    </main>
  );
}
