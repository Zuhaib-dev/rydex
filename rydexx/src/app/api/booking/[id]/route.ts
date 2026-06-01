import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDb();
  const booking = await Booking.findById(id).populate("driver vehicle").lean();

  if (!booking) {
    return NextResponse.json({ message: "Booking not found" }, { status: 404 });
  }

  const userId = session.user.id;
  const userRole = session.user.role;

  // Verify authorization: only the rider, assigned driver, or admin can view details
  const isUser = booking.user?.toString() === userId;
  const isDriver = booking.driver?._id?.toString() === userId || booking.driver?.toString() === userId;
  const isAdmin = userRole === "admin";

  if (!isUser && !isDriver && !isAdmin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(booking);
}
