import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import SearchLog from "@/models/searchLog.model";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Fetch searches from the last 24 hours to populate the heatmap
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const searchLogs = await SearchLog.find({
      createdAt: { $gte: oneDayAgo }
    }).select("location").lean();

    return NextResponse.json({
      success: true,
      data: searchLogs
    });

  } catch (error: any) {
    console.error("Heatmap data fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch heatmap data" },
      { status: 500 }
    );
  }
}
