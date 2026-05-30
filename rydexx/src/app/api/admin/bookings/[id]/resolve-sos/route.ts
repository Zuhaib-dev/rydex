import { notifyAdminDashboard } from "@/lib/adminEvents";
import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import { logAdminAction } from "@/lib/auditLogger";
import Booking from "@/models/booking.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDb();
    const session = await auth();
    if (!session || !session.user?.email || session.user?.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const bookingId = (await context.params).id;
    const booking = await Booking.findById(bookingId).populate("user", "name").populate("driver", "name");
    
    if (!booking) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    }

    if (!booking.sosTriggered) {
      return NextResponse.json({ message: "SOS not active for this booking" }, { status: 400 });
    }

    booking.sosTriggered = false;
    await booking.save();

    // Log the admin action
    await logAdminAction({
      adminEmail: session.user.email,
      action: "resolve_sos",
      targetId: booking._id,
      targetModel: "Booking",
      targetName: `Booking #${String(booking._id).substring(booking._id.toString().length - 6).toUpperCase()}`,
      details: `Resolved SOS panic alert. Driver: ${booking.driver?.name || "N/A"}, Rider: ${booking.user?.name || "N/A"}`
    });

    // Notify other dispatch panels to clear alert
    await notifyAdminDashboard({ scope: "all", reason: "sos-resolved" });

    return NextResponse.json({
      message: "SOS alert resolved successfully",
      booking,
    });
  } catch (error: any) {
    console.error("Resolve SOS error:", error);
    return NextResponse.json(
      { message: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
