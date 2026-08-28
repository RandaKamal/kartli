import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getKitchenById, isUserKitchenAdmin } from "@/lib/kitchen";
import { getKitchenCheckouts } from "@/lib/pantry";
import { AdminCheckoutsList } from "@/components/AdminCheckoutsList";
import { ArrowLeft, Receipt } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition px-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Admin Dashboard</span>
        </Link>

        <Card className="border-zinc-800/80 bg-zinc-900/90 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-2">
          <Badge variant="destructive" className="w-fit text-[11px] font-semibold uppercase tracking-wider">
            PURCHASES
          </Badge>
          <CardTitle className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-zinc-400" />
            {kitchen.name}
          </CardTitle>
          <CardDescription className="text-sm text-zinc-400">
            See who bought what, review receipts, and issue refunds.
          </CardDescription>
        </Card>
      </div>

      <Card className="border-zinc-800/80 bg-zinc-900/90 rounded-3xl p-6 shadow-sm">
        <AdminCheckoutsList kitchenId={id} checkouts={checkouts} />
      </Card>
    </div>
  );
}

