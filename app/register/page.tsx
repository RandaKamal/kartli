import Link from "next/link";
import { RegisterForm } from "@/components/RegisterForm";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error, callbackUrl } = await searchParams;

  return (
    <div className="max-w-md mx-auto my-8">
      <Card className="border-zinc-800/80 bg-zinc-900/90 shadow-2xl p-6 sm:p-8 rounded-3xl">
        <CardHeader className="p-0 text-center space-y-2 mb-6">
          <CardTitle className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Create your account
          </CardTitle>
          <CardDescription className="text-sm text-zinc-400">
            Pick a username and password. No email address required.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <RegisterForm callbackUrl={callbackUrl} initialError={error} />
        </CardContent>

        <CardFooter className="p-0 mt-6 pt-6 border-t border-zinc-800 text-center justify-center text-xs text-zinc-400">
          <span>Already have an account?</span>
          <Link
            href={callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login"}
            className="font-semibold text-white hover:underline ml-1.5 transition-colors"
          >
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

