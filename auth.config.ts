import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {
  getUserById,
  getUserSessionVersion,
  verifyUserCredentials,
} from "@/lib/auth-service";
import { verifyPasskeyLoginNonce } from "@/lib/webauthn";

/**
 * NextAuth configuration for lean username/password + WebAuthn passkey authentication with JWT sessions.
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
      id: "credentials",
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
          session_version: verified.session_version,
        };
      },
    }),
    Credentials({
      id: "passkey",
      name: "Passkey",
      credentials: {
        token: { label: "Passkey Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.token) {
          return null;
        }

        const verified = verifyPasskeyLoginNonce(String(credentials.token));
        if (!verified) {
          return null;
        }

        const user = await getUserById(verified.userId);
        if (!user || user.username.startsWith("deleted_user_")) {
          return null;
        }

        return {
          id: user.id,
          username: user.username,
          name: user.username,
          preferred_currency: user.preferred_currency || "EUR",
          session_version: Number(user.session_version) || 1,
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
        token.session_version = Number((user as any).session_version) || 1;
        return token;
      }

      if (trigger === "update" && session?.preferred_currency) {
        token.preferred_currency = session.preferred_currency;
      }

      // Enforce session_version validation so password resets / "sign out all" invalidate older JWTs
      const userId = (token.id || token.sub) as string | undefined;
      if (!userId) {
        return null;
      }
      const currentVersion = await getUserSessionVersion(userId);
      const tokenVersion = Number(token.session_version) || 1;
      if (currentVersion === null || currentVersion !== tokenVersion) {
        return null;
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
