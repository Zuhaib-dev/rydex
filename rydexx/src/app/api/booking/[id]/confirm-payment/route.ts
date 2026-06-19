import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import { NextResponse } from "next/server";
import { emitBookingUpdated } from "@/lib/bookingEvents";
import { auth } from "@/lib/auth";
import { applyCommissionSplit } from "@/lib/commissionSplit";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  await connectDb();

  // ── Auth guard ───────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const { method } = await req.json();

  const booking = await Booking.findById(id).populate("driver vehicle");

  if (!booking) {
    return NextResponse.json({ message: "Booking not found" }, { status: 404 });
  }

  if (booking.status !== "awaiting_payment") {
    return NextResponse.json(
      { message: "Booking is not awaiting payment" },
      { status: 400 }
    );
  }

  // ── Only the booking's user (rider) or assigned driver may call this ──
  // The rider calls it to select cash payment; the driver calls it to confirm cash received.
  const driverDocId =
    typeof booking.driver === "object" && "_id" in booking.driver
      ? String((booking.driver as any)._id)
      : String(booking.driver);

  const userDocId = String(booking.user);
  const callerId = String(session.user.id);

  const isRider = callerId === userDocId;
  const isDriver = callerId === driverDocId;

  if (!isRider && !isDriver) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }


  booking.status = "confirmed";
  booking.paymentStatus = method === "cash" ? "cash" : method === "pass" ? "pass" : "paid";
  booking.paymentDeadline = undefined;

  if (method === "cash" || method === "pass") {
    const { partnerAmount, adminCommission } = applyCommissionSplit(booking.fare);
    booking.adminCommission = adminCommission;
    booking.partnerAmount = partnerAmount;
  }

  await booking.save();

  await emitBookingUpdated(booking, {
    bookingId: booking._id,
    status: "confirmed",
    paymentStatus: booking.paymentStatus,
  });

  return NextResponse.json({ success: true });
}
