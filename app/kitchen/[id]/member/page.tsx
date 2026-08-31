import { redirect } from "next/navigation";

export default async function KitchenMemberRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/kitchen/${id}`);
}
