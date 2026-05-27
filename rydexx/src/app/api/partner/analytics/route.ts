import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Booking from "@/models/booking.model";
import Vehicle from "@/models/vehicle.model";
import { NextResponse } from "next/server";

// Haversine formula to compute distance in km
function getHaversineDistance(coords1: [number, number], coords2: [number, number]) {
  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET() {
  try {
    await dbConnect();

    const session = await auth();
    const driverId = session?.user?.id;

    if (!driverId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch completed bookings with payment status paid or cash
    const bookings = await Booking.find({
      driver: driverId,
      status: "completed",
      paymentStatus: { $in: ["paid", "cash"] },
    }).sort({ createdAt: 1 });

    // 2. Fetch vehicle details for fuel metrics
    const vehicle = await Vehicle.findOne({ owner: driverId, isActive: true, status: "approved" });
    const vehicleType = vehicle?.type || "car";

    // 3. Overall Stats Calculations
    const totalRides = bookings.length;
    let totalEarnings = 0;
    let stripePayouts = 0;
    let cashCollected = 0;
    let pendingCommission = 0;
    let totalDistanceKm = 0;

    bookings.forEach((booking) => {
      let pAmount = booking.partnerAmount;
      let comm = booking.adminCommission || 0;
      if (pAmount == null) {
        comm = (booking.fare || 0) * 0.10;
        pAmount = (booking.fare || 0) - comm;
      }

      totalEarnings += pAmount;

      if (booking.paymentStatus === "cash") {
        cashCollected += booking.fare || 0;
        pendingCommission += comm;
      } else {
        stripePayouts += pAmount;
      }

      if (booking.pickupLocation?.coordinates && booking.dropLocation?.coordinates) {
        const dist = getHaversineDistance(
          booking.pickupLocation.coordinates,
          booking.dropLocation.coordinates
        );
        totalDistanceKm += dist * 1.3; // 1.3 routing factor
      }
    });

    // 4. Daily Chart Breakdown (Last 14 days)
    const dailyMap = new Map();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      dailyMap.set(key, { date: key, earnings: 0, ridesCount: 0 });
    }

    bookings.forEach((booking) => {
      const dateKey = new Date(booking.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      });
      if (dailyMap.has(dateKey)) {
        const existing = dailyMap.get(dateKey);
        let pAmount = booking.partnerAmount;
        if (pAmount == null) {
          pAmount = (booking.fare || 0) * 0.90;
        }
        existing.earnings += pAmount;
        existing.ridesCount += 1;
        dailyMap.set(dateKey, existing);
      }
    });
    const daily = Array.from(dailyMap.values());

    // 5. Weekly Chart Breakdown (Last 6 weeks)
    const weeklyMap = new Map();
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(d.setDate(diff));
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const label = `${weekStart.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} - ${weekEnd.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`;
      weeklyMap.set(label, { date: label, start: weekStart.getTime(), end: weekEnd.getTime(), earnings: 0, ridesCount: 0 });
    }

    bookings.forEach((booking) => {
      const ts = new Date(booking.createdAt).getTime();
      for (const [label, weekData] of weeklyMap.entries()) {
        if (ts >= weekData.start && ts <= weekData.end) {
          let pAmount = booking.partnerAmount;
          if (pAmount == null) {
            pAmount = (booking.fare || 0) * 0.90;
          }
          weekData.earnings += pAmount;
          weekData.ridesCount += 1;
          weeklyMap.set(label, weekData);
          break;
        }
      }
    });
    const weekly = Array.from(weeklyMap.values()).map(({ date, earnings, ridesCount }) => ({
      date,
      earnings: Math.round(earnings),
      ridesCount,
    }));

    // 6. Monthly Chart Breakdown (Last 6 months)
    const monthlyMap = new Map();
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      monthlyMap.set(label, { date: label, earnings: 0, ridesCount: 0 });
    }

    bookings.forEach((booking) => {
      const label = new Date(booking.createdAt).toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      });
      if (monthlyMap.has(label)) {
        const existing = monthlyMap.get(label);
        let pAmount = booking.partnerAmount;
        if (pAmount == null) {
          pAmount = (booking.fare || 0) * 0.90;
        }
        existing.earnings += pAmount;
        existing.ridesCount += 1;
        monthlyMap.set(label, existing);
      }
    });
    const monthly = Array.from(monthlyMap.values()).map(m => ({
      ...m,
      earnings: Math.round(m.earnings),
    }));

    // 7. Fuel Metrics Calculations
    const FUEL_CONFIG: Record<string, { efficiency: number; type: string; price: number }> = {
      bike: { efficiency: 45, type: "Petrol", price: 102.5 },
      auto: { efficiency: 22, type: "CNG", price: 82.0 },
      car: { efficiency: 14, type: "Petrol", price: 102.5 },
      loading: { efficiency: 10, type: "Diesel", price: 90.0 },
      truck: { efficiency: 6, type: "Diesel", price: 90.0 },
    };

    const fuel = FUEL_CONFIG[vehicleType] || FUEL_CONFIG.car;
    const fuelConsumedLitres = totalDistanceKm / fuel.efficiency;
    const estimatedFuelCost = fuelConsumedLitres * fuel.price;

    // 8. Streak & Daily Goal Tracker
    const completedDates = Array.from(
      new Set(
        bookings.map((b) =>
          new Date(b.createdAt).toDateString()
        )
      )
    );

    let currentStreak = 0;
    const todayStr = new Date().toDateString();
    const yesterdayStr = new Date(Date.now() - 86400000).toDateString();

    if (completedDates.includes(todayStr) || completedDates.includes(yesterdayStr)) {
      let checkDate = completedDates.includes(todayStr) ? new Date() : new Date(Date.now() - 86400000);
      while (completedDates.includes(checkDate.toDateString())) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const ridesCompletedToday = bookings.filter(
      (b) => new Date(b.createdAt).getTime() >= todayStart.getTime()
    ).length;

    const dailyGoal = 5;
    const dailyGoalBonus = 250;
    const dailyGoalAchieved = ridesCompletedToday >= dailyGoal;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalEarnings: Math.round(totalEarnings),
          totalRides,
          stripePayouts: Math.round(stripePayouts),
          cashCollected: Math.round(cashCollected),
          pendingCommission: Math.round(pendingCommission),
          totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
        },
        fuel: {
          vehicleType,
          efficiency: fuel.efficiency,
          fuelType: fuel.type,
          pricePerUnit: fuel.price,
          consumed: Math.round(fuelConsumedLitres * 10) / 10,
          estimatedCost: Math.round(estimatedFuelCost),
          netProfit: Math.round(totalEarnings - estimatedFuelCost),
        },
        streaks: {
          currentStreak,
          ridesToday: ridesCompletedToday,
          dailyGoal,
          dailyGoalBonus,
          dailyGoalAchieved,
        },
        charts: {
          daily,
          weekly,
          monthly,
        }
      }
    });

  } catch (error: any) {
    console.error("Partner advanced analytics fetch error:", error);
    return NextResponse.json(
      { message: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
