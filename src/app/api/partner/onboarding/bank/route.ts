import { auth } from "@/auth";
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

    const { upi, accountNumber, ifscCode, accountHolderName, bankName, mobileNumber } = await req.json();

    if (!accountHolderName || !ifscCode || !accountNumber || !bankName || !mobileNumber) {
        return Response.json({ message: 'All fields are required' }, { status: 400 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
        return Response.json({ message: 'User not found' }, { status: 400 });
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

    if (user.partnerOnboardingSteps < 3) {
        user.partnerOnboardingSteps = 3;
    }
    await user.save();

    return Response.json({ message: 'Bank details added successfully' }, { status: 200 });
  } catch (error: any) {
    console.error("Error saving bank details:", error);
    if (error.code === 11000) {
        return Response.json({ message: 'Account number already exists' }, { status: 400 });
    }
    return Response.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
