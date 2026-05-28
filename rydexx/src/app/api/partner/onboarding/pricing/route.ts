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
    const baseFare = Number(formData.get("baseFare"));
    const perKmRate = Number(formData.get("perKmRate"));
    const waitingCharge = Number(formData.get("waitingCharge"));
    const imageFile = formData.get("vehicleImage") as Blob | null;

    if (!baseFare || !perKmRate || !waitingCharge) {
      return Response.json(
        { message: "All pricing fields are required" },
        { status: 400 },
      );
    }

    const vehicle = await Vehicle.findOne({ owner: user._id });
    if (!vehicle) {
      return Response.json({ message: "Vehicle not found" }, { status: 404 });
    }

    vehicle.baseFare = baseFare;
    vehicle.perKmRate = perKmRate;
    vehicle.waitingCharge = waitingCharge;

    if (imageFile && imageFile.size > 0) {
      const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
      const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

      if (imageFile.size > MAX_IMAGE_SIZE) {
        return Response.json(
          { message: "Vehicle photo size must be less than 5MB" },
          { status: 400 },
        );
      }
      if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
        return Response.json(
          { message: "Vehicle photo must be a valid image (JPEG, PNG, WEBP)" },
          { status: 400 },
        );
      }

      const imageUrl = await uploadOnImageKit(imageFile);
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
