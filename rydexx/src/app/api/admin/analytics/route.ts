import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";

export async function GET() {
  await dbConnect();

  const session = await auth();
  if (session?.user?.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 1. Fetch completed bookings for the last 30 days
  const bookings = await Booking.find({
    status: "completed",
    createdAt: { $gte: thirtyDaysAgo },
  }).sort({ createdAt: 1 });

  const dailyStatsMap: Record<
    string,
    { revenue: number; rideCount: number; totalDuration: number; durationCount: number }
  > = {};

  bookings.forEach((booking) => {
    const date = new Date(booking.createdAt).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });

    if (!dailyStatsMap[date]) {
      dailyStatsMap[date] = { revenue: 0, rideCount: 0, totalDuration: 0, durationCount: 0 };
    }

    // Revenue
    let aCommission = booking.adminCommission;
    if (aCommission == null) {
      aCommission = (booking.fare || 0) * 0.10;
    }
    dailyStatsMap[date].revenue += aCommission;

    // Ride Count
    dailyStatsMap[date].rideCount += 1;

    // Completion Time
    if (booking.startedAt && booking.completedAt) {
      const durationMs = new Date(booking.completedAt).getTime() - new Date(booking.startedAt).getTime();
      const durationMins = durationMs / 60000;
      dailyStatsMap[date].totalDuration += durationMins;
      dailyStatsMap[date].durationCount += 1;
    }
  });

  const dailyStats = Object.entries(dailyStatsMap).map(([date, stats]) => ({
    date,
    revenue: Math.round(stats.revenue),
    rideVolume: stats.rideCount,
    avgDuration: stats.durationCount > 0 ? Math.round(stats.totalDuration / stats.durationCount) : 0,
  }));

  // 2. Fetch Driver Status
  const drivers = await User.find({ role: "partner", partnerStatus: "approved" });
  
  let online = 0;
  let busy = 0;
  let offline = 0;

  drivers.forEach((driver) => {
    if (!driver.isOnline) {
      offline += 1;
    } else if (driver.isOnline && !driver.isPartnerAvailable) {
      busy += 1;
    } else {
      online += 1;
    }
  });

  const driverStats = [
    { name: "Online", value: online, fill: "#10b981" }, // Emerald
    { name: "On Ride", value: busy, fill: "#f59e0b" },  // Amber
    { name: "Offline", value: offline, fill: "#ef4444" }, // Red
  ];

  return Response.json({ dailyStats, driverStats });
}
