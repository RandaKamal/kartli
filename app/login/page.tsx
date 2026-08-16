import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error, callbackUrl } = await searchParams;

  return (
    <div className="max-w-md mx-auto my-8 bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-xl">
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Sign in to WGrocery</h1>
        <p className="text-sm text-zinc-400">
          Enter your username and password to access your kitchens.
        </p>
      </div>

      <LoginForm callbackUrl={callbackUrl} initialError={error} />

      <div className="mt-6 pt-6 border-t border-zinc-800 text-center text-xs text-zinc-400">
        Don&apos;t have an account?{" "}
        <Link
          href={callbackUrl ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/register"}
          className="font-semibold text-white hover:underline ml-1"
        >
          Sign up here
        </Link>
      </div>
    </div>
  );
}
