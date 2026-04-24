import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await connectDb();
    const session = await auth();
    if (!session || !session.user) {
      return Response.json(
        { message: "User is not logged in" },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }
    const user = await User.findOne({ email: session.user.email }).select("-password -otp -otpExpiryAt");
    if (!user) {
      return Response.json(
        { message: "User not found" },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }
    return Response.json(
      { user },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    return Response.json(
      { message: "Internal server error" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }
}
