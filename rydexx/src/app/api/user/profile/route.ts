import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";
import { withMetrics } from "@/lib/apiMetrics";

export const dynamic = "force-dynamic";

const putHandler = async (req: NextRequest) => {
  try {
    await connectDb();
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const updateFields: any = {};

    if (body.image !== undefined) {
      updateFields.image = body.image;
    }
    
    if (body.mobileNumber !== undefined) {
      updateFields.mobileNumber = body.mobileNumber;
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ message: "No valid fields provided for update" }, { status: 400 });
    }

    const updatedUser = await User.findOneAndUpdate(
      { email: session.user.email },
      { $set: updateFields },
      { new: true }
    ).select("-password -otp -otpExpiryAt");

    if (!updatedUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: updatedUser, message: "Profile updated successfully" }, { status: 200 });

  } catch (error: any) {
    console.error("Profile update error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
};

export const PUT = withMetrics(putHandler);
