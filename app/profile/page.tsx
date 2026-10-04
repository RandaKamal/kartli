import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProfileSettings } from "@/components/ProfileSettings";
import { getUserById } from "@/lib/auth-service";
import { Suspense } from "react";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/profile");
  }

  const dbUser = await getUserById(session.user.id);
  const preferredCurrency = dbUser?.preferred_currency || session.user.preferred_currency || "EUR";

  return (
    <div className="max-w-3xl mx-auto w-full px-6 pt-12 pb-24 space-y-6">
      {/* Dedicated back-navigation row with mb-8 */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Kitchens</span>
        </Link>
      </div>

      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          Settings &amp; Profile
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your account credentials, notifications, preferred currency, and theme preferences.
        </p>
      </div>

      <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading settings...</div>}>
        <ProfileSettings
          user={{
            id: session.user.id,
            username: session.user.username,
            preferred_currency: preferredCurrency,
          }}
        />
      </Suspense>
    </div>
  );
}

