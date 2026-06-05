import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import { NextResponse } from "next/server";
import { emitBookingUpdated } from "@/lib/bookingEvents";

export async function POST(
  req: Request,
  context: { params:Promise< { id: string } >}
) {
  await connectDb();
   const id=(await context.params).id
  const { method } = await req.json();
  const booking = await Booking.findById(id).populate("driver vehicle");

  if (!booking || booking.status !== "awaiting_payment")
    return NextResponse.json({ message: "Invalid" }, { status: 400 });

  booking.status = "confirmed";
  booking.paymentStatus = method === "cash" ? "cash" : "paid";
  booking.paymentDeadline = undefined;
  
  if (method === "cash") {
    const origFare = booking.originalFare || booking.fare;
    const partnerAmount = origFare * 0.90;
    const adminCommission = booking.fare - partnerAmount;
    booking.adminCommission = Math.round(adminCommission * 100) / 100;
    booking.partnerAmount = Math.round(partnerAmount * 100) / 100;
  }

  await booking.save();

  await emitBookingUpdated(booking, {
    bookingId: booking._id,
    status: "confirmed",
    paymentStatus: booking.paymentStatus,
  });

  return NextResponse.json({ success: true });
}
