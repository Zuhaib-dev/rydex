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

    const booking = await Booking.findById(id)
      .populate({
        path: "driver",
        select: "name image ratingAverage ratingCount location isOnline mobileNumber",
      })
      .populate({
        path: "vehicle",
        select: "type vehicleModel vehicleNumber",
      })
      .lean();

    if (!booking) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 });
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
