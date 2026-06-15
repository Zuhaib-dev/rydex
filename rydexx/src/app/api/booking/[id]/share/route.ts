import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import { NextResponse, NextRequest } from "next/server";
import "@/models/user.model"; // Ensure User model is compiled/registered for populate
import "@/models/vehicle.model"; // Ensure Vehicle model is compiled/registered for populate

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDb();
    const { id } = await context.params;

    // Validate that id is a valid 24-character hexadecimal MongoDB ObjectId
    if (!id || typeof id !== "string" || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    }

    const booking = await Booking.findById(id)
      .populate({
        path: "driver",
        select: "name image ratingAverage ratingCount location isOnline", // Omitted mobileNumber for privacy
      })
      .populate({
        path: "vehicle",
        select: "type vehicleModel vehicleNumber",
      })
      .lean();

    if (!booking) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    }

    // Restrict access to active bookings or recently completed bookings (last 15 minutes)
    const activeStatuses = ["confirmed", "arriving", "arrived", "started"];
    const isActive = activeStatuses.includes(booking.status);

    const isCompleted = booking.status === "completed";
    const completedAtTime = booking.completedAt ? new Date(booking.completedAt).getTime() : 0;
    const isRecentlyCompleted = isCompleted && (Date.now() - completedAtTime < 15 * 60 * 1000); // 15-minute window

    if (!isActive && !isRecentlyCompleted) {
      return NextResponse.json(
        { message: "Share link has expired or is invalid" },
        { status: 410 }
      );
    }

    // Protect driver's privacy: do not return location after trip is completed
    const driverObj = booking.driver as any;
    if (isCompleted && driverObj) {
      driverObj.location = undefined;
    }

    const safeBooking = {
      _id: booking._id,
      pickupAddress: booking.pickupAddress,
      dropAddress: booking.dropAddress,
      pickupLocation: booking.pickupLocation,
      dropLocation: booking.dropLocation,
      status: booking.status,
      fare: booking.fare,
      vehicleType: booking.vehicleType,
      driver: booking.driver,
      vehicle: booking.vehicle,
      sosTriggered: booking.sosTriggered || false,
      sosTriggeredAt: booking.sosTriggeredAt || null,
      createdAt: booking.createdAt,
    };

    return NextResponse.json({ success: true, booking: safeBooking });
  } catch (error: any) {
    console.error("GET /api/booking/[id]/share error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

