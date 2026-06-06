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

    const user = await User.findById(session.user.id).select("activeVehicleId vehicleLastActivatedAt").lean();

    return NextResponse.json({
      vehicles: enrichedVehicles,
      activeVehicleId: user?.activeVehicleId || null,
      vehicleLastActivatedAt: user?.vehicleLastActivatedAt || null,
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
    if (
      !type ||
      !brand ||
      !vehicleModel ||
      !vehicleNumber ||
      !color ||
      !manufacturingYear ||
      !fuelType ||
      !seatingCapacity
    ) {
      return NextResponse.json({ message: "Required fields are missing" }, { status: 400 });
    }

    const BRAND_REGEX = /^[a-zA-Z\s.-]+$/;
    const COLOR_REGEX = /^[a-zA-Z\s-]+$/;

    const trimmedBrand = String(brand).trim();
    if (trimmedBrand.length < 2 || trimmedBrand.length > 50) {
      return NextResponse.json({ message: "Brand/Make must be between 2 and 50 characters" }, { status: 400 });
    }
    if (!BRAND_REGEX.test(trimmedBrand)) {
      return NextResponse.json({ message: "Brand name contains invalid characters" }, { status: 400 });
    }

    const trimmedModel = String(vehicleModel).trim();
    if (trimmedModel.length < 2 || trimmedModel.length > 50) {
      return NextResponse.json({ message: "Model name must be between 2 and 50 characters" }, { status: 400 });
    }
    if (!VEHICLE_MODEL_REGEX.test(trimmedModel)) {
      return NextResponse.json({ message: "Model contains invalid characters" }, { status: 400 });
    }

    if (!VEHICLE_REGEX.test(vehicleNumber)) {
      return NextResponse.json({ message: "Invalid plate number format (e.g. MH12 AB 1234)" }, { status: 400 });
    }

    const trimmedColor = String(color).trim();
    if (trimmedColor.length < 2 || trimmedColor.length > 30) {
      return NextResponse.json({ message: "Color must be between 2 and 30 characters" }, { status: 400 });
    }
    if (!COLOR_REGEX.test(trimmedColor)) {
      return NextResponse.json({ message: "Color contains invalid characters" }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();
    const yearNum = Number(manufacturingYear);
    if (isNaN(yearNum) || yearNum < 1990 || yearNum > currentYear + 1) {
      return NextResponse.json({ message: `Manufacturing year must be between 1990 and ${currentYear + 1}` }, { status: 400 });
    }

    const seatsNum = Number(seatingCapacity);
    if (isNaN(seatsNum) || seatsNum < 1 || seatsNum > 20) {
      return NextResponse.json({ message: "Seating capacity must be between 1 and 20" }, { status: 400 });
    }

    const allowedTypes = ["bike", "car", "truck", "loading", "auto"];
    if (!allowedTypes.includes(type)) {
      return NextResponse.json({ message: "Invalid vehicle type" }, { status: 400 });
    }

    const allowedFuels = ["petrol", "diesel", "cng", "electric", "hybrid"];
    if (!allowedFuels.includes(fuelType)) {
      return NextResponse.json({ message: "Invalid fuel type" }, { status: 400 });
    }

    const normalizedNumber = vehicleNumber.toUpperCase().replace(/[\s-]/g, "");
    const duplicate = await Vehicle.findOne({ vehicleNumber: normalizedNumber, isActive: true });
    if (duplicate) {
      return NextResponse.json({ message: "Vehicle registration number already exists in system" }, { status: 400 });
    }

    const bf = Number(bodyBaseFare);
    const pkm = Number(bodyPerKmRate);
    const wc = Number(bodyWaitingCharge);
    const isTruck = type === "truck";
    const maxBase = isTruck ? 200 : 100;
    const maxPerKm = isTruck ? 200 : 100;

    if (bodyBaseFare === undefined || isNaN(bf) || bf < 1 || bf > maxBase) {
      return NextResponse.json({ message: `Base fare must be between 1 and ${maxBase}` }, { status: 400 });
    }
    if (bodyPerKmRate === undefined || isNaN(pkm) || pkm < 5 || pkm > maxPerKm) {
      return NextResponse.json({ message: `Price per KM must be between 5 and ${maxPerKm}` }, { status: 400 });
    }
    if (bodyWaitingCharge === undefined || isNaN(wc) || wc < 1 || wc > 10) {
      return NextResponse.json({ message: "Waiting charge must be between 1 and 10" }, { status: 400 });
    }

    const newVehicle = await Vehicle.create({
      owner: session.user.id,
      type,
      brand: trimmedBrand,
      vehicleModel: trimmedModel,
      vehicleNumber: normalizedNumber,
      color: trimmedColor,
      manufacturingYear: yearNum,
      fuelType,
      seatingCapacity: seatsNum,
      imageUrl: imageUrl || undefined,
      baseFare: bf,
      perKmRate: pkm,
      waitingCharge: wc,
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
