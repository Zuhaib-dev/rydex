import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const session = await auth();
    if (!session || !session.user?.email || session.user?.role !== "partner") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const partner = await User.findOne({ email: session.user.email });
    if (!partner) {
      return NextResponse.json({ message: "Partner not found" }, { status: 404 });
    }

    if (partner.videoKycStatus !== "rejected") {
      return NextResponse.json(
        { message: "You can only request retry if your KYC is rejected." },
        { status: 400 }
      );
    }

    partner.videoKycStatus = "pending";
    partner.videoKycRoomId = undefined;
    partner.videoKycRejectionReason = undefined;
    await partner.save();

    return NextResponse.json(
      { message: "Retry requested successfully." },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: `Server error: ${error}` },
      { status: 500 }
    );
  }
}
