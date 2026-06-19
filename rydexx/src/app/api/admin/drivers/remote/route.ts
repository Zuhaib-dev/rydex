import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import User from "@/models/user.model";
import { getRedisClient } from "@/lib/redis";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await User.findOne({ email: session.user.email });
    if (adminUser?.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { driverId, action } = await req.json();

    if (!driverId || !action || !["ping", "logout"].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid action payload" }, { status: 400 });
    }

    // Use Redis Pub/Sub to securely relay the command to the socket server
    // The socket server's handleEmitPayload listens to "socket:emit" and routes the event directly to the driver's private room.
    const payload = {
      userId: driverId,
      event: "admin-action",
      data: { action }
    };

    const redis = getRedisClient();
    await redis.publish("socket:emit", JSON.stringify(payload));

    return NextResponse.json({ success: true, message: `Command '${action}' dispatched securely to driver ${driverId}` });
  } catch (error: any) {
    console.error("Remote action error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}
