import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error, callbackUrl } = await searchParams;

  return (
    <div className="max-w-md mx-auto my-8 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Sign in to WGrocery</h1>
        <p className="text-sm text-slate-500">
          Enter your username and password to access your kitchens.
        </p>
      </div>

      <LoginForm callbackUrl={callbackUrl} initialError={error} />

      <div className="mt-6 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
        Don&apos;t have an account?{" "}
        <Link
          href={callbackUrl ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/register"}
          className="font-bold text-emerald-600 hover:text-emerald-700 underline"
        >
          Sign up here
        </Link>
      </div>
    </div>
  );
}
