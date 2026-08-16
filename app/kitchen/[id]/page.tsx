import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isUserKitchenAdmin, getUserMembership } from "@/lib/kitchen";

export default async function KitchenRootPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/login?callbackUrl=/kitchen/${id}`);
  }

  const isAdmin = await isUserKitchenAdmin(id, session.user.id);
  if (isAdmin) {
    redirect(`/kitchen/${id}/admin`);
  }

  const membership = await getUserMembership(id, session.user.id);
  if (membership) {
    redirect(`/kitchen/${id}/member`);
  }

  redirect("/");
}
