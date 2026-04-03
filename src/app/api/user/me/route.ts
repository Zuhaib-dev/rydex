import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";

export async function GET(req: Request) {
  try {
    await connectDb();
    const session = await auth();
    if (!session || !session.user) {
      return Response.json(
        { message: "User is not logged in" },
        { status: 400 },
      );
    }
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return Response.json({ message: "User not found" }, { status: 404 });
    }
    return Response.json({ user }, { status: 200 });
  } catch (error) {
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}
