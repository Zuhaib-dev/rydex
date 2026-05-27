
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Booking from "@/models/booking.model";


export async function GET() {
  await dbConnect();

  const session = await auth();
  const driverId = session?.user?.id;

  if (!driverId) {
    return Response.json({ earnings: [] });
  }

  const bookings = await Booking.find({
    driver: driverId,
    paymentStatus: { $in: ["paid", "cash"] },
    status: "completed",
  }).sort({ createdAt: 1 });

  const earningsMap: Record<string, number> = {};

  bookings.forEach((booking) => {
    const date = new Date(booking.createdAt).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });

    if (!earningsMap[date]) {
      earningsMap[date] = 0;
    }

    let pAmount = booking.partnerAmount;
    if (pAmount == null) {
      const adminCommission = (booking.fare || 0) * 0.10;
      pAmount = (booking.fare || 0) - adminCommission;
    }

    earningsMap[date] += pAmount;
  });

  const earnings = Object.entries(earningsMap).map(([date, earnings]) => ({
    date,
    earnings,
  }));

  return Response.json({
    earnings,
  });
}
