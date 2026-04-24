import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import PartnerBank from "@/models/partnerBank.model";
import PartnerDocs from "@/models/partnerDocs.model";
import User from "@/models/user.model";

import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await connectDb();
    const { rejectionReason } = await request.json();
    const session = await auth();
    if (!session || !session.user?.email || session.user?.role !== "admin") {
      return Response.json({ message: "Unauthorized" }, { status: 400 });
    }
    await connectDb();
    const partnerId = (await context.params).id;
    const partner = await User.findById(partnerId);
    if (!partner || partner.role !== "partner") {
      return NextResponse.json(
        { message: "Partner Not Found" },
        { status: 400 },
      );
    }
    if (partner.partnerStatus === "approved") {
      return NextResponse.json(
        { message: "Partner Already Approved" },
        { status: 400 },    
      );
    }
    partner.partnerStatus = "rejected";
    partner.rejectionReason = rejectionReason;
    await partner.save();
    return NextResponse.json(
      { message: "Partner Rejected Successfully" },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Partner rejection error:", error);
    return NextResponse.json(
      { message: "An internal server error occurred during rejection." },
      { status: 500 },
    );
  }
}
