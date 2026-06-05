import { auth } from "@/lib/auth";
import uploadOnImageKit from "@/lib/imagekit";
import connectDb from "@/lib/db";
import Vehicle from "@/models/vehicle.model";
import VehicleDoc from "@/models/vehicleDoc.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDb();
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const vehicleId = (await context.params).id;
    const vehicle = await Vehicle.findById(vehicleId);

    if (!vehicle || !vehicle.isActive) {
      return NextResponse.json({ message: "Vehicle not found" }, { status: 404 });
    }

    if (String(vehicle.owner) !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const formdata = await req.formData();
    const documentType = formdata.get("documentType")?.toString();
    const expiryDateStr = formdata.get("expiryDate")?.toString();
    const file = formdata.get("file") as File | null;

    if (!documentType || !file) {
      return NextResponse.json({ message: "documentType and file are required" }, { status: 400 });
    }

    const allowedTypes = ["rc", "insurance", "pollution", "permit", "fitness"];
    if (!allowedTypes.includes(documentType)) {
      return NextResponse.json({ message: "Invalid document type" }, { status: 400 });
    }

    // Validate size and format
    const isPdf = file.type === "application/pdf";
    const maxSize = isPdf ? 10 * 1024 * 1024 : 3 * 1024 * 1024; // 10MB PDF, 3MB image
    if (file.size > maxSize) {
      return NextResponse.json({ message: `File size exceeds limit (${isPdf ? "10MB" : "3MB"})` }, { status: 400 });
    }

    // Upload to ImageKit
    const fileUrl = await uploadOnImageKit(file, file.name);
    if (!fileUrl) {
      return NextResponse.json({ message: "File upload failed" }, { status: 500 });
    }

    const expiryDate = expiryDateStr ? new Date(expiryDateStr) : undefined;

    // Create or update document
    const doc = await VehicleDoc.findOneAndUpdate(
      { vehicleId: vehicle._id, documentType },
      {
        fileUrl,
        expiryDate,
        verificationStatus: "pending",
        uploadedAt: new Date(),
      },
      { new: true, upsert: true }
    );

    // If vehicle was rejected or suspended, reset its status to pending review
    if (["rejected", "suspended"].includes(vehicle.status)) {
      vehicle.status = "pending";
      await vehicle.save();
    }

    return NextResponse.json({
      message: "Document uploaded successfully",
      document: doc,
    });
  } catch (error: any) {
    console.error("Vehicle document upload error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
