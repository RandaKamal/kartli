import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyUserCredentials } from "@/lib/auth-service";

/**
 * NextAuth configuration for lean username/password authentication with JWT sessions.
 */
export const authConfig: NextAuthConfig = {
  secret:
    process.env.AUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const username = String(credentials.username).trim();
        const password = String(credentials.password);

        const verified = await verifyUserCredentials(username, password);
        if (!verified) {
          return null;
        }

        return {
          id: verified.id,
          username: verified.username,
          name: verified.username,
          preferred_currency: verified.preferred_currency || "EUR",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username || user.name;
        token.preferred_currency = (user as any).preferred_currency || "EUR";
      }
      if (trigger === "update" && session?.preferred_currency) {
        token.preferred_currency = session.preferred_currency;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id || token.sub) as string;
        session.user.username = (token.username as string) || session.user.name || "";
        session.user.preferred_currency = (token.preferred_currency as string) || "EUR";
      }
      return session;
    },
  },
};
