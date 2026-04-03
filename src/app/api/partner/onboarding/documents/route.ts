import { auth } from "@/lib/auth";
import uploadOnCloudnary from "@/lib/cloudinary";
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
    const aadhar = (formdata.get("aadhar") as Blob) || null;
    const drivingLicense = (formdata.get("drivingLicense") as Blob) || null;
    const rc = (formdata.get("rc") as Blob) || null;
    if (!aadhar || !drivingLicense || !rc) {
      return Response.json(
        { message: "All documents are required" },
        { status: 400 },
      );
    }
    const updatePayload: any = {
      status: "pending",
    };
    if (aadhar) {
      const url = await uploadOnCloudnary(aadhar);
      if (!url) {
        return Response.json(
          { message: "aadhar Upload Failed" },
          { status: 500 },
        );
      }
      updatePayload.aadharUrl = url;
    }
    if (drivingLicense) {
      const url = await uploadOnCloudnary(drivingLicense);
      if (!url) {
        return Response.json(
          { message: "drivingLicense Upload Failed" },
          { status: 500 },
        );
      }
      updatePayload.licenseUrl = url;
    }
    if (rc) {
      const url = await uploadOnCloudnary(rc);
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
    // If partner has already progressed past step 2 (documents), reset back to step 2
    // so bank, review, KYC, and pricing all require re-completion
    if (user.partnerOnboardingSteps >= 2) {
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
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}
