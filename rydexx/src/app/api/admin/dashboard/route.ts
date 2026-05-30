import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import Booking from "@/models/booking.model";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectDb();
    const session = await auth();
    if (!session || !session.user?.email || session.user?.role !== "admin") {
      return Response.json({ message: "Unauthorized" }, { status: 400 });
    }
    const totalPartners = await User.countDocuments({ role: "partner" });
    const totalApprovedPartners = await User.countDocuments({
      role: "partner",
      partnerStatus: "approved",
    });
    const totalRejectedPartners = await User.countDocuments({
      role: "partner",
      partnerStatus: "rejected",
    });
    const totalPendingPartners = await User.countDocuments({
      role: "partner",
      partnerStatus: "pending",
    });
    const onlinePartners = await User.countDocuments({
      role: "partner",
      isOnline: true,
    });
    const activeRides = await Booking.countDocuments({
      status: { $in: ["requested", "awaiting_payment", "confirmed", "arriving", "arrived", "started"] },
    });
    const activeSos = await Booking.countDocuments({
      status: { $in: ["confirmed", "arriving", "arrived", "started"] },
      sosTriggered: true,
    });

    const pendingPartnerUsers = await User.find({
      role: "partner",
      partnerStatus: "pending",
      partnerOnboardingSteps: 3,
    }).lean();

    const pendingPartnerUsersForVehicle = await User.find({
      role: "partner",
      partnerOnboardingSteps: 6,
    }).select("_id name email").lean();

    const pendingVehicleReviews = await Vehicle.find({
      status: "pending",
      owner: { $in: pendingPartnerUsersForVehicle.map((u) => u._id) },
    }).populate("owner", "name email").lean();

    const pendingVideoKYC = await User.find({
      role: "partner",
      partnerStatus: "pending",
      partnerOnboardingSteps: 4,
    }).lean();

    const partnerIds = pendingPartnerUsers.map((p) => p._id);
    const partnerVehciles = await Vehicle.find({
      owner: { $in: partnerIds },
    }).lean();
    const vehivleTypeMap = new Map(
      partnerVehciles.map((v) => [String(v.owner), v.type]),
    );

    const pendingPartnerReviews = pendingPartnerUsers.map((p) => ({
      _id: p._id,
      name: p.name,
      email: p.email,
      vehicleType: vehivleTypeMap.get(String(p._id)),
    }));

    return NextResponse.json(
      {
        totalPartners,
        totalApprovedPartners,
        totalRejectedPartners,
        totalPendingPartners,
        onlinePartners,
        activeRides,
        activeSos,
        pendingPartnerReviews,
        pendingVehicleReviews,
        pendingVideoKYC,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("Admin dashboard error:", error);
    return NextResponse.json(
      { message: "An internal server error occurred." },
      { status: 500 },
    );
  }
}
