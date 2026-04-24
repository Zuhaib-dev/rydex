import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        await connectDb()
        const session = await auth()
        if (!session || !session.user) {
            return NextResponse.json(
                { message: "user is not authenticated" },
                { status: 400 }
            )
        }

        const user = await User.findOne({ email: session.user.email }).select("-password -otp -otpExpiryAt")
        if (!user) {
            return NextResponse.json(
                { message: "user not found" },
                { status: 400 }
            )
        }
        return NextResponse.json(
            user,
            { status: 200 }
        )

    } catch (error: any) {
        console.error("GET /api/me error:", error);
        return NextResponse.json(
            { message: "An internal server error occurred while fetching user data." },
            { status: 500 }
        )
    }
}