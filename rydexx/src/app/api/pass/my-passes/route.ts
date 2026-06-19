import connectDb from "@/lib/db";
import Pass from "@/models/pass.model";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await connectDb();
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const passes = await Pass.find({ userId: session.user.id, isActive: true });
    return NextResponse.json({ success: true, passes });
  } catch (error: any) {
    console.error("Error fetching passes:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
