import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import PartnerBank from "@/models/partnerBank.model";
import PartnerDocs from "@/models/partnerDocs.model";
import User from "@/models/user.model";

import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await connectDb();
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
    const partnerDocs = await PartnerDocs.findOne({ owner: partner._id });
    const partnerBank = await PartnerBank.findOne({ owner: partner._id });
    if (!partnerDocs || !partnerBank) {
      return NextResponse.json(
        { message: "Partner Docs or Bank Not Found" },
        { status: 400 },
      );
    }
    partner.partnerStatus = "pending";
    partner.videoKycStatus='pending'
    partner.partnerOnboardingSteps = 4;
    await partner.save();
    partnerDocs?.set({ status: "approved" });
    partnerBank?.set({ status: "verified" });
    await partnerDocs?.save();
    await partnerBank?.save();
    return NextResponse.json(
      { message: "Partner Approved Successfully" },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Partner approval error:", error);
    return NextResponse.json(
      { message: "An internal server error occurred." },
      { status: 500 },
    );
  }
}
