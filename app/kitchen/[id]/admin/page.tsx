import { redirect } from "next/navigation";

export default async function KitchenAdminRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/kitchen/${id}`);
}
