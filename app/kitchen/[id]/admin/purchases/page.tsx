import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getKitchenById, isUserKitchenAdmin } from "@/lib/kitchen";
import { getKitchenCheckouts } from "@/lib/pantry";
import { AdminCheckoutsList } from "@/components/AdminCheckoutsList";
import { ArrowLeft, Receipt } from "lucide-react";


export default async function KitchenPurchasesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/login?callbackUrl=/kitchen/${id}/admin/purchases`);
  }

  const isAdmin = await isUserKitchenAdmin(id, session.user.id);
  if (!isAdmin) {
    redirect(`/kitchen/${id}/member`);
  }

  const kitchen = await getKitchenById(id);
  if (!kitchen) {
    notFound();
  }

  const checkouts = await getKitchenCheckouts(id);

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Link
          href={`/kitchen/${id}/admin`}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Admin Dashboard</span>
        </Link>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
            PURCHASES
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2 mt-1">
            <Receipt className="w-6 h-6 text-zinc-400" />
            {kitchen.name}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            See who bought what, review receipts, and issue refunds.
          </p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-sm">
        <AdminCheckoutsList kitchenId={id} checkouts={checkouts} />
      </div>
    </div>
  );
}
