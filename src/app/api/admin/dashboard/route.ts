import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
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

    const pendingPartnerUsers = await User.find({
      role: "partner",
      partnerStatus: "pending",
      partnerOnboardingSteps: 3,
    });

    const pendingPartnerUsersForVehicle = await User.find({
      role: "partner",
      partnerOnboardingSteps: 6,
    }).select("_id name email");

    const pendingVehicleReviews = await Vehicle.find({
      status: "pending",
      owner: { $in: pendingPartnerUsersForVehicle.map((u) => u._id) },
    }).populate("owner", "name email");

    const pendingVideoKYC = await User.find({
      role: "partner",
      partnerStatus: "pending",
      partnerOnboardingSteps: 4,
    });

    const partnerIds = pendingPartnerUsers.map((p) => p._id);
    const partnerVehciles = await Vehicle.find({
      owner: { $in: partnerIds },
    });
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
        pendingPartnerReviews,
        pendingVehicleReviews,
        pendingVideoKYC,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: `Admin server error${error} ` },
      { status: 500 },
    );
  }
}
