import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import { NextResponse } from "next/server";

export async function GET() {
  await connectDb();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const bookings = await Booking.find({ user: session.user.id })
    .populate({
      path: "vehicle",
      select: "vehicleModel imageUrl type vehicleNumber",
    })
    .populate({
      path: "driver",
      select: "name mobileNumber",
    })
    .sort({ createdAt: -1 });

  return NextResponse.json({ bookings });
}
