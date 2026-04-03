import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { NextRequest } from "next/server";

const VEHICLE_REGEX =
  /^[A-Za-z]{2}[\s-]?[0-9]{2}[\s-]?[A-Za-z]{0,2}[\s-]?[0-9]{4}$/;

export async function POST(req: Request) {
  try {
    await connectDb();
    const session = await auth();
    if (!session || !session.user?.email) {
      return Response.json({ message: "User unauthorized " }, { status: 400 });
    }
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return Response.json({ message: "User not found" }, { status: 400 });
    }
    const { vehicleType, vehicleModel, vehicleNumber } = await req.json();
    if (!vehicleModel || !vehicleNumber || !vehicleType) {
      return Response.json(
        { message: "All fields are required" },
        { status: 400 },
      );
    }
    if (!VEHICLE_REGEX.test(vehicleNumber)) {
      return Response.json(
        { message: "Invalid vehicle number" },
        { status: 400 },
      );
    }
    const number = vehicleNumber.toUpperCase().replace(/[\s-]/g, "");
    const duplicate = await Vehicle.findOne({ vehicleNumber: number });
    if (duplicate && duplicate.owner.toString() !== session.user.id) {
      return Response.json(
        { message: "Vehicle already exists" },
        { status: 400 },
      );
    }
    const vehicle = await Vehicle.findOne({ owner: session.user.id });
    if (vehicle) {
      vehicle.type = vehicleType;
      vehicle.vehicleModel = vehicleModel;
      vehicle.vehicleNumber = number;
      vehicle.status = "pending";
      await vehicle.save();
    } else {
      await Vehicle.create({
        owner: session.user.id,
        type: vehicleType,
        vehicleModel: vehicleModel,
        vehicleNumber: number,
        status: "pending",
        baseFare: 0,
        perKmRate: 0,
        waitingCharge: 0,
        isActive: true,
      });
    }

    // If partner has already progressed past step 1 (vehicle), reset back to step 1
    // so all downstream steps (docs, bank, review, KYC, pricing) require re-completion
    if (user.partnerOnboardingSteps >= 1) {
      user.partnerOnboardingSteps = 1;
      user.partnerStatus = "pending";
      // If they were already KYC-approved, revoke it so they need a fresh KYC
      if (user.videoKycStatus === "approved") {
        user.videoKycStatus = "not_required";
        user.videoKycRoomId = undefined;
      }
    }

    user.role = "partner";
    await user.save();

    return Response.json({ message: "Vehicle details saved successfully" });
  } catch (error) {
    console.error(error);
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const session = await auth();
    if (!session || !session.user?.email) {
      return Response.json({ message: "User unauthorized " }, { status: 400 });
    }
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return Response.json({ message: "User not found" }, { status: 400 });
    }
    const vehicle = await Vehicle.findOne({ owner: session.user.id });
    if (!vehicle) {
      return Response.json({ message: "Vehicle not found" }, { status: 404 });
    }
    return Response.json({ vehicle });
  } catch (error) {
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}
