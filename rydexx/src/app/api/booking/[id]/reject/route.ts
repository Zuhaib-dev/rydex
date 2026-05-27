import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { auth } from "@/lib/auth";
import { cascadeBooking } from "@/lib/matchmaker";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await connectDb();
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const driverId = session.user.id;

  const result = await cascadeBooking(id, driverId);

  if (!result.success) {
    return NextResponse.json(
      { message: result.message || "Ride already processed or invalid" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, cascaded: result.cascaded });
}
