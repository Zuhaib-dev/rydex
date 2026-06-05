import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import Vehicle from "@/models/vehicle.model";
import VehicleDoc from "@/models/vehicleDoc.model";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

const VEHICLE_REGEX = /^[A-Za-z]{2}[\s-]?[0-9]{2}[\s-]?[A-Za-z]{0,2}[\s-]?[0-9]{4}$/;
const VEHICLE_MODEL_REGEX = /^[a-zA-Z0-9\-_()\/+.]+(?:\s+[a-zA-Z0-9\-_()\/+.]+)*$/;

// GET: List all vehicles for the logged-in partner
export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const vehicles = await Vehicle.find({ owner: session.user.id, isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    const vehicleIds = vehicles.map((v) => v._id);
    const documents = await VehicleDoc.find({ vehicleId: { $in: vehicleIds } }).lean();

    // Map documents to each vehicle
    const enrichedVehicles = vehicles.map((vehicle) => {
      return {
        ...vehicle,
        documents: documents.filter((doc) => String(doc.vehicleId) === String(vehicle._id)),
      };
    });

    const user = await User.findById(session.user.id).select("activeVehicleId").lean();

    return NextResponse.json({
      vehicles: enrichedVehicles,
      activeVehicleId: user?.activeVehicleId || null,
    });
  } catch (error: any) {
    console.error("Fetch partner vehicles error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// POST: Add a new vehicle to the driver's garage
export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      type,
      brand,
      vehicleModel,
      vehicleNumber,
      color,
      manufacturingYear,
      fuelType,
      seatingCapacity,
      imageUrl,
      baseFare: bodyBaseFare,
      perKmRate: bodyPerKmRate,
      waitingCharge: bodyWaitingCharge,
    } = body;

    // Validation
    if (!type || !brand || !vehicleModel || !vehicleNumber || !color || !manufacturingYear || !fuelType) {
      return NextResponse.json({ message: "Required fields are missing" }, { status: 400 });
    }

    const allowedTypes = ["bike", "car", "truck", "loading", "auto"];
    if (!allowedTypes.includes(type)) {
      return NextResponse.json({ message: "Invalid vehicle type" }, { status: 400 });
    }

    const trimmedModel = vehicleModel.trim();
    if (trimmedModel.length < 2 || trimmedModel.length > 50) {
      return NextResponse.json({ message: "Model name must be 2-50 chars" }, { status: 400 });
    }

    if (!VEHICLE_MODEL_REGEX.test(trimmedModel)) {
      return NextResponse.json({ message: "Model contains invalid characters" }, { status: 400 });
    }

    if (!VEHICLE_REGEX.test(vehicleNumber)) {
      return NextResponse.json({ message: "Invalid plate number format (e.g. MH12 AB 1234)" }, { status: 400 });
    }

    const normalizedNumber = vehicleNumber.toUpperCase().replace(/[\s-]/g, "");
    const duplicate = await Vehicle.findOne({ vehicleNumber: normalizedNumber, isActive: true });
    if (duplicate) {
      return NextResponse.json({ message: "Vehicle registration number already exists in system" }, { status: 400 });
    }

    // Set pricing defaults if not provided
    const isTruck = type === "truck";
    let baseFare = Number(bodyBaseFare);
    let perKmRate = Number(bodyPerKmRate);
    let waitingCharge = Number(bodyWaitingCharge);

    if (isNaN(baseFare) || baseFare <= 0) {
      baseFare = isTruck ? 150 : type === "car" ? 60 : type === "auto" ? 40 : type === "loading" ? 100 : 30;
    }
    if (isNaN(perKmRate) || perKmRate <= 0) {
      perKmRate = isTruck ? 35 : type === "car" ? 18 : type === "auto" ? 12 : type === "loading" ? 25 : 8;
    }
    if (isNaN(waitingCharge) || waitingCharge <= 0) {
      waitingCharge = isTruck ? 5 : type === "car" ? 3 : 2;
    }

    const newVehicle = await Vehicle.create({
      owner: session.user.id,
      type,
      brand,
      vehicleModel: trimmedModel,
      vehicleNumber: normalizedNumber,
      color,
      manufacturingYear: Number(manufacturingYear),
      fuelType,
      seatingCapacity: seatingCapacity ? Number(seatingCapacity) : undefined,
      imageUrl: imageUrl || undefined,
      baseFare,
      perKmRate,
      waitingCharge,
      status: "pending",
      isActive: true,
    });

    return NextResponse.json({
      message: "Vehicle added successfully",
      vehicle: newVehicle,
    });
  } catch (error: any) {
    console.error("Create vehicle error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
