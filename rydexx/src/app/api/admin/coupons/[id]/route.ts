import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import Coupon from "@/models/coupon.model";
import { NextRequest, NextResponse } from "next/server";

// PATCH - Update coupon details (e.g. toggle isActive)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDb();
    const session = await auth();
    if (!session || !session.user?.email || session.user?.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const couponId = (await context.params).id;
    const body = await request.json();
    
    // We allow updating: isActive, discountValue, maxDiscount, minBookingAmount, expiryDate, usageLimit
    const updateData: any = {};
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.discountValue !== undefined) updateData.discountValue = body.discountValue;
    if (body.maxDiscount !== undefined) updateData.maxDiscount = body.maxDiscount;
    if (body.minBookingAmount !== undefined) updateData.minBookingAmount = body.minBookingAmount;
    if (body.expiryDate !== undefined) updateData.expiryDate = new Date(body.expiryDate);
    if (body.usageLimit !== undefined) updateData.usageLimit = body.usageLimit;

    const coupon = await Coupon.findByIdAndUpdate(
      couponId,
      { $set: updateData },
      { new: true }
    );

    if (!coupon) {
      return NextResponse.json({ message: "Coupon not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, coupon });
  } catch (error: any) {
    console.error("Update coupon error:", error);
    return NextResponse.json(
      { message: "An internal server error occurred." },
      { status: 500 }
    );
  }
}

// DELETE - Delete a coupon
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDb();
    const session = await auth();
    if (!session || !session.user?.email || session.user?.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const couponId = (await context.params).id;

    const coupon = await Coupon.findByIdAndDelete(couponId);

    if (!coupon) {
      return NextResponse.json({ message: "Coupon not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Coupon deleted successfully" });
  } catch (error: any) {
    console.error("Delete coupon error:", error);
    return NextResponse.json(
      { message: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
