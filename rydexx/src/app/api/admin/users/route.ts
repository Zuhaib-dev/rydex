import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

/** Escape special regex characters to prevent ReDoS (SEC-010) */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: NextRequest) {
  try {
    await connectDb();
    const session = await auth();
    if (!session || !session.user?.email || session.user?.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const status = searchParams.get("status") || ""; // 'blocked' or 'active'
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 100); // cap at 100
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (search) {
      // SEC-010 FIX: Escape user input before building a regex to prevent ReDoS
      const safeSearch = escapeRegex(search.slice(0, 100)); // also cap length
      query.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { email: { $regex: safeSearch, $options: "i" } },
        { mobileNumber: { $regex: safeSearch, $options: "i" } },
      ];
    }

    if (role) {
      query.role = role;
    }

    if (status === "blocked") {
      query.isPartnerBlocked = true;
    } else if (status === "active") {
      query.isPartnerBlocked = { $ne: true };
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      // SEC-012 FIX: Also exclude socketId — it can be used to target users via /emit
      .select("-password -otp -otpExpiryAt -otpAttempts -socketId")
      .lean();

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Fetch users error:", error);
    return NextResponse.json(
      { message: "An internal server error occurred." },
      { status: 500 }
    );
  }
}

