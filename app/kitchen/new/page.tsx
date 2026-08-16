import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { createKitchenFormAction } from "@/app/actions/kitchen";

export default async function NewKitchenPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/kitchen/new");
  }

  return (
    <div className="max-w-xl mx-auto my-8 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
      <div className="space-y-2 mb-6">
        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
          Step 1 of 2
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          Create a New Kitchen
        </h1>
        <p className="text-sm text-slate-500">
          Set up your shared space and generate invite links for your roommates or family.
        </p>
      </div>

      <form action={createKitchenFormAction} className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Kitchen Name *
          </label>
          <input
            type="text"
            name="name"
            required
            placeholder="e.g. Apartment 4B or Sunny Villa"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Your Display Name in this Kitchen
          </label>
          <input
            type="text"
            name="adminDisplayName"
            defaultValue={session.user.username}
            placeholder={session.user.username}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
          />
          <span className="text-xs text-slate-400 mt-1 block">
            This name will be shown to your kitchen members (you will be the Admin).
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Members to Invite (One name per line)
          </label>
          <textarea
            name="members"
            rows={4}
            placeholder={"Sarah\nFelix\nAlex"}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-mono"
          />
          <span className="text-xs text-slate-400 mt-1 block">
            A unique one-time invite link will be generated for each member. You can also add more members later.
          </span>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <a
            href="/"
            className="px-4 py-2.5 rounded-xl text-slate-600 hover:text-slate-800 text-sm font-medium transition"
          >
            Cancel
          </a>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm"
          >
            Create Kitchen & Get Invites →
          </button>
        </div>
      </form>
    </div>
  );
}
