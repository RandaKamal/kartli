import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isUserKitchenAdmin, getUserMembership } from "@/lib/kitchen";
import KitchenAdminPage from "./admin/page";
import KitchenMemberPage from "./member/page";

export default async function KitchenRootPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/kitchen/${id}`);
  }

  const isAdmin = await isUserKitchenAdmin(id, session.user.id);
  if (isAdmin) {
    return <KitchenAdminPage params={params} />;
  }

  const membership = await getUserMembership(id, session.user.id);
  if (membership) {
    return <KitchenMemberPage params={params} />;
  }

  redirect("/");
}

