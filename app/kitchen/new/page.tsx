import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createKitchenFormAction } from "@/app/actions/kitchen";
import { ArrowLeft } from "lucide-react";

export default async function NewKitchenPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/kitchen/new");
  }

  return (
    <div className="max-w-xl mx-auto my-8 space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Kitchens</span>
      </Link>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-xl space-y-6">
        <div className="space-y-2">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Setup Space
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Create a New Kitchen
          </h1>
          <p className="text-sm text-zinc-400">
            Set up your shared space and generate invite links for your roommates or family.
          </p>
        </div>

        <form action={createKitchenFormAction} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Kitchen Name *
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Apartment 4B or Sunny Villa"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Your Display Name in this Kitchen
            </label>
            <input
              type="text"
              name="adminDisplayName"
              defaultValue={session.user.username}
              placeholder={session.user.username}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm transition"
            />
            <span className="text-xs text-zinc-500 mt-1 block">
              This name will be shown to your kitchen members (you will be the Admin).
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Members to Invite (One name per line)
            </label>
            <textarea
              name="members"
              rows={4}
              placeholder={"Sarah\nFelix\nAlex"}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm font-mono transition"
            />
            <span className="text-xs text-zinc-500 mt-1 block">
              A unique one-time invite link will be generated for each member. You can also add more members later.
            </span>
          </div>

          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
            <Link
              href="/"
              className="px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white text-sm font-medium transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 transition shadow-sm text-sm"
            >
              Create Kitchen & Get Invites →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
