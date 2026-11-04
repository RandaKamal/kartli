import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ProfileSettings } from "@/components/ProfileSettings";
import { getUserById } from "@/lib/auth-service";
import { getNotificationPrefs } from "@/lib/push";
import { Suspense } from "react";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/profile");
  }

  const [dbUser, notificationPrefs] = await Promise.all([
    getUserById(session.user.id),
    getNotificationPrefs(session.user.id),
  ]);
  const preferredCurrency = dbUser?.preferred_currency || session.user.preferred_currency || "EUR";

  return (
    <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 pt-6 sm:pt-12 pb-24 space-y-6">
      <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading settings...</div>}>
        <ProfileSettings
          user={{
            id: session.user.id,
            username: session.user.username,
            preferred_currency: preferredCurrency,
          }}
          notificationPrefs={notificationPrefs}
        />
      </Suspense>
    </div>
  );
}

