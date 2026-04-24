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
      return Response.json({ message: "Unauthorized" }, { status: 400 });
    }
    const partnerId = (await context.params).id;
    const partner = await User.findById(partnerId);
    if (!partner || partner.role !== "partner") {
      return NextResponse.json(
        { message: "Partner Not Found" },
        { status: 400 },
      );
    }
    const roomId = `kyc-${partner._id}-${Date.now()}`;
    partner.videoKycRoomId = roomId;
    partner.videoKycStatus = "in_progress";
    await partner.save();
    return NextResponse.json({ roomId });
  } catch (error: any) {
    console.error("Partner Video Kyc server error:", error);
    return NextResponse.json(
      { message: "An internal server error occurred." },
      { status: 500 },
    );
  }
}
 