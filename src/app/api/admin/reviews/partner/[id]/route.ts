import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import PartnerBank from "@/models/partnerBank.model";
import PartnerDocs from "@/models/partnerDocs.model";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
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
    const vehicle = await Vehicle.findOne({ owner: partnerId });
    const documents = await PartnerDocs.findOne({ owner: partnerId });
    const bank = await PartnerBank.findOne({ owner: partnerId });
    return NextResponse.json(
      {
        vehicle: vehicle || null,
        documents: documents || null,
        bank: bank || null,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: `Partner server error${error} ` },
      { status: 500 },
    );
  }
}
