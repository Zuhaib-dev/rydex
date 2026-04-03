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
    const docs = await PartnerDocs.findOne({ owner: partnerId });
    const bank = await PartnerBank.findOne({ owner: partnerId });

    return NextResponse.json(
      {
        partner: {
          name: partner.name,
          email: partner.email,
          status: partner.partnerStatus,
          videoKycStatus: partner.videoKycStatus,
          videoKycRoomId: partner.videoKycRoomId,
          videoKycRejectionReason: partner.videoKycRejectionReason,
        },
        vehicle: vehicle || null,
        documents: docs || null,
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

export async function PUT(
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
    const { status, reason } = await request.json();

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }

    // Update User
    await User.findByIdAndUpdate(partnerId, { partnerStatus: status });

    // Update Vehicle
    await Vehicle.findOneAndUpdate(
      { owner: partnerId },
      { status, rejectionReason: reason || "" },
    );

    // Update Documents
    await PartnerDocs.findOneAndUpdate(
      { owner: partnerId },
      { status, rejectionReason: reason || "" },
    );

    // Update Bank
    if (status === "approved") {
      await PartnerBank.findOneAndUpdate(
        { owner: partnerId },
        { status: "verified" },
      );
    } else {
      await PartnerBank.findOneAndUpdate(
        { owner: partnerId },
        { status: "added" },
      );
    }

    return NextResponse.json(
      { message: `Partner ${status} successfully` },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: `Update error: ${error}` },
      { status: 500 },
    );
  }
}
