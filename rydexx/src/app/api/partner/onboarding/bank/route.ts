import { auth } from "@/lib/auth";
import { notifyAdminDashboard } from "@/lib/adminEvents";
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

    const body = await req.json();
    const upi = typeof body.upi === "string" ? body.upi.trim() : "";
    const accountNumber = typeof body.accountNumber === "string" ? body.accountNumber.trim() : "";
    const ifscCode = typeof body.ifscCode === "string" ? body.ifscCode.trim().toUpperCase() : "";
    const accountHolderName = typeof body.accountHolderName === "string" ? body.accountHolderName.trim() : "";
    const bankName = typeof body.bankName === "string" ? body.bankName.trim() : "";
    const mobileNumber = typeof body.mobileNumber === "string" ? body.mobileNumber.trim() : "";

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

    // Input Validation Regexes
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifscCode)) {
      return Response.json({ message: "Invalid IFSC code format" }, { status: 400 });
    }

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobileNumber)) {
      return Response.json({ message: "Invalid Indian mobile number (must be 10 digits)" }, { status: 400 });
    }

    const accountRegex = /^\d{9,18}$/;
    if (!accountRegex.test(accountNumber)) {
      return Response.json({ message: "Invalid bank account number (must be 9 to 18 digits)" }, { status: 400 });
    }

    if (upi) {
      const upiRegex = /^[\w.-]+@[\w.-]+$/;
      if (!upiRegex.test(upi)) {
        return Response.json({ message: "Invalid UPI ID format" }, { status: 400 });
      }
    }

    // HTML/Script Escaping for Text Inputs (Prevent XSS/Injection)
    const sanitizeString = (str: string) => {
      return str.replace(/[&<>"']/g, (m) => {
        switch (m) {
          case "&": return "&amp;";
          case "<": return "&lt;";
          case ">": return "&gt;";
          case "\"": return "&quot;";
          case "'": return "&#039;";
          default: return m;
        }
      });
    };

    const sanitizedHolderName = sanitizeString(accountHolderName);
    const sanitizedBankName = sanitizeString(bankName);

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
    partnerBank.bankName = sanitizedBankName;
    partnerBank.accountHolderName = sanitizedHolderName;
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

    if (user.partnerOnboardingSteps === 3) {
      await notifyAdminDashboard({
        scope: "dashboard",
        reason: "partner-review-submitted",
      });
    }

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
