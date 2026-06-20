import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  await connectDb();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const skip = (page - 1) * limit;

  const total = await Booking.countDocuments({ user: session.user.id });

  const bookings = await Booking.find({ user: session.user.id })
    .populate({
      path: "vehicle",
      select: "vehicleModel imageUrl type vehicleNumber",
    })
    .populate({
      path: "driver",
      select: "name mobileNumber image",
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return NextResponse.json({
    bookings,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
}
