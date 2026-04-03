import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await connectDb();
    const session = await auth();
    if (!session || !session.user?.email || session.user?.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const partnerId = (await context.params).id;
    const body = await request.json();
    const { action, reason } = body as {
      action: "approved" | "rejected";
      reason?: string;
    };

    if (!["approved", "rejected"].includes(action)) {
      return NextResponse.json(
        { message: "Invalid action. Must be 'approved' or 'rejected'." },
        { status: 400 },
      );
    }

    const partner = await User.findById(partnerId);
    if (!partner || partner.role !== "partner") {
      return NextResponse.json(
        { message: "Partner not found" },
        { status: 404 },
      );
    }

    partner.videoKycStatus = action;
    partner.videoKycRoomId = undefined;
    if (action === "rejected" && reason) {
      partner.videoKycRejectionReason = reason;
    }
    await partner.save();

    return NextResponse.json({
      message: `Video KYC ${action} successfully`,
    });
  } catch (error) {
    return NextResponse.json(
      { message: `Server error: ${error}` },
      { status: 500 },
    );
  }
}
