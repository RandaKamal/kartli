import { NextRequest, NextResponse } from "next/server";
import { cleanupAllExpiredReceipts } from "@/lib/pantry";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deletedCount = await cleanupAllExpiredReceipts();
  return NextResponse.json({ success: true, deletedCount });
}
