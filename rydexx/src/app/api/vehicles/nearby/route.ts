import { NextRequest, NextResponse } from "next/server"
import connectDb from "@/lib/db"
import User from "@/models/user.model"
import Vehicle from "@/models/vehicle.model"

export async function POST(req: NextRequest) {
  try {
    await connectDb()

    const { latitude, longitude, vehicleType } = await req.json()

    if (!latitude || !longitude) {
      return NextResponse.json(
        { message: "Coordinates required" },
        { status: 400 }
      )
    }

    // 1️⃣ Find nearby partners
    const partners = await User.find({
      role: "partner",
      isOnline: true,
      partnerStatus: "approved",
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude]
          },
          $maxDistance: 5000
        }
      }
    }).select("_id")

    const partnerIds = partners.map(v => v._id)

    if (!partnerIds.length) {
      return NextResponse.json({ success: true, vehicles: [] })
    }

    // 2️⃣ Get vehicles of those partners
    const vehicles = await Vehicle.find({
      owner: { $in: partnerIds },
      status: "approved",
      isActive: true,
      ...(vehicleType && { type: vehicleType })
    }).lean()

    return NextResponse.json({
      success: true,
      vehicles
    })

  } catch (error) {
    return NextResponse.json(
      { success: false },
      { status: 500 }
    )
  }
}