import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import { getToken } from "next-auth/jwt";

export async function GET(req: Request) {
  try {
    await connectDb();
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findById(session.user.id).select("activeSessions").lean();
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const token = await getToken({
      req: req as any,
      secret: process.env.AUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production",
    });

    const activeSessions = user.activeSessions || [];
    
    // Sort so current session is first, then by most recently active
    const sortedSessions = activeSessions.sort((a: any, b: any) => {
      if (a.sessionId === token?.sessionId) return -1;
      if (b.sessionId === token?.sessionId) return 1;
      return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
    });

    // Mark current session
    const sessionsWithCurrent = sortedSessions.map((s: any) => ({
      ...s,
      isCurrent: s.sessionId === token?.sessionId
    }));

    return NextResponse.json({ sessions: sessionsWithCurrent }, { status: 200 });
  } catch (error) {
    console.error("Fetch sessions error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await connectDb();
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ message: "Session ID required" }, { status: 400 });
    }

    const token = await getToken({
      req: req as any,
      secret: process.env.AUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production",
    });

    if (sessionId === token?.sessionId) {
      return NextResponse.json({ message: "Cannot revoke current session" }, { status: 400 });
    }

    // Find the session to check if it has an FCM token
    const userObj = await User.findOne(
      { _id: session.user.id, "activeSessions.sessionId": sessionId },
      { "activeSessions.$": 1 }
    ).lean();

    const fcmTokenToRemove = userObj?.activeSessions?.[0]?.fcmToken;

    const updateObj: any = {
      $pull: {
        activeSessions: { sessionId }
      }
    };

    if (fcmTokenToRemove) {
      updateObj.$pull.fcmTokens = fcmTokenToRemove;
    }

    await User.updateOne(
      { _id: session.user.id },
      updateObj
    );

    return NextResponse.json({ success: true, message: "Session revoked successfully" }, { status: 200 });
  } catch (error) {
    console.error("Revoke session error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
