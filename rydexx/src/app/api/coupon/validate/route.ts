import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import Coupon from "@/models/coupon.model";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code")?.trim().toUpperCase();
    const fareStr = searchParams.get("fare");
    const fare = fareStr ? parseFloat(fareStr) : 0;

    if (!code) {
      return NextResponse.json({ message: "Coupon code is required" }, { status: 400 });
    }

    await connectDb();

    const coupon = await Coupon.findOne({ code });

    if (!coupon) {
      return NextResponse.json({ message: "Invalid coupon code" }, { status: 400 });
    }

    if (!coupon.isActive) {
      return NextResponse.json({ message: "This coupon is no longer active" }, { status: 400 });
    }

    if (new Date(coupon.expiryDate) < new Date()) {
      return NextResponse.json({ message: "This coupon has expired" }, { status: 400 });
    }

    if (coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json({ message: "This coupon has reached its usage limit" }, { status: 400 });
    }

    const userIdStr = session.user.id;
    const hasUsed = coupon.usedByUsers.some(
      (id: any) => id.toString() === userIdStr
    );
    if (hasUsed) {
      return NextResponse.json({ message: "You have already used this coupon" }, { status: 400 });
    }

    if (fare && coupon.minBookingAmount && fare < coupon.minBookingAmount) {
      return NextResponse.json(
        { message: `Minimum booking fare of ₹${coupon.minBookingAmount} required for this coupon` },
        { status: 400 }
      );
    }

    // Calculate discount amount
    let discount = 0;
    if (coupon.discountType === "flat") {
      discount = coupon.discountValue;
    } else if (coupon.discountType === "percentage") {
      discount = (fare * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    }

    // Ensure discount doesn't exceed the fare itself
    if (fare && discount > fare) {
      discount = fare;
    }

    return NextResponse.json({
      success: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount: Math.round(discount * 100) / 100,
      minBookingAmount: coupon.minBookingAmount,
    });
  } catch (error: any) {
    console.error("GET /api/coupon/validate error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
