import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import { auth } from "@/lib/auth";

// Add an FCM token to the user's fcmTokens array
export async function POST(req: Request) {
  try {
    await connectDb();
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return NextResponse.json({ message: "Invalid token" }, { status: 400 });
    }

    await User.findByIdAndUpdate(
      session.user.id,
      { $addToSet: { fcmTokens: token } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving FCM token:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// Remove an FCM token from the user's fcmTokens array
export async function DELETE(req: Request) {
  try {
    await connectDb();
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return NextResponse.json({ message: "Invalid token" }, { status: 400 });
    }

    await User.findByIdAndUpdate(
      session.user.id,
      { $pull: { fcmTokens: token } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing FCM token:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
