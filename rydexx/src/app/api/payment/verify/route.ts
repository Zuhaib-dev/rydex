import connectDb from "@/lib/db"
import Booking from "@/models/booking.model"
import crypto from "crypto"
import { emitBookingUpdated } from "@/lib/bookingEvents"
import { auth } from "@/lib/auth"
import { applyCommissionSplit } from "@/lib/commissionSplit"
import { paymentVerifySchema } from "@/lib/validations/payment"



export async function POST(req: Request) {

  await connectDb()

  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ success:false, message:"Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const validation = paymentVerifySchema.safeParse(body)
  if (!validation.success) {
    const errorMsg = validation.error.errors[0]?.message || "Validation failed"
    return Response.json(
      { success: false, message: errorMsg, errors: validation.error.format() },
      { status: 400 }
    )
  }

  const {
    bookingId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  } = validation.data

  const secretKey = process.env.RAZORPAY_KEY_SECRET;
  if (!secretKey) {
    console.error("[verify-payment] RAZORPAY_KEY_SECRET is not configured in the environment.");
    return Response.json(
      { success: false, message: "Payment verification service is misconfigured." },
      { status: 500 }
    );
  }

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", secretKey)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return Response.json({ success: false, message: "Invalid signature" });
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

  /* SPLIT CALCULATION — always use the actual paid fare (post-discount) */
  const { partnerAmount, adminCommission } = applyCommissionSplit(booking.fare);

  booking.paymentStatus = "paid"
  booking.status = "confirmed"

  booking.adminCommission = adminCommission
  booking.partnerAmount = partnerAmount

  await booking.save()

  await emitBookingUpdated(booking, {
    bookingId: booking._id,
    status: "confirmed",
    paymentStatus: booking.paymentStatus,
  })

  return Response.json({
    success: true,
    adminCommission,
    partnerAmount,
  })
}
