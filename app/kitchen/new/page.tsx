import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createKitchenFormAction } from "@/app/actions/kitchen";
import { ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default async function NewKitchenPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/kitchen/new");
  }

  return (
    <div className="max-w-xl mx-auto my-8 space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition px-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Kitchens</span>
      </Link>

      <Card className="border-zinc-800/80 bg-zinc-900/90 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <CardHeader className="p-0 space-y-2">
          <Badge variant="secondary" className="w-fit text-[11px] font-semibold uppercase tracking-wider">
            Setup Space
          </Badge>
          <CardTitle className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Create a New Kitchen
          </CardTitle>
          <CardDescription className="text-sm text-zinc-400 leading-relaxed">
            Set up your shared space and generate invite links for your roommates or family.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <form action={createKitchenFormAction} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="kitchen-name">
                Kitchen Name *
              </Label>
              <Input
                id="kitchen-name"
                type="text"
                name="name"
                required
                placeholder="e.g. Apartment 4B or Sunny Villa"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-display-name">
                Your Display Name in this Kitchen
              </Label>
              <Input
                id="admin-display-name"
                type="text"
                name="adminDisplayName"
                defaultValue={session.user.username}
                placeholder={session.user.username}
                className="rounded-xl"
              />
              <span className="text-xs text-zinc-500 block">
                This name will be shown to your kitchen members (you will be the Admin).
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kitchen-members">
                Members to Invite (One name per line)
              </Label>
              <textarea
                id="kitchen-members"
                name="members"
                rows={4}
                placeholder={"Sarah\nFelix\nAlex"}
                className="flex w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:border-transparent transition-colors"
              />
              <span className="text-xs text-zinc-500 block">
                A unique one-time invite link will be generated for each member. You can also add more members later.
              </span>
            </div>

            <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
              <Button asChild variant="ghost" size="sm" className="rounded-xl text-zinc-400 hover:text-white">
                <Link href="/">Cancel</Link>
              </Button>
              <Button type="submit" size="default" className="rounded-xl font-semibold shadow-sm">
                Create Kitchen &amp; Get Invites →
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

