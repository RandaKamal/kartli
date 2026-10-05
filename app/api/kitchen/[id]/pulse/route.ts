import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getKitchenStats } from "@/lib/actions/stats";
import { getUserMembership } from "@/lib/kitchen";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: kitchenId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized: You must be logged in." },
        { status: 401 }
      );
    }

    const membership = await getUserMembership(kitchenId, session.user.id);
    if (!membership) {
      return NextResponse.json(
        { error: "Forbidden: You are not a member of this space." },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get("month") || undefined;

    const stats = await getKitchenStats(kitchenId, session.user.id, month);
    return NextResponse.json({ success: true, data: stats }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
