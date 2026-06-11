import { NextResponse } from "next/server"
import razorpay from "@/lib/razorpay"
import connectDb from "@/lib/db"
import Booking from "@/models/booking.model"
import { auth } from "@/lib/auth"
import { paymentCreateSchema } from "@/lib/validations/payment"



export async function POST(req: Request) {

  await connectDb()

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const validation = paymentCreateSchema.safeParse(body)
  if (!validation.success) {
    const errorMsg = validation.error.errors[0]?.message || "Validation failed"
    return NextResponse.json(
      { error: errorMsg, errors: validation.error.format() },
      { status: 400 }
    )
  }

  const { bookingId } = validation.data

  const booking = await Booking.findById(bookingId)

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }

  if (String(booking.user) !== String(session.user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!["requested", "awaiting_payment"].includes(booking.status)) {
    return NextResponse.json(
      { error: "Payment cannot be created for this booking status" },
      { status: 409 },
    )
  }

  if (booking.paymentStatus === "paid") {
    return NextResponse.json(
      { error: "Booking is already paid" },
      { status: 409 },
    )
  }

  const order = await razorpay.orders.create({
    amount: Math.round(booking.fare * 100),
    currency: "INR",
    receipt: booking._id.toString(),
  })

  booking.status = "awaiting_payment"
  await booking.save()

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount
  })
}
