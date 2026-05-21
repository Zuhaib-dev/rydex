import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Booking from "@/models/booking.model";

export async function GET() {
  await dbConnect();

  const session = await auth();
  if (session?.user?.role !== "admin") {
    return Response.json({ earnings: [] }, { status: 403 });
  }

  const bookings = await Booking.find({
    paymentStatus: { $in: ["paid", "cash"] },
  }).sort({ createdAt: 1 });

  const earningsMap: Record<string, number> = {};

  bookings.forEach((booking) => {
    const date = new Date(booking.createdAt).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });

    earningsMap[date] ||= 0;
    earningsMap[date] += booking.adminCommission || 0;
  });

  const earnings = Object.entries(earningsMap).map(([date, earnings]) => ({
    date,
    earnings,
  }));

  return Response.json({ earnings });
}
