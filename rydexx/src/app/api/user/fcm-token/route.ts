import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import { auth } from "@/lib/auth";

// Add an FCM token to the user's active session and fcmTokens array
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

    const sessionId = (session.user as any).sessionId;
    if (!sessionId) {
      return NextResponse.json({ message: "No active session ID found" }, { status: 400 });
    }

    // 1. Clear this fcmToken from all other sessions of all users
    await User.updateMany(
      { "activeSessions.fcmToken": token },
      { $set: { "activeSessions.$[elem].fcmToken": null } },
      { arrayFilters: [{ "elem.fcmToken": token }] }
    );

    // 2. Set the token on the current active session
    await User.updateOne(
      { _id: session.user.id, "activeSessions.sessionId": sessionId },
      { $set: { "activeSessions.$.fcmToken": token } }
    );

    // 3. Sync legacy fcmTokens array: pull from all other users first, then add to current
    await User.updateMany(
      { _id: { $ne: session.user.id } },
      { $pull: { fcmTokens: token } }
    );

    await User.updateOne(
      { _id: session.user.id },
      { $addToSet: { fcmTokens: token } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving FCM token:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// Remove an FCM token from the user's active session and fcmTokens array
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

    const sessionId = (session.user as any).sessionId;

    // 1. Remove fcmToken from the current session
    if (sessionId) {
      await User.updateOne(
        { _id: session.user.id, "activeSessions.sessionId": sessionId },
        { $set: { "activeSessions.$.fcmToken": null } }
      );
    }

    // 2. Also remove from legacy fcmTokens array
    await User.updateOne(
      { _id: session.user.id },
      { $pull: { fcmTokens: token } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing FCM token:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
