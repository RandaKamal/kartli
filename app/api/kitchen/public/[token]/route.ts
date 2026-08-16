import { NextRequest, NextResponse } from "next/server";
import { getKitchenByPublicToken } from "@/lib/kitchen";

/**
 * GET /api/kitchen/public/[token]
 * Public read-only endpoint for low-bandwidth / guest kitchen access.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const kitchen = await getKitchenByPublicToken(token);

  if (!kitchen) {
    return NextResponse.json(
      { error: "KITCHEN_NOT_FOUND", message: "Kitchen not found or invalid public token." },
      { status: 404 }
    );
  }

  return NextResponse.json(kitchen);
}
