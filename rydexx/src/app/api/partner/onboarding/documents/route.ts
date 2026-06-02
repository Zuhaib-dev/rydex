import { auth } from "@/lib/auth";
import uploadOnImageKit from "@/lib/imagekit";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import PartnerDocs from "@/models/partnerDocs.model";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const session = await auth();
    if (!session || !session.user?.email) {
      return Response.json({ message: "User unauthorized " }, { status: 400 });
    }
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return Response.json({ message: "User not found" });
    }
    const formdata = await req.formData();
    const aadhar = (formdata.get("aadhar") as any) || null;
    const drivingLicense = (formdata.get("drivingLicense") as any) || null;
    const rc = (formdata.get("rc") as any) || null;
    
    if (!aadhar || !drivingLicense || !rc) {
      return Response.json(
        { message: "All documents are required" },
        { status: 400 },
      );
    }

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
    const ALLOWED_PDF_TYPES = ["application/pdf"];

    const validateFile = (file: any, name: string) => {
      const type = file.type || "";
      const size = file.size || 0;

      if (ALLOWED_PDF_TYPES.includes(type)) {
        const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB
        if (size > MAX_PDF_SIZE) {
          return `${name} (PDF) size must be less than 10MB`;
        }
      } else if (ALLOWED_IMAGE_TYPES.includes(type)) {
        const MAX_IMAGE_SIZE = 3 * 1024 * 1024; // 3MB
        if (size > MAX_IMAGE_SIZE) {
          return `${name} (Image) size must be less than 3MB`;
        }
      } else {
        return `${name} must be a valid image (JPEG, PNG, WEBP, GIF, BMP, TIFF, HEIC) or PDF document`;
      }
      return null;
    };

    const aadharError = validateFile(aadhar, "Aadhaar Card");
    if (aadharError) return Response.json({ message: aadharError }, { status: 400 });

    const licenseError = validateFile(drivingLicense, "Driving License");
    if (licenseError) return Response.json({ message: licenseError }, { status: 400 });

    const rcError = validateFile(rc, "Registration Certificate (RC)");
    if (rcError) return Response.json({ message: rcError }, { status: 400 });
    const updatePayload: any = {
      status: "pending",
    };
    if (aadhar) {
      const url = await uploadOnImageKit(aadhar, aadhar.name);
      if (!url) {
        return Response.json(
          { message: "aadhar Upload Failed" },
          { status: 500 },
        );
      }
      updatePayload.aadharUrl = url;
    }
    if (drivingLicense) {
      const url = await uploadOnImageKit(drivingLicense, drivingLicense.name);
      if (!url) {
        return Response.json(
          { message: "drivingLicense Upload Failed" },
          { status: 500 },
        );
      }
      updatePayload.licenseUrl = url;
    }
    if (rc) {
      const url = await uploadOnImageKit(rc, rc.name);
      if (!url) {
        return Response.json({ message: "rc Upload Failed" }, { status: 500 });
      }
      updatePayload.rcUrl = url;
    }

    await PartnerDocs.findOneAndUpdate(
      { owner: session.user.id },
      updatePayload,
      { new: true, upsert: true },
    );
    // Advance to step 2 if they were at 1.
    // If they were past step 2, reset to 2 so downstream steps must be re-completed.
    if (!user.partnerOnboardingSteps || user.partnerOnboardingSteps < 2) {
      user.partnerOnboardingSteps = 2;
    } else if (user.partnerOnboardingSteps > 2) {
      user.partnerOnboardingSteps = 2;
      user.partnerStatus = "pending";
      // Revoke KYC approval if they had one
      if (user.videoKycStatus === "approved") {
        user.videoKycStatus = "not_required";
        user.videoKycRoomId = undefined;
      }
    }

    await user.save();
    return Response.json({ message: "Documents uploaded successfully" });
  } catch (error) {
    console.error("Error uploading partner documents:", error);
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}
