import { auth } from "@/auth";
import { Navbar, type NavbarUser } from "./Navbar";
import type { Session } from "next-auth";

export interface HeaderProps {
  session?: Session | null;
  user?: NavbarUser | null;
}

export async function Header({
  session: passedSession,
  user: passedUser,
}: HeaderProps = {}) {
  if (passedUser !== undefined) {
    return <Navbar user={passedUser} />;
  }

  const session = passedSession !== undefined ? passedSession : await auth();
  return <Navbar user={session?.user ?? null} />;
}
