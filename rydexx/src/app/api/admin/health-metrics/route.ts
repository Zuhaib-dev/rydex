import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import axios from "axios";

export async function GET(request: NextRequest) {
  try {
    await connectDb();
    const session = await auth();
    if (!session || !session.user?.email || session.user?.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Process Memory
    const memUsage = process.memoryUsage();
    const memory = {
      rss: Math.round(memUsage.rss / 1024 / 1024), // Resident Set Size in MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
    };

    // Process Uptime
    const uptime = Math.round(process.uptime());

    // Mongoose Status
    const dbStatus = mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";

    // Socket server active client count
    let socketClientsCount = 0;
    let socketServerStatus = "Offline";
    try {
      const socketUrl =
        process.env.SOCKET_SERVER_URL ||
        process.env.NEXT_PUBLIC_SOCKET_SERVER ||
        "https://rydex-nurn.onrender.com";
      const res = await axios.get(`${socketUrl.replace(/\/+$/, "")}/health`, { timeout: 1500 });
      if (res.data && res.data.success) {
        socketServerStatus = "Online";
        socketClientsCount = res.data.clientsCount || 0;
      }
    } catch (err) {
      console.warn("Failed to contact socket server for health metrics:", err instanceof Error ? err.message : err);
    }

    return NextResponse.json({
      dbStatus,
      socketServerStatus,
      socketClientsCount,
      memory,
      uptime,
      nodeVersion: process.version,
      platform: process.platform,
    });
  } catch (error: any) {
    console.error("Fetch health metrics error:", error);
    return NextResponse.json(
      { message: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
