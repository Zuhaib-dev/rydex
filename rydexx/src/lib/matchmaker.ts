import connectDb from "./db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { emitToSocketServer } from "./socketServer";
import { emitBookingUpdated } from "./bookingEvents";
import mongoose from "mongoose";

export async function cascadeBooking(bookingId: string, currentDriverId: string) {
  await connectDb();

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    console.error(`Booking not found: ${bookingId}`);
    return { success: false, message: "Booking not found" };
  }

  // Double check if the booking status is still requested and driver matches
  if (booking.status !== "requested" || String(booking.driver) !== String(currentDriverId)) {
    return { success: false, message: "Booking is already processed or driver changed" };
  }

  const oldDriverId = booking.driver;

  // Add current driver to attempted list if not already there
  const attempted = booking.attemptedDrivers.map((id: any) => String(id));
  if (!attempted.includes(String(currentDriverId))) {
    booking.attemptedDrivers.push(new mongoose.Types.ObjectId(currentDriverId));
  }

  // Find all online approved partners nearby, excluding already attempted drivers
  const partners = await User.find({
    role: "partner",
    isOnline: true,
    partnerStatus: "approved",
    isPartnerBlocked: { $ne: true },
    _id: { $nin: booking.attemptedDrivers },
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: booking.pickupLocation.coordinates, // [lng, lat]
        },
        $maxDistance: 5000, // 5km radius limit
      },
    },
  }).select("_id mobileNumber").lean();

  const partnerIds = partners.map(p => p._id);

  // Find approved active vehicles of requested type for these partners
  const vehicles = await Vehicle.find({
    owner: { $in: partnerIds },
    status: "approved",
    isActive: true,
    type: booking.vehicleType,
  }).lean();

  // Find the next closest driver/vehicle pair
  let nextDriver = null;
  let nextVehicle = null;

  for (const partner of partners) {
    const v = vehicles.find(v => String(v.owner) === String(partner._id));
    if (v) {
      nextDriver = partner;
      nextVehicle = v;
      break;
    }
  }

  if (nextDriver && nextVehicle) {
    console.log(`Cascading booking ${bookingId} to next driver: ${nextDriver._id}`);
    
    // Update booking with new matched driver and vehicle
    booking.driver = nextDriver._id as any;
    booking.vehicle = nextVehicle._id as any;
    booking.driverMobileNumber = nextDriver.mobileNumber;
    booking.driverAssignedAt = new Date();
    booking.attemptedDrivers.push(nextDriver._id as any);
    booking.status = "requested";
    await booking.save();

    // Notify new driver
    await emitToSocketServer({
      userId: String(nextDriver._id),
      event: "new-booking",
      data: booking,
    });

    // Notify user that matching is continuing (but with new driver details if they track it)
    await emitBookingUpdated(booking, {
      bookingId: booking._id,
      status: "requested",
      driver: nextDriver._id,
      driverMobileNumber: nextDriver.mobileNumber,
    });

    // Clean up old driver's screen
    await emitToSocketServer({
      userId: String(oldDriverId),
      event: "booking-updated",
      data: {
        bookingId: booking._id,
        status: "expired",
      },
    });

    return { success: true, cascaded: true, nextDriverId: nextDriver._id };
  } else {
    console.log(`No more drivers available for booking ${bookingId}. Setting status to rejected.`);
    
    // Fail the booking as no drivers are available
    booking.status = "rejected";
    await booking.save();

    // Notify user of matching failure
    await emitBookingUpdated(booking, {
      bookingId: booking._id,
      status: "rejected",
    });

    // Clean up old driver's screen
    await emitToSocketServer({
      userId: String(oldDriverId),
      event: "booking-updated",
      data: {
        bookingId: booking._id,
        status: "expired",
      },
    });

    return { success: true, cascaded: false, message: "No drivers available" };
  }
}
