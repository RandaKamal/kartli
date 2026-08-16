import Link from "next/link";
import { RegisterForm } from "@/components/RegisterForm";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error, callbackUrl } = await searchParams;

  return (
    <div className="max-w-md mx-auto my-8 bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-xl">
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Create your account</h1>
        <p className="text-sm text-zinc-400">
          Pick a username and password. No email address required.
        </p>
      </div>

      <RegisterForm callbackUrl={callbackUrl} initialError={error} />

      <div className="mt-6 pt-6 border-t border-zinc-800 text-center text-xs text-zinc-400">
        Already have an account?{" "}
        <Link
          href={callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login"}
          className="font-semibold text-white hover:underline ml-1"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
