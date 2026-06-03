import { auth } from "@/lib/auth";
import { notifyAdminDashboard } from "@/lib/adminEvents";
import connectDb from "@/lib/db";
import uploadOnImageKit from "@/lib/imagekit";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const session = await auth();
    if (!session || !session.user?.email) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== "partner") {
      return Response.json({ message: "Partner not found" }, { status: 404 });
    }

    // Only allow if KYC is approved (step 5 completed)
    if (user.partnerOnboardingSteps < 5) {
      return Response.json(
        { message: "Complete Video KYC before setting pricing" },
        { status: 403 },
      );
    }

    const formData = await req.formData();
    const baseFareStr = formData.get("baseFare")?.toString().trim();
    const perKmRateStr = formData.get("perKmRate")?.toString().trim();
    const waitingChargeStr = formData.get("waitingCharge")?.toString().trim();
    const imageFile = (formData.get("vehicleImage") as File) || null;

    if (!baseFareStr || !perKmRateStr || !waitingChargeStr) {
      return Response.json(
        { message: "All pricing fields are required" },
        { status: 400 },
      );
    }

    const baseFare = Number(baseFareStr);
    const perKmRate = Number(perKmRateStr);
    const waitingCharge = Number(waitingChargeStr);

    if (isNaN(baseFare) || isNaN(perKmRate) || isNaN(waitingCharge)) {
      return Response.json(
        { message: "Pricing fields must be valid numbers" },
        { status: 400 },
      );
    }

    const vehicle = await Vehicle.findOne({ owner: user._id });
    if (!vehicle) {
      return Response.json({ message: "Vehicle not found" }, { status: 404 });
    }

    const isTruck = vehicle.type === "truck";
    const maxBase = isTruck ? 200 : 100;
    const maxPerKm = isTruck ? 200 : 100;

    if (baseFare < 1 || baseFare > maxBase) {
      return Response.json(
        { message: `Base fare must be between 1 and ${maxBase}` },
        { status: 400 },
      );
    }

    if (perKmRate < 5 || perKmRate > maxPerKm) {
      return Response.json(
        { message: `Price per KM must be between 5 and ${maxPerKm}` },
        { status: 400 },
      );
    }

    if (waitingCharge < 1 || waitingCharge > 10) {
      return Response.json(
        { message: "Waiting charge must be between 1 and 10" },
        { status: 400 },
      );
    }

    vehicle.baseFare = baseFare;
    vehicle.perKmRate = perKmRate;
    vehicle.waitingCharge = waitingCharge;

    if (imageFile && imageFile.size > 0) {
      const MAX_IMAGE_SIZE = 3 * 1024 * 1024; // 3MB
      const ALLOWED_IMAGE_TYPES = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/heic",
        "image/heif",
        "image/bmp",
        "image/tiff"
      ];

      if (imageFile.size > MAX_IMAGE_SIZE) {
        return Response.json(
          { message: "Vehicle photo size must be less than 3MB" },
          { status: 400 },
        );
      }
      if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
        return Response.json(
          { message: "Vehicle photo must be a valid image (JPEG, PNG, WEBP, GIF, BMP, TIFF, HEIC)" },
          { status: 400 },
        );
      }

      const imageUrl = await uploadOnImageKit(imageFile, imageFile.name);
      if (!imageUrl) {
        return Response.json(
          { message: "Image upload failed" },
          { status: 500 },
        );
      }
      vehicle.imageUrl = imageUrl;
    }

    vehicle.status = "pending";
    await vehicle.save();

    // Advance to step 6 (Pricing done → Final Review next)
    if (user.partnerOnboardingSteps === 5) {
      user.partnerOnboardingSteps = 6;
    }
    
    // Reset partner status to pending if they are resubmitting after a rejection
    if (user.partnerStatus === "rejected") {
      user.partnerStatus = "pending";
    }
    
    await user.save();

    if (user.partnerOnboardingSteps === 6) {
      await notifyAdminDashboard({
        scope: "dashboard",
        reason: "vehicle-review-submitted",
      });
    }

    return Response.json({ message: "Pricing saved successfully" });
  } catch (error) {
    console.error("Pricing save error:", error);
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const session = await auth();
    if (!session || !session.user?.email) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return Response.json({ message: "User not found" }, { status: 404 });
    }

    const vehicle = await Vehicle.findOne({ owner: user._id });
    if (!vehicle) {
      return Response.json({ message: "Vehicle not found" }, { status: 404 });
    }

    return Response.json({
      pricing: {
        baseFare: vehicle.baseFare,
        perKmRate: vehicle.perKmRate,
        waitingCharge: vehicle.waitingCharge,
        imageUrl: vehicle.imageUrl,
        vehicleModel: vehicle.vehicleModel,
        vehicleNumber: vehicle.vehicleNumber,
        type: vehicle.type,
      },
    });
  } catch (error) {
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}
