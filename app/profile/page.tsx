import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { User, Key, Bell, Shield, ArrowLeft } from "lucide-react";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/profile");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Back Link & Header */}
      <div className="space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Kitchens</span>
        </Link>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Settings & Profile
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage your account credentials and personal preferences.
          </p>
        </div>
      </div>

      {/* Account Info Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white font-bold text-lg">
            {session.user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">
              @{session.user.username}
            </h2>
            <p className="text-xs text-zinc-400">
              Account ID: <span className="font-mono text-zinc-500">{session.user.id}</span>
            </p>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-zinc-500 block uppercase font-medium tracking-wider mb-1">
              Username
            </span>
            <span className="font-semibold text-zinc-200">
              {session.user.username}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block uppercase font-medium tracking-wider mb-1">
              Authentication Type
            </span>
            <span className="font-semibold text-zinc-200">
              Credentials (Encrypted Password)
            </span>
          </div>
        </div>
      </div>

      {/* Placeholder Settings Sections */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">
          Preferences & Security
        </h3>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800">
          {/* Change Password Placeholder */}
          <div className="p-4 sm:p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-white">Password & Security</h4>
                <p className="text-xs text-zinc-400">Change your master account password</p>
              </div>
            </div>
            <button
              type="button"
              disabled
              className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-500 text-xs border border-zinc-700 cursor-not-allowed"
            >
              Coming Soon
            </button>
          </div>

          {/* Notifications Placeholder */}
          <div className="p-4 sm:p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-white">Kitchen Alerts</h4>
                <p className="text-xs text-zinc-400">Manage grocery list update notifications</p>
              </div>
            </div>
            <button
              type="button"
              disabled
              className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-500 text-xs border border-zinc-700 cursor-not-allowed"
            >
              Coming Soon
            </button>
          </div>

          {/* Privacy & Data Placeholder */}
          <div className="p-4 sm:p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-white">Privacy & Data</h4>
                <p className="text-xs text-zinc-400">Manage linked kitchen memberships and session keys</p>
              </div>
            </div>
            <button
              type="button"
              disabled
              className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-500 text-xs border border-zinc-700 cursor-not-allowed"
            >
              Active
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
