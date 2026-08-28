import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error, callbackUrl } = await searchParams;

  return (
    <div className="max-w-md mx-auto my-8">
      <Card className="border border-border/80 bg-card p-6 sm:p-8 rounded-3xl">
        <CardHeader className="p-0 text-center space-y-2 mb-6">
          <CardTitle className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Sign in to kartli
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Enter your username and password to access your kitchens.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <LoginForm callbackUrl={callbackUrl} initialError={error} />
        </CardContent>

        <CardFooter className="p-0 mt-6 pt-6 border-t border-border text-center justify-center text-xs text-muted-foreground">
          <span>Don&apos;t have an account?</span>
          <Link
            href={callbackUrl ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/register"}
            className="font-semibold text-foreground hover:underline ml-1.5 transition-colors"
          >
            Sign up here
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

