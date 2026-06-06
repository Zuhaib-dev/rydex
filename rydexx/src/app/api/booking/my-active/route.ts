import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { auth } from "@/lib/auth";

export async function GET() {
  await connectDb();

  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ booking: null });

  const booking = await Booking.findOne({
    user: session.user.id,
    status: {
      $in: ["requested", "awaiting_payment", "confirmed", "arriving", "arrived", "started"],
    },
  })
    .sort({ createdAt: -1 })
    .populate("driver", "name email mobileNumber ratingAverage ratingCount image")
    .populate("vehicle")
    .lean();

  return NextResponse.json({ booking });
}
