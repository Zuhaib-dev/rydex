import connectDb from "@/lib/db"
import Booking from "@/models/booking.model"
import crypto from "crypto"
import { emitBookingUpdated } from "@/lib/bookingEvents"
import { auth } from "@/lib/auth"



export async function POST(req: Request) {

  await connectDb()

  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ success:false, message:"Unauthorized" }, { status: 401 })
  }

  const {
    bookingId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  } = await req.json()

  const body = razorpay_order_id + "|" + razorpay_payment_id

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest("hex")

  if (expectedSignature !== razorpay_signature) {
    return Response.json({ success:false, message:"Invalid signature" })
  }

  const booking = await Booking.findById(bookingId).populate("driver vehicle")

  if (!booking) {
    return Response.json({ success:false, message:"Booking not found" }, { status: 404 })
  }

  if (String(booking.user) !== String(session.user.id)) {
    return Response.json({ success:false, message:"Forbidden" }, { status: 403 })
  }

  if (booking.paymentStatus === "paid") {
    return Response.json({ success:true, message:"Payment already verified" })
  }

  if (booking.status !== "awaiting_payment") {
    return Response.json(
      { success:false, message:"Booking is not awaiting payment" },
      { status: 409 },
    )
  }

  /* SPLIT CALCULATION */

  const origFare = booking.originalFare || booking.fare;
  const partnerAmount = origFare * 0.90;
  const adminCommission = booking.fare - partnerAmount;

  booking.paymentStatus = "paid"
  booking.status = "confirmed"

  booking.adminCommission = Math.round(adminCommission * 100) / 100
  booking.partnerAmount = Math.round(partnerAmount * 100) / 100

  await booking.save()

  await emitBookingUpdated(booking, {
    bookingId: booking._id,
    status: "confirmed",
    paymentStatus: booking.paymentStatus,
  })

  return Response.json({
    success:true,
    adminCommission,
    partnerAmount
  })
}
