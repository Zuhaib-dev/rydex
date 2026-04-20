import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const session = await auth();
    if (!session || !session.user?.email || session.user?.role !== "admin") {
      return Response.json({ message: "Unauthorized" }, { status: 400 });
    }
    const partner = await User.find({
      role: "partner",
      videoKycStatus: { $in: ["pending", "in_progress"] }
    });
    return NextResponse.json({ partner }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Video Kyc server error" },
      { status: 500 },
    );
  }
}
