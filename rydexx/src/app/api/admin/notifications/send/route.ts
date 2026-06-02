import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/user.model";
import Notification from "@/models/notification.model";
import { emitToSocketServer } from "@/lib/socketServer";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { target, email, title, message, type = "ADMIN_BROADCAST" } = await req.json();

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    let recipients: any[] = [];

    if (target === "specific") {
      if (!email) {
        return NextResponse.json({ error: "Email is required for specific target" }, { status: 400 });
      }
      const user = await User.findOne({ email });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      recipients = [user];
    } else if (target === "partners") {
      recipients = await User.find({ role: "partner" });
    } else if (target === "users") {
      recipients = await User.find({ role: "user" });
    } else {
      // all
      recipients = await User.find({ role: { $in: ["user", "partner"] } });
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: "No recipients found" }, { status: 404 });
    }

    const notifications = recipients.map((r) => ({
      recipientId: r._id,
      senderId: session.user.id,
      title,
      message,
      type,
      isRead: false,
    }));

    await Notification.insertMany(notifications);

    // Emit socket event to each recipient asynchronously
    recipients.forEach((r) => {
      emitToSocketServer({
        userId: r._id.toString(),
        event: "new-notification",
        data: {
          title,
          message,
          type,
          createdAt: new Date().toISOString(),
        },
      }).catch((e) => console.error("Failed to emit notification socket:", e));
    });

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${recipients.length} user(s)`,
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
