import { auth } from "@/lib/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";

import { withMetrics } from "@/lib/apiMetrics";

export const dynamic = "force-dynamic";

const getHandler = async (req: Request) => {
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

    if (user.isPartnerBlocked) {
      return Response.json(
        { message: "Your account is suspended." },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }
    
    // Automatically initialize location for partners if missing to enable search/booking matching
    if (user.role === "partner" && (!user.location || !user.location.coordinates || user.location.coordinates.length === 0)) {
      user.location = {
        type: "Point",
        coordinates: [74.76157380380525, 33.92588798182483],
      };
      await user.save();
    }
    const userObj: any = user.toObject();
    if (user.role === "partner" && user.activeVehicleId) {
      const activeVehicle = await Vehicle.findById(user.activeVehicleId).lean();
      userObj.activeVehicle = activeVehicle;
    }

    return Response.json(
      { user: userObj },
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
};

export const GET = withMetrics(getHandler);
