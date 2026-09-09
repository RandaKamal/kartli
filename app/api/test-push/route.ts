import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sendPushToUser } from "@/lib/push";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  await sendPushToUser(session.user.id, {
    title: "Test notification",
    body: "If you can see this, push notifications are working!",
    url: "/",
  });

  return NextResponse.json({ success: true });
}
