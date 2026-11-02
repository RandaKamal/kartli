import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getUserKitchensWithStats } from "@/lib/kitchen";
import { DashboardView } from "@/components/DashboardView";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const userKitchens = await getUserKitchensWithStats(session.user.id);
  const headerList = await headers();
  const host = headerList.get("host") || "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") || "http";
  const baseUrl = `${protocol}://${host}`;

  const rawName = session.user.name || session.user.username || "there";
  const cleanName = rawName.replace(/^@/, "");
  const displayName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

  return (
    <DashboardView
      userKitchens={userKitchens}
      displayName={displayName}
      baseUrl={baseUrl}
    />
  );
}
