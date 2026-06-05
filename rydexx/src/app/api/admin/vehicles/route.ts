import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import Vehicle from "@/models/vehicle.model";
import VehicleDoc from "@/models/vehicleDoc.model";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    await connectDb();
    const session = await auth();
    if (!session || !session.user?.email || session.user?.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const filter = searchParams.get("filter") || ""; // 'expiring' or 'expired'
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    const query: any = { isActive: true };

    if (status) {
      query.status = status;
    }

    if (search) {
      const regex = { $regex: search, $options: "i" };
      query.$or = [
        { brand: regex },
        { vehicleModel: regex },
        { vehicleNumber: regex },
      ];
    }

    // Filter by document expiry
    if (filter === "expiring" || filter === "expired") {
      const now = new Date();
      const docsQuery: any = {};
      if (filter === "expired") {
        docsQuery.expiryDate = { $lt: now };
      } else {
        // Expiring in next 30 days
        const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        docsQuery.expiryDate = { $gte: now, $lte: thirtyDaysLater };
      }

      const matchingDocs = await VehicleDoc.find(docsQuery).select("vehicleId").lean();
      const vehicleIds = matchingDocs.map((d) => d.vehicleId);
      query._id = { $in: vehicleIds };
    }

    const total = await Vehicle.countDocuments(query);
    const vehicles = await Vehicle.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("owner", "name email mobileNumber partnerStatus")
      .lean();

    const vehicleIds = vehicles.map((v) => v._id);
    const documents = await VehicleDoc.find({ vehicleId: { $in: vehicleIds } }).lean();

    const enrichedVehicles = vehicles.map((vehicle) => ({
      ...vehicle,
      documents: documents.filter((d) => String(d.vehicleId) === String(vehicle._id)),
    }));

    return NextResponse.json({
      vehicles: enrichedVehicles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Admin list vehicles error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
