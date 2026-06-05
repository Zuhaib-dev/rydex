import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import Coupon from "@/models/coupon.model";
import { NextRequest, NextResponse } from "next/server";

// GET - List all coupons (admin only)
export async function GET(request: NextRequest) {
  try {
    await connectDb();
    const session = await auth();
    if (!session || !session.user?.email || session.user?.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const search = searchParams.get("search") || "";
    const skip = (page - 1) * limit;

    const query: any = {};
    if (search) {
      query.code = { $regex: search, $options: "i" };
    }

    const total = await Coupon.countDocuments(query);
    const coupons = await Coupon.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      coupons,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Fetch coupons error:", error);
    return NextResponse.json(
      { message: "An internal server error occurred." },
      { status: 500 }
    );
  }
}

// POST - Create new coupon (admin only)
export async function POST(request: NextRequest) {
  try {
    await connectDb();
    const session = await auth();
    if (!session || !session.user?.email || session.user?.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      code,
      discountType,
      discountValue,
      maxDiscount,
      minBookingAmount,
      expiryDate,
      usageLimit,
      isActive,
    } = body;

    if (!code || !discountType || discountValue === undefined || !expiryDate) {
      return NextResponse.json(
        { message: "Missing required coupon fields (code, discountType, discountValue, expiryDate)" },
        { status: 400 }
      );
    }

    const normalizedCode = code.trim().toUpperCase();

    // Check if coupon code already exists
    const existing = await Coupon.findOne({ code: normalizedCode });
    if (existing) {
      return NextResponse.json(
        { message: "A coupon with this code already exists." },
        { status: 400 }
      );
    }

    const coupon = await Coupon.create({
      code: normalizedCode,
      discountType,
      discountValue,
      maxDiscount: maxDiscount || undefined,
      minBookingAmount: minBookingAmount || 0,
      expiryDate: new Date(expiryDate),
      usageLimit: usageLimit || undefined,
      isActive: isActive !== undefined ? isActive : true,
    });

    return NextResponse.json({ success: true, coupon });
  } catch (error: any) {
    console.error("Create coupon error:", error);
    return NextResponse.json(
      { message: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
