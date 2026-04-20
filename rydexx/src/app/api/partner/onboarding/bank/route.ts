import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import PartnerBank from "@/models/partnerBank.model";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const session = await auth();
    if (!session || !session.user?.email) {
      return Response.json({ message: "User unauthorized" }, { status: 400 });
    }

    const {
      upi,
      accountNumber,
      ifscCode,
      accountHolderName,
      bankName,
      mobileNumber,
    } = await req.json();

    if (
      !accountHolderName ||
      !ifscCode ||
      !accountNumber ||
      !bankName ||
      !mobileNumber
    ) {
      return Response.json(
        { message: "All fields are required" },
        { status: 400 },
      );
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return Response.json({ message: "User not found" }, { status: 400 });
    }

    user.mobileNumber = mobileNumber;

    let partnerBank = await PartnerBank.findOne({ owner: user._id });

    if (!partnerBank) {
      partnerBank = new PartnerBank({
        owner: user._id,
      });
    }

    partnerBank.accountNumber = accountNumber;
    partnerBank.ifscCode = ifscCode;
    partnerBank.bankName = bankName;
    partnerBank.accountHolderName = accountHolderName;
    if (upi) {
      partnerBank.upi = upi;
    }
    partnerBank.status = "added";

    await partnerBank.save();

    // Advance to step 3 if they were at 2.
    // If they were past step 3, reset to 3 so review, KYC, and pricing all require re-completion
    if (!user.partnerOnboardingSteps || user.partnerOnboardingSteps < 3) {
      user.partnerOnboardingSteps = 3;
    } else if (user.partnerOnboardingSteps > 3) {
      user.partnerOnboardingSteps = 3;
      user.partnerStatus = "pending";
      // Revoke KYC approval if they had one
      if (user.videoKycStatus === "approved") {
        user.videoKycStatus = "not_required";
        user.videoKycRoomId = undefined;
      }
    }

    await user.save();

    return Response.json(
      { message: "Bank details added successfully" },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error saving bank details:", error);
    if (error.code === 11000) {
      return Response.json(
        { message: "Account number already exists" },
        { status: 400 },
      );
    }
    return Response.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const session = await auth();
    if (!session || !session.user?.email) {
      return Response.json({ message: "User unauthorized" }, { status: 400 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return Response.json({ message: "User not found" }, { status: 400 });
    }

    const partnerBank = await PartnerBank.findOne({ owner: user._id });

    if (!partnerBank) {
      return Response.json({ message: "Bank details not found" }, { status: 404 });
    }

    return Response.json({
      bank: {
        ...partnerBank.toObject(),
        mobileNumber: user.mobileNumber,
      },
    });
  } catch (error) {
    console.error("Error fetching bank details:", error);
    return Response.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
